import 'dotenv/config';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { pool, initializeSchema } from './db.js';

// Order matters: parents before children so foreign keys resolve.
const MIGRATION_ORDER = [
  {
    table: 'purchases',
    columns: ['id', 'purchase_date', 'supplier', 'species', 'breed', 'quantity', 'unit_cost', 'transport_cost', 'notes', 'created_at'],
  },
  {
    table: 'rooms',
    columns: ['id', 'name', 'capacity', 'description', 'created_at'],
  },
  {
    table: 'users',
    columns: ['id', 'username', 'display_name', 'password_hash', 'role', 'is_active', 'created_at', 'updated_at'],
  },
  {
    table: 'sales',
    columns: ['id', 'sale_date', 'customer', 'purchase_id', 'quantity', 'unit_price', 'notes', 'created_at'],
  },
  {
    table: 'weights',
    columns: ['id', 'weight_date', 'purchase_id', 'animal_tag', 'measurement_type', 'weight_kg', 'notes', 'created_at'],
  },
  {
    table: 'treatments',
    columns: ['id', 'treatment_date', 'purchase_id', 'animal_tag', 'treatment_description', 'medicine', 'dosage', 'veterinarian', 'treatment_cost', 'follow_up_date', 'notes', 'created_at'],
  },
  {
    table: 'feeds',
    columns: ['id', 'feed_date', 'feed_time', 'purchase_id', 'slot', 'basket_count', 'feed_description', 'notes', 'created_at'],
  },
  {
    table: 'room_assignments',
    columns: ['id', 'room_id', 'purchase_id', 'animal_tag', 'assigned_at', 'updated_at', 'notes'],
  },
  {
    table: 'expenditures',
    columns: ['id', 'expenditure_date', 'purpose', 'paid_to', 'amount', 'remarks', 'created_at'],
  },
];

function sqlitePath() {
  const fromEnv = process.env.SQLITE_PATH;
  if (fromEnv) return fromEnv;
  return fileURLToPath(new URL('../data/livestock.db', import.meta.url));
}

async function main() {
  const force = process.argv.includes('--force');
  const dbPath = sqlitePath();

  if (!existsSync(dbPath)) {
    throw new Error(`SQLite source not found at ${dbPath}. Set SQLITE_PATH to override.`);
  }

  console.log(`Source SQLite : ${dbPath}`);
  console.log(`Target MySQL  : ${process.env.DB_NAME || 'herdbook'} @ ${process.env.DB_HOST || 'localhost'}`);

  await initializeSchema();

  const sqlite = new Database(dbPath, { readonly: true });
  const connection = await pool.getConnection();

  try {
    // Guard: refuse to overwrite a populated target unless --force.
    if (!force) {
      for (const { table } of MIGRATION_ORDER) {
        const [rows] = await connection.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
        if (rows[0].n > 0) {
          throw new Error(
            `Target table "${table}" already has ${rows[0].n} row(s). ` +
            `Re-run with --force to wipe and re-import all tables.`,
          );
        }
      }
    }

    await connection.beginTransaction();
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    if (force) {
      // Delete children first (reverse order) before re-importing.
      for (const { table } of [...MIGRATION_ORDER].reverse()) {
        await connection.query(`DELETE FROM \`${table}\``);
      }
    }

    const summary = [];
    for (const { table, columns } of MIGRATION_ORDER) {
      const sourceRows = sqlite
        .prepare(`SELECT ${columns.join(', ')} FROM "${table}"`)
        .all();

      for (const row of sourceRows) {
        const values = columns.map((column) => row[column]);
        const placeholders = columns.map(() => '?').join(', ');
        await connection.query(
          `INSERT INTO \`${table}\` (${columns.join(', ')}) VALUES (${placeholders})`,
          values,
        );
      }
      summary.push(`${table}: ${sourceRows.length}`);
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    await connection.commit();

    console.log('\nMigration complete. Rows imported:');
    for (const line of summary) console.log(`  ${line}`);
    console.log('\nNote: sessions were intentionally skipped; users log in again.');
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
    sqlite.close();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('\nMigration failed:', error.message);
  process.exit(1);
});
