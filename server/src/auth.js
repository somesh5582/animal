import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { pool } from './db.js';

const scrypt = promisify(scryptCallback);
const SESSION_DAYS = Number.isFinite(Number(process.env.SESSION_DAYS))
  ? Math.max(1, Math.min(30, Number(process.env.SESSION_DAYS)))
  : 7;
export const SESSION_COOKIE = 'csr_agro_session';

// allowed_modules is stored as a JSON array string. NULL means "all modules"
// (the default for admins and for staff created before this feature existed).
function parseAllowedModules(value) {
  if (value == null) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : null;
  } catch {
    return null;
  }
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    role: row.role,
    isActive: Boolean(row.isActive),
    // Admins are always unrestricted; expose null so the client treats them as full access.
    allowedModules: row.role === 'admin' ? null : parseAllowedModules(row.allowedModules),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

function isDuplicateError(error) {
  return error && (error.code === 'ER_DUP_ENTRY' || error.errno === 1062);
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, salt, expectedHex] = String(storedHash).split(':');
  if (algorithm !== 'scrypt' || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = await scrypt(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function userCount() {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM users');
  return rows[0].count;
}

export async function findUserForLogin(username) {
  const [rows] = await pool.query(
    `SELECT
      id, username, display_name AS displayName, password_hash AS passwordHash,
      role, is_active AS isActive, allowed_modules AS allowedModules,
      created_at AS createdAt, updated_at AS updatedAt
    FROM users
    WHERE username = ?`,
    [username],
  );
  return rows[0];
}

export async function listUsers() {
  const [rows] = await pool.query(`
    SELECT
      id, username, display_name AS displayName, role,
      is_active AS isActive, allowed_modules AS allowedModules,
      created_at AS createdAt, updated_at AS updatedAt
    FROM users
    ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, username
  `);
  return rows.map(publicUser);
}

export async function getUser(id) {
  const [rows] = await pool.query(
    `SELECT
      id, username, display_name AS displayName, role,
      is_active AS isActive, allowed_modules AS allowedModules,
      created_at AS createdAt, updated_at AS updatedAt
    FROM users
    WHERE id = ?`,
    [id],
  );
  return publicUser(rows[0]);
}

// Staff store an explicit module list; admins are unrestricted (stored as NULL).
function serializeAllowedModules(role, allowedModules) {
  if (role === 'admin') return null;
  if (!Array.isArray(allowedModules)) return null;
  return JSON.stringify(allowedModules.filter((item) => typeof item === 'string'));
}

export async function insertUser({ username, displayName, passwordHash, role, allowedModules }) {
  let result;
  try {
    [result] = await pool.query(
      `INSERT INTO users (username, display_name, password_hash, role, allowed_modules)
       VALUES (?, ?, ?, ?, ?)`,
      [username, displayName, passwordHash, role, serializeAllowedModules(role, allowedModules)],
    );
  } catch (error) {
    if (isDuplicateError(error)) {
      error.message = 'A user with this username already exists.';
      error.status = 409;
    }
    throw error;
  }
  return getUser(result.insertId);
}

export async function updateUserModules(id, allowedModules) {
  const [result] = await pool.query(
    `UPDATE users SET allowed_modules = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [serializeAllowedModules('staff', allowedModules), id],
  );
  if (!result.affectedRows) return null;
  return getUser(id);
}

export async function createSession(userId) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  await pool.query('DELETE FROM sessions WHERE expires_at <= ?', [new Date().toISOString()]);
  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
    [userId, tokenHash(token), expiresAt],
  );
  return { token, expiresAt };
}

export async function findSessionUser(token) {
  if (!token) return null;
  const now = new Date().toISOString();
  const [rows] = await pool.query(
    `SELECT
      u.id, u.username, u.display_name AS displayName, u.role,
      u.is_active AS isActive, u.allowed_modules AS allowedModules,
      u.created_at AS createdAt, u.updated_at AS updatedAt,
      s.expires_at AS expiresAt
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.is_active = 1`,
    [tokenHash(token), now],
  );
  return publicUser(rows[0]);
}

export async function deleteSession(token) {
  if (!token) return;
  await pool.query('DELETE FROM sessions WHERE token_hash = ?', [tokenHash(token)]);
}

export async function updateUserActive(id, isActive) {
  const [result] = await pool.query(
    `UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [isActive ? 1 : 0, id],
  );
  if (!result.affectedRows) return null;
  if (!isActive) await pool.query('DELETE FROM sessions WHERE user_id = ?', [id]);
  return getUser(id);
}

export async function updatePassword(id, passwordHash) {
  const [result] = await pool.query(
    `UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [passwordHash, id],
  );
  if (!result.affectedRows) return null;
  await pool.query('DELETE FROM sessions WHERE user_id = ?', [id]);
  return getUser(id);
}

export async function activeAdminCount() {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1`,
  );
  return rows[0].count;
}
