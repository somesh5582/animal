import mysql from 'mysql2/promise';

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'herdbook',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  multipleStatements: false,
  dateStrings: true,
  charset: 'utf8mb4_general_ci',
};

export const pool = mysql.createPool(poolConfig);

/**
 * Create the target database (if missing) and all tables.
 * Safe to run repeatedly.
 */
export async function initializeSchema() {
  // Ensure the database exists, using a connection without a default schema.
  const bootstrap = await mysql.createConnection({
    host: poolConfig.host,
    port: poolConfig.port,
    user: poolConfig.user,
    password: poolConfig.password,
    multipleStatements: true,
  });
  try {
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS \`${poolConfig.database}\`
       CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`,
    );
  } finally {
    await bootstrap.end();
  }

  const statements = [
    `CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      purchase_date VARCHAR(10) NOT NULL,
      supplier VARCHAR(255) NOT NULL,
      species VARCHAR(100) NOT NULL,
      breed VARCHAR(100) NOT NULL DEFAULT '',
      quantity INTEGER NOT NULL,
      unit_cost DOUBLE NOT NULL,
      transport_cost DOUBLE NOT NULL DEFAULT 0,
      notes VARCHAR(500) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (quantity > 0),
      CHECK (unit_cost >= 0),
      CHECK (transport_cost >= 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    `CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      sale_date VARCHAR(10) NOT NULL,
      customer VARCHAR(255) NOT NULL,
      purchase_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price DOUBLE NOT NULL,
      notes VARCHAR(500) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (quantity > 0),
      CHECK (unit_price >= 0),
      CONSTRAINT fk_sales_purchase FOREIGN KEY (purchase_id)
        REFERENCES purchases(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    `CREATE TABLE IF NOT EXISTS weights (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      weight_date VARCHAR(10) NOT NULL,
      purchase_id INTEGER NOT NULL,
      animal_tag VARCHAR(60) NOT NULL DEFAULT '',
      measurement_type VARCHAR(10) NOT NULL DEFAULT 'weekly',
      weight_kg DOUBLE NOT NULL,
      notes VARCHAR(500) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (weight_kg > 0),
      CHECK (measurement_type IN ('weekly', 'monthly')),
      CONSTRAINT fk_weights_purchase FOREIGN KEY (purchase_id)
        REFERENCES purchases(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    `CREATE TABLE IF NOT EXISTS treatments (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      treatment_date VARCHAR(10) NOT NULL,
      purchase_id INTEGER NOT NULL,
      animal_tag VARCHAR(60) NOT NULL,
      treatment_description VARCHAR(500) NOT NULL,
      medicine VARCHAR(100) NOT NULL DEFAULT '',
      dosage VARCHAR(100) NOT NULL DEFAULT '',
      veterinarian VARCHAR(100) NOT NULL DEFAULT '',
      treatment_cost DOUBLE NOT NULL DEFAULT 0,
      follow_up_date VARCHAR(10) NOT NULL DEFAULT '',
      notes VARCHAR(500) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (treatment_cost >= 0),
      CONSTRAINT fk_treatments_purchase FOREIGN KEY (purchase_id)
        REFERENCES purchases(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    `CREATE TABLE IF NOT EXISTS feeds (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      feed_date VARCHAR(10) NOT NULL,
      feed_time VARCHAR(5) NOT NULL,
      purchase_id INTEGER NOT NULL,
      slot VARCHAR(10) NOT NULL,
      basket_count INTEGER NOT NULL,
      feed_description VARCHAR(500) NOT NULL DEFAULT '',
      notes VARCHAR(500) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (basket_count > 0),
      CHECK (slot IN ('morning', 'afternoon', 'evening')),
      CONSTRAINT uq_feeds_batch_date_slot UNIQUE (purchase_id, feed_date, slot),
      CONSTRAINT fk_feeds_purchase FOREIGN KEY (purchase_id)
        REFERENCES purchases(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    `CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 0,
      description VARCHAR(500) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (capacity >= 0),
      CONSTRAINT uq_rooms_name UNIQUE (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    `CREATE TABLE IF NOT EXISTS room_assignments (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      room_id INTEGER NOT NULL,
      purchase_id INTEGER NOT NULL,
      animal_tag VARCHAR(60) NOT NULL,
      assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      notes VARCHAR(500) NOT NULL DEFAULT '',
      CONSTRAINT uq_room_assignments_tag UNIQUE (animal_tag),
      CONSTRAINT fk_room_assignments_room FOREIGN KEY (room_id)
        REFERENCES rooms(id) ON DELETE RESTRICT,
      CONSTRAINT fk_room_assignments_purchase FOREIGN KEY (purchase_id)
        REFERENCES purchases(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    `CREATE TABLE IF NOT EXISTS expenditures (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      expenditure_date VARCHAR(10) NOT NULL,
      purpose VARCHAR(100) NOT NULL,
      paid_to VARCHAR(100) NOT NULL,
      amount DOUBLE NOT NULL,
      remarks VARCHAR(500) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (amount > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    `CREATE TABLE IF NOT EXISTS shed_construction_expenditures (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      construction_date VARCHAR(10) NOT NULL,
      shed_name VARCHAR(100) NOT NULL DEFAULT '',
      category VARCHAR(60) NOT NULL,
      paid_to VARCHAR(100) NOT NULL,
      amount DOUBLE NOT NULL,
      remarks VARCHAR(500) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (amount > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(60) NOT NULL,
      display_name VARCHAR(100) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(10) NOT NULL,
      is_active TINYINT NOT NULL DEFAULT 1,
      allowed_modules TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (role IN ('admin', 'staff')),
      CHECK (is_active IN (0, 1)),
      CONSTRAINT uq_users_username UNIQUE (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    `CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      user_id INTEGER NOT NULL,
      token_hash VARCHAR(64) NOT NULL,
      expires_at VARCHAR(32) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_sessions_token UNIQUE (token_hash),
      CONSTRAINT fk_sessions_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  ];

  const indexStatements = [
    ['sales', 'idx_sales_purchase_id', '(purchase_id)'],
    ['weights', 'idx_weights_purchase_id', '(purchase_id)'],
    ['weights', 'idx_weights_date', '(weight_date)'],
    ['weights', 'idx_weights_animal_period', '(animal_tag, measurement_type, weight_date)'],
    ['treatments', 'idx_treatments_purchase_id', '(purchase_id)'],
    ['treatments', 'idx_treatments_date', '(treatment_date)'],
    ['treatments', 'idx_treatments_animal_date', '(animal_tag, treatment_date)'],
    ['feeds', 'idx_feeds_purchase_id', '(purchase_id)'],
    ['feeds', 'idx_feeds_date_slot', '(feed_date, slot)'],
    ['room_assignments', 'idx_room_assignments_room_id', '(room_id)'],
    ['room_assignments', 'idx_room_assignments_purchase_id', '(purchase_id)'],
    ['expenditures', 'idx_expenditures_date', '(expenditure_date)'],
    ['shed_construction_expenditures', 'idx_shed_constructions_date', '(construction_date)'],
    ['shed_construction_expenditures', 'idx_shed_constructions_category', '(category)'],
    ['sessions', 'idx_sessions_user_id', '(user_id)'],
    ['sessions', 'idx_sessions_expires_at', '(expires_at)'],
    ['purchases', 'idx_purchases_date', '(purchase_date)'],
    ['sales', 'idx_sales_date', '(sale_date)'],
  ];

  const connection = await pool.getConnection();
  try {
    for (const statement of statements) {
      await connection.query(statement);
    }
    for (const [table, name, columns] of indexStatements) {
      await createIndexIfMissing(connection, table, name, columns);
    }
    await addColumnIfMissing(connection, 'users', 'allowed_modules', 'TEXT NULL');
  } finally {
    connection.release();
  }
}

async function addColumnIfMissing(connection, table, column, definition) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS n FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column],
  );
  if (rows[0].n === 0) {
    await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function createIndexIfMissing(connection, table, indexName, columns) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS n FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [table, indexName],
  );
  if (rows[0].n === 0) {
    await connection.query(`CREATE INDEX \`${indexName}\` ON \`${table}\` ${columns}`);
  }
}

function isDuplicateError(error) {
  return error && (error.code === 'ER_DUP_ENTRY' || error.errno === 1062);
}

// Helpers that mirror the previous better-sqlite3 ergonomics on top of mysql2.
async function all(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function get(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows[0];
}

async function run(sql, params = []) {
  const [result] = await pool.query(sql, params);
  return result;
}

const purchaseSelect = `
  SELECT
    p.id,
    p.purchase_date AS purchaseDate,
    p.supplier,
    p.species,
    p.breed,
    p.quantity,
    p.unit_cost AS unitCost,
    p.transport_cost AS transportCost,
    p.notes,
    p.created_at AS createdAt,
    COALESCE(SUM(s.quantity), 0) AS soldQuantity,
    p.quantity - COALESCE(SUM(s.quantity), 0) AS availableQuantity,
    p.quantity * p.unit_cost + p.transport_cost AS totalCost,
    p.unit_cost + (p.transport_cost / p.quantity) AS landedUnitCost
  FROM purchases p
  LEFT JOIN sales s ON s.purchase_id = p.id
`;

const weightSelect = `
  SELECT
    w.id,
    w.weight_date AS weightDate,
    w.purchase_id AS purchaseId,
    w.animal_tag AS animalTag,
    w.measurement_type AS measurementType,
    w.weight_kg AS weightKg,
    w.notes,
    w.created_at AS createdAt,
    p.species,
    p.breed,
    p.supplier
  FROM weights w
  JOIN purchases p ON p.id = w.purchase_id
`;

const treatmentSelect = `
  SELECT
    t.id,
    t.treatment_date AS treatmentDate,
    t.purchase_id AS purchaseId,
    t.animal_tag AS animalTag,
    t.treatment_description AS treatmentDescription,
    t.medicine,
    t.dosage,
    t.veterinarian,
    t.treatment_cost AS treatmentCost,
    t.follow_up_date AS followUpDate,
    t.notes,
    t.created_at AS createdAt,
    p.species,
    p.breed,
    p.supplier
  FROM treatments t
  JOIN purchases p ON p.id = t.purchase_id
`;

const feedSelect = `
  SELECT
    f.id,
    f.feed_date AS feedDate,
    f.feed_time AS feedTime,
    f.purchase_id AS purchaseId,
    f.slot,
    f.basket_count AS basketCount,
    f.feed_description AS feedDescription,
    f.notes,
    f.created_at AS createdAt,
    p.species,
    p.breed,
    p.supplier
  FROM feeds f
  JOIN purchases p ON p.id = f.purchase_id
`;

const roomAssignmentSelect = `
  SELECT
    ra.id,
    ra.room_id AS roomId,
    r.name AS roomName,
    r.capacity AS roomCapacity,
    ra.purchase_id AS purchaseId,
    ra.animal_tag AS animalTag,
    ra.assigned_at AS assignedAt,
    ra.updated_at AS updatedAt,
    ra.notes,
    p.species,
    p.breed,
    p.supplier
  FROM room_assignments ra
  JOIN rooms r ON r.id = ra.room_id
  JOIN purchases p ON p.id = ra.purchase_id
`;

const roomSelect = `
  SELECT
    r.id,
    r.name,
    r.capacity,
    r.description,
    r.created_at AS createdAt,
    COUNT(ra.id) AS occupancy,
    CASE WHEN r.capacity = 0 THEN 1 ELSE 0 END AS isUnlimited,
    CASE
      WHEN r.capacity = 0 THEN NULL
      WHEN r.capacity > COUNT(ra.id) THEN r.capacity - COUNT(ra.id)
      ELSE 0
    END AS availableCapacity
  FROM rooms r
  LEFT JOIN room_assignments ra ON ra.room_id = r.id
`;

const expenditureSelect = `
  SELECT
    id,
    expenditure_date AS expenditureDate,
    purpose,
    paid_to AS paidTo,
    amount,
    remarks,
    created_at AS createdAt
  FROM expenditures
`;

async function getAnimalPurchaseId(executor, animalTag, excludedWeightId = null) {
  const [rows] = await executor.query(
    `SELECT purchase_id AS purchaseId
     FROM (
       SELECT purchase_id, animal_tag FROM weights
       WHERE ? IS NULL OR id != ?
       UNION ALL
       SELECT purchase_id, animal_tag FROM treatments
       UNION ALL
       SELECT purchase_id, animal_tag FROM room_assignments
     ) AS linked
     WHERE animal_tag = ?
     LIMIT 1`,
    [excludedWeightId, excludedWeightId, animalTag],
  );
  return rows[0]?.purchaseId ?? null;
}

export async function getDashboard() {
  return get(`
    WITH batch_totals AS (
      SELECT
        p.id,
        p.quantity,
        p.unit_cost,
        p.transport_cost,
        COALESCE(SUM(s.quantity), 0) AS sold_quantity
      FROM purchases p
      LEFT JOIN sales s ON s.purchase_id = p.id
      GROUP BY p.id
    )
    SELECT
      COALESCE((SELECT SUM(quantity) FROM purchases), 0) AS totalPurchased,
      COALESCE((SELECT SUM(quantity * unit_cost + transport_cost) FROM purchases), 0) AS purchaseInvestment,
      COALESCE((SELECT SUM(quantity) FROM sales), 0) AS totalSold,
      COALESCE((SELECT SUM(quantity * unit_price) FROM sales), 0) AS salesRevenue,
      COALESCE((SELECT SUM(quantity - sold_quantity) FROM batch_totals), 0) AS currentStock,
      COALESCE((
        SELECT SUM((quantity - sold_quantity) * (unit_cost + transport_cost / quantity))
        FROM batch_totals
      ), 0) AS inventoryValue,
      COALESCE((
        SELECT SUM(s.quantity * (s.unit_price - (p.unit_cost + p.transport_cost / p.quantity)))
        FROM sales s
        JOIN purchases p ON p.id = s.purchase_id
      ), 0) AS realizedProfit
  `);
}

export async function listPurchases() {
  return all(`
    ${purchaseSelect}
    GROUP BY p.id
    ORDER BY p.purchase_date DESC, p.id DESC
  `);
}

export async function getPurchase(id, executor = pool) {
  const [rows] = await executor.query(
    `${purchaseSelect} WHERE p.id = ? GROUP BY p.id`,
    [id],
  );
  return rows[0];
}

export async function createPurchase(purchase) {
  const result = await run(
    `INSERT INTO purchases (
      purchase_date, supplier, species, breed, quantity,
      unit_cost, transport_cost, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      purchase.purchaseDate, purchase.supplier, purchase.species, purchase.breed,
      purchase.quantity, purchase.unitCost, purchase.transportCost, purchase.notes,
    ],
  );
  return getPurchase(result.insertId);
}

export async function deletePurchase(id) {
  const linkedRecords = await get(
    `SELECT
      (SELECT COUNT(*) FROM sales WHERE purchase_id = ?) AS saleCount,
      (SELECT COUNT(*) FROM treatments WHERE purchase_id = ?) AS treatmentCount,
      (SELECT COUNT(*) FROM feeds WHERE purchase_id = ?) AS feedCount,
      (SELECT COUNT(*) FROM room_assignments WHERE purchase_id = ?) AS roomAssignmentCount`,
    [id, id, id, id],
  );

  if (linkedRecords.saleCount > 0) {
    return { deleted: false, hasSales: true, hasTreatments: false, hasFeeds: false, hasRoomAssignments: false };
  }
  if (linkedRecords.treatmentCount > 0) {
    return { deleted: false, hasSales: false, hasTreatments: true, hasFeeds: false, hasRoomAssignments: false };
  }
  if (linkedRecords.feedCount > 0) {
    return { deleted: false, hasSales: false, hasTreatments: false, hasFeeds: true, hasRoomAssignments: false };
  }
  if (linkedRecords.roomAssignmentCount > 0) {
    return { deleted: false, hasSales: false, hasTreatments: false, hasFeeds: false, hasRoomAssignments: true };
  }

  const result = await run('DELETE FROM purchases WHERE id = ?', [id]);
  return { deleted: result.affectedRows > 0, hasSales: false, hasTreatments: false, hasFeeds: false, hasRoomAssignments: false };
}

export async function listInventory() {
  return all(`
    ${purchaseSelect}
    GROUP BY p.id
    HAVING p.quantity - COALESCE(SUM(s.quantity), 0) > 0
    ORDER BY p.purchase_date ASC, p.id ASC
  `);
}

export async function listSales() {
  return all(`
    SELECT
      s.id,
      s.sale_date AS saleDate,
      s.customer,
      s.purchase_id AS purchaseId,
      s.quantity,
      s.unit_price AS unitPrice,
      s.notes,
      s.created_at AS createdAt,
      p.species,
      p.breed,
      p.supplier,
      s.quantity * s.unit_price AS revenue,
      s.quantity * (p.unit_cost + p.transport_cost / p.quantity) AS cost,
      s.quantity * (s.unit_price - (p.unit_cost + p.transport_cost / p.quantity)) AS profit
    FROM sales s
    JOIN purchases p ON p.id = s.purchase_id
    ORDER BY s.sale_date DESC, s.id DESC
  `);
}

export async function createSale(sale) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const batch = await getPurchase(sale.purchaseId, connection);
    if (!batch) {
      const error = new Error('The selected purchase batch does not exist.');
      error.status = 404;
      throw error;
    }
    if (sale.quantity > batch.availableQuantity) {
      const error = new Error(
        `Only ${batch.availableQuantity} animal${batch.availableQuantity === 1 ? '' : 's'} remain in this batch.`,
      );
      error.status = 409;
      throw error;
    }

    const [result] = await connection.query(
      `INSERT INTO sales (
        sale_date, customer, purchase_id, quantity, unit_price, notes
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [sale.saleDate, sale.customer, sale.purchaseId, sale.quantity, sale.unitPrice, sale.notes],
    );

    const [rows] = await connection.query(
      `SELECT
        s.id,
        s.sale_date AS saleDate,
        s.customer,
        s.purchase_id AS purchaseId,
        s.quantity,
        s.unit_price AS unitPrice,
        s.notes,
        p.species,
        p.breed,
        s.quantity * s.unit_price AS revenue,
        s.quantity * (p.unit_cost + p.transport_cost / p.quantity) AS cost,
        s.quantity * (s.unit_price - (p.unit_cost + p.transport_cost / p.quantity)) AS profit
      FROM sales s
      JOIN purchases p ON p.id = s.purchase_id
      WHERE s.id = ?`,
      [result.insertId],
    );

    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteSale(id) {
  const result = await run('DELETE FROM sales WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function listWeights() {
  return all(`
    ${weightSelect}
    ORDER BY w.weight_date DESC, w.id DESC
  `);
}

export async function createWeight(weight) {
  const batch = await getPurchase(weight.purchaseId);
  if (!batch) {
    const error = new Error('The selected purchase batch does not exist.');
    error.status = 404;
    throw error;
  }
  if (batch.availableQuantity <= 0) {
    const error = new Error('The selected purchase batch has no animals remaining in stock.');
    error.status = 409;
    throw error;
  }

  const existingAnimalPurchaseId = await getAnimalPurchaseId(pool, weight.animalTag);
  if (existingAnimalPurchaseId && existingAnimalPurchaseId !== weight.purchaseId) {
    const error = new Error(
      `Animal ${weight.animalTag} is already linked to purchase batch #${existingAnimalPurchaseId}.`,
    );
    error.status = 409;
    throw error;
  }

  const result = await run(
    `INSERT INTO weights (
      weight_date, purchase_id, animal_tag, measurement_type, weight_kg, notes
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      weight.weightDate, weight.purchaseId, weight.animalTag,
      weight.measurementType, weight.weightKg, weight.notes,
    ],
  );

  return get(`${weightSelect} WHERE w.id = ?`, [result.insertId]);
}

export async function updateWeight(id, weight) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [currentRows] = await connection.query(`${weightSelect} WHERE w.id = ?`, [id]);
    const current = currentRows[0];
    if (!current) {
      const error = new Error('Weight entry not found.');
      error.status = 404;
      throw error;
    }

    const batch = await getPurchase(weight.purchaseId, connection);
    if (!batch) {
      const error = new Error('The selected purchase batch does not exist.');
      error.status = 404;
      throw error;
    }
    if (weight.purchaseId !== current.purchaseId && batch.availableQuantity <= 0) {
      const error = new Error('The selected purchase batch has no animals remaining in stock.');
      error.status = 409;
      throw error;
    }

    const existingAnimalPurchaseId = await getAnimalPurchaseId(connection, weight.animalTag, id);
    if (existingAnimalPurchaseId && existingAnimalPurchaseId !== weight.purchaseId) {
      const error = new Error(
        `Animal ${weight.animalTag} is already linked to purchase batch #${existingAnimalPurchaseId}.`,
      );
      error.status = 409;
      throw error;
    }

    await connection.query(
      `UPDATE weights
       SET weight_date = ?, purchase_id = ?, animal_tag = ?,
           measurement_type = ?, weight_kg = ?, notes = ?
       WHERE id = ?`,
      [
        weight.weightDate, weight.purchaseId, weight.animalTag,
        weight.measurementType, weight.weightKg, weight.notes, id,
      ],
    );

    const [rows] = await connection.query(`${weightSelect} WHERE w.id = ?`, [id]);
    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteWeight(id) {
  const result = await run('DELETE FROM weights WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function listTreatments() {
  return all(`
    ${treatmentSelect}
    ORDER BY t.treatment_date DESC, t.id DESC
  `);
}

export async function createTreatment(treatment) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const batch = await getPurchase(treatment.purchaseId, connection);
    if (!batch) {
      const error = new Error('The selected purchase batch does not exist.');
      error.status = 404;
      throw error;
    }
    if (batch.availableQuantity <= 0) {
      const error = new Error('The selected purchase batch has no animals remaining in stock.');
      error.status = 409;
      throw error;
    }

    const existingAnimalPurchaseId = await getAnimalPurchaseId(connection, treatment.animalTag);
    if (existingAnimalPurchaseId && existingAnimalPurchaseId !== treatment.purchaseId) {
      const error = new Error(
        `Animal ${treatment.animalTag} is already linked to purchase batch #${existingAnimalPurchaseId}.`,
      );
      error.status = 409;
      throw error;
    }

    const [result] = await connection.query(
      `INSERT INTO treatments (
        treatment_date, purchase_id, animal_tag, treatment_description,
        medicine, dosage, veterinarian, treatment_cost, follow_up_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        treatment.treatmentDate, treatment.purchaseId, treatment.animalTag,
        treatment.treatmentDescription, treatment.medicine, treatment.dosage,
        treatment.veterinarian, treatment.treatmentCost, treatment.followUpDate, treatment.notes,
      ],
    );

    const [rows] = await connection.query(`${treatmentSelect} WHERE t.id = ?`, [result.insertId]);
    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteTreatment(id) {
  const result = await run('DELETE FROM treatments WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function listFeeds() {
  return all(`
    ${feedSelect}
    ORDER BY f.feed_date DESC, f.feed_time DESC, f.id DESC
  `);
}

export async function createFeed(feed) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const batch = await getPurchase(feed.purchaseId, connection);
    if (!batch) {
      const error = new Error('The selected purchase batch does not exist.');
      error.status = 404;
      throw error;
    }
    if (batch.availableQuantity <= 0) {
      const error = new Error('The selected purchase batch has no animals remaining in stock.');
      error.status = 409;
      throw error;
    }

    const [existingRows] = await connection.query(
      `SELECT id FROM feeds
       WHERE purchase_id = ? AND feed_date = ? AND slot = ?
       LIMIT 1`,
      [feed.purchaseId, feed.feedDate, feed.slot],
    );
    if (existingRows[0]) {
      const error = new Error('Feed is already recorded for this batch, date, and meal slot.');
      error.status = 409;
      throw error;
    }

    let result;
    try {
      [result] = await connection.query(
        `INSERT INTO feeds (
          feed_date, feed_time, purchase_id, slot,
          basket_count, feed_description, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          feed.feedDate, feed.feedTime, feed.purchaseId, feed.slot,
          feed.basketCount, feed.feedDescription, feed.notes,
        ],
      );
    } catch (error) {
      if (isDuplicateError(error)) {
        error.message = 'Feed is already recorded for this batch, date, and meal slot.';
        error.status = 409;
      }
      throw error;
    }

    const [rows] = await connection.query(`${feedSelect} WHERE f.id = ?`, [result.insertId]);
    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteFeed(id) {
  const result = await run('DELETE FROM feeds WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function getRoom(id, executor = pool) {
  const [rows] = await executor.query(
    `${roomSelect} WHERE r.id = ? GROUP BY r.id`,
    [id],
  );
  return rows[0];
}

export async function listRooms() {
  return all(`
    ${roomSelect}
    GROUP BY r.id
    ORDER BY r.name ASC, r.id ASC
  `);
}

export async function createRoom(room) {
  let result;
  try {
    result = await run(
      `INSERT INTO rooms (name, capacity, description) VALUES (?, ?, ?)`,
      [room.name, room.capacity, room.description],
    );
  } catch (error) {
    if (isDuplicateError(error)) {
      error.message = 'A room with this name already exists.';
      error.status = 409;
    }
    throw error;
  }
  return getRoom(result.insertId);
}

export async function updateRoom(id, room) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const current = await getRoom(id, connection);
    if (!current) {
      const error = new Error('Room not found.');
      error.status = 404;
      throw error;
    }
    if (room.capacity !== 0 && room.capacity < current.occupancy) {
      const error = new Error(
        `Room capacity cannot be less than the current occupancy of ${current.occupancy}.`,
      );
      error.status = 409;
      throw error;
    }

    try {
      await connection.query(
        `UPDATE rooms SET name = ?, capacity = ?, description = ? WHERE id = ?`,
        [room.name, room.capacity, room.description, id],
      );
    } catch (error) {
      if (isDuplicateError(error)) {
        error.message = 'A room with this name already exists.';
        error.status = 409;
      }
      throw error;
    }

    const result = await getRoom(id, connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteRoom(id) {
  const room = await getRoom(id);
  if (!room) return { deleted: false, hasAssignments: false };
  if (room.occupancy > 0) return { deleted: false, hasAssignments: true };
  const result = await run('DELETE FROM rooms WHERE id = ?', [id]);
  return { deleted: result.affectedRows > 0, hasAssignments: false };
}

async function getRoomAssignment(id, executor = pool) {
  const [rows] = await executor.query(`${roomAssignmentSelect} WHERE ra.id = ?`, [id]);
  return rows[0];
}

export async function listRoomAssignments() {
  return all(`
    ${roomAssignmentSelect}
    ORDER BY r.name ASC, ra.animal_tag ASC, ra.id ASC
  `);
}

export async function createRoomAssignment(assignment) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const room = await getRoom(assignment.roomId, connection);
    if (!room) {
      const error = new Error('The selected room does not exist.');
      error.status = 404;
      throw error;
    }
    if (!room.isUnlimited && room.availableCapacity <= 0) {
      const error = new Error(`${room.name} has reached its capacity.`);
      error.status = 409;
      throw error;
    }

    const batch = await getPurchase(assignment.purchaseId, connection);
    if (!batch) {
      const error = new Error('The selected purchase batch does not exist.');
      error.status = 404;
      throw error;
    }
    if (batch.availableQuantity <= 0) {
      const error = new Error('The selected purchase batch has no animals remaining in stock.');
      error.status = 409;
      throw error;
    }

    const existingAnimalPurchaseId = await getAnimalPurchaseId(connection, assignment.animalTag);
    if (existingAnimalPurchaseId && existingAnimalPurchaseId !== assignment.purchaseId) {
      const error = new Error(
        `Animal ${assignment.animalTag} is already linked to purchase batch #${existingAnimalPurchaseId}.`,
      );
      error.status = 409;
      throw error;
    }

    const [existingAssignmentRows] = await connection.query(
      `SELECT ra.id, r.name AS roomName
       FROM room_assignments ra
       JOIN rooms r ON r.id = ra.room_id
       WHERE ra.animal_tag = ?
       LIMIT 1`,
      [assignment.animalTag],
    );
    if (existingAssignmentRows[0]) {
      const error = new Error(`${assignment.animalTag} is already assigned to ${existingAssignmentRows[0].roomName}.`);
      error.status = 409;
      throw error;
    }

    const [assignedRows] = await connection.query(
      `SELECT COUNT(*) AS count FROM room_assignments WHERE purchase_id = ?`,
      [assignment.purchaseId],
    );
    if (assignedRows[0].count >= batch.availableQuantity) {
      const error = new Error('All available animals in this purchase batch are already assigned to rooms.');
      error.status = 409;
      throw error;
    }

    let result;
    try {
      [result] = await connection.query(
        `INSERT INTO room_assignments (room_id, purchase_id, animal_tag, notes)
         VALUES (?, ?, ?, ?)`,
        [assignment.roomId, assignment.purchaseId, assignment.animalTag, assignment.notes],
      );
    } catch (error) {
      if (isDuplicateError(error)) {
        error.message = `${assignment.animalTag} is already assigned to a room.`;
        error.status = 409;
      }
      throw error;
    }

    const created = await getRoomAssignment(result.insertId, connection);
    await connection.commit();
    return created;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function moveRoomAssignment(id, roomId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const assignment = await getRoomAssignment(id, connection);
    if (!assignment) {
      const error = new Error('Room assignment not found.');
      error.status = 404;
      throw error;
    }
    const room = await getRoom(roomId, connection);
    if (!room) {
      const error = new Error('The selected room does not exist.');
      error.status = 404;
      throw error;
    }
    if (assignment.roomId === roomId) {
      await connection.commit();
      return assignment;
    }
    if (!room.isUnlimited && room.availableCapacity <= 0) {
      const error = new Error(`${room.name} has reached its capacity.`);
      error.status = 409;
      throw error;
    }

    await connection.query(
      `UPDATE room_assignments
       SET room_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [roomId, id],
    );
    const updated = await getRoomAssignment(id, connection);
    await connection.commit();
    return updated;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteRoomAssignment(id) {
  const result = await run('DELETE FROM room_assignments WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function listExpenditures() {
  return all(`
    ${expenditureSelect}
    ORDER BY expenditure_date DESC, id DESC
  `);
}

export async function createExpenditure(expenditure) {
  const result = await run(
    `INSERT INTO expenditures (
      expenditure_date, purpose, paid_to, amount, remarks
    ) VALUES (?, ?, ?, ?, ?)`,
    [
      expenditure.expenditureDate, expenditure.purpose, expenditure.paidTo,
      expenditure.amount, expenditure.remarks,
    ],
  );
  return get(`${expenditureSelect} WHERE id = ?`, [result.insertId]);
}

export async function deleteExpenditure(id) {
  const result = await run('DELETE FROM expenditures WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

const shedConstructionSelect = `
  SELECT
    id,
    construction_date AS constructionDate,
    shed_name AS shedName,
    category,
    paid_to AS paidTo,
    amount,
    remarks,
    created_at AS createdAt
  FROM shed_construction_expenditures
`;

export async function listShedConstructions() {
  return all(`
    ${shedConstructionSelect}
    ORDER BY construction_date DESC, id DESC
  `);
}

export async function createShedConstruction(entry) {
  const result = await run(
    `INSERT INTO shed_construction_expenditures (
      construction_date, shed_name, category, paid_to, amount, remarks
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      entry.constructionDate, entry.shedName, entry.category,
      entry.paidTo, entry.amount, entry.remarks,
    ],
  );
  return get(`${shedConstructionSelect} WHERE id = ?`, [result.insertId]);
}

export async function deleteShedConstruction(id) {
  const result = await run('DELETE FROM shed_construction_expenditures WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
