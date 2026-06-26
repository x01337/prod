/**
 * lib/db.js — Database abstraction (SQLite dev / PostgreSQL prod)
 * Use $1/$2 placeholders everywhere — auto-converted for SQLite.
 */

const IS_PG = !!process.env.DATABASE_URL;

// ── PostgreSQL ─────────────────────────────────────────────────────────────
let _pgPool = null;
let _pgInited = false;

function getPgPool() {
  if (_pgPool) return _pgPool;
  const { Pool } = require("pg");
  _pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: 10,
  });
  return _pgPool;
}

const PG_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id                  SERIAL PRIMARY KEY,
    email               TEXT NOT NULL UNIQUE,
    password            TEXT NOT NULL,
    name                TEXT NOT NULL DEFAULT '',
    avatar_url          TEXT NOT NULL DEFAULT '',
    plan                TEXT NOT NULL DEFAULT 'free',
    email_verified      BOOLEAN NOT NULL DEFAULT FALSE,
    whatsapp_phone_id   TEXT NOT NULL DEFAULT '',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS email_verifications (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code       TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS services (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    price      NUMERIC(10,2) NOT NULL DEFAULT 0,
    duration   INTEGER NOT NULL DEFAULT 60,
    color      TEXT NOT NULL DEFAULT '#ff7a00',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS faqs (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question   TEXT NOT NULL,
    answer     TEXT NOT NULL,
    keywords   TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL DEFAULT 1,
    service_id  INTEGER REFERENCES services(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL DEFAULT '',
    phone       TEXT NOT NULL DEFAULT '',
    date        TEXT NOT NULL DEFAULT '',
    start_time  TEXT NOT NULL DEFAULT '09:00',
    end_time    TEXT NOT NULL DEFAULT '10:00',
    status      TEXT NOT NULL DEFAULT 'booked',
    language    TEXT NOT NULL DEFAULT 'en',
    source      TEXT NOT NULL DEFAULT 'web',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS availability (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL DEFAULT 1,
    date         TEXT NOT NULL,
    start_time   TEXT NOT NULL DEFAULT '09:00',
    end_time     TEXT NOT NULL DEFAULT '17:00',
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, date, start_time)
  );
  CREATE TABLE IF NOT EXISTS messages (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL DEFAULT 1,
    phone      TEXT NOT NULL DEFAULT '',
    text       TEXT NOT NULL DEFAULT '',
    type       TEXT NOT NULL DEFAULT 'incoming',
    language   TEXT NOT NULL DEFAULT 'en',
    intent     TEXT NOT NULL DEFAULT 'unknown',
    source     TEXT NOT NULL DEFAULT 'web',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS missed_messages (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL DEFAULT 1,
    phone      TEXT NOT NULL DEFAULT '',
    text       TEXT NOT NULL DEFAULT '',
    language   TEXT NOT NULL DEFAULT 'en',
    source     TEXT NOT NULL DEFAULT 'web',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

async function pgEnsureSchema(pool) {
  if (_pgInited) return;
  _pgInited = true;
  await pool.query(PG_SCHEMA);
  const migrations = [
    "ALTER TABLE services ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#ff7a00'",
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES services(id) ON DELETE SET NULL",
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS start_time TEXT NOT NULL DEFAULT '09:00'",
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS end_time TEXT NOT NULL DEFAULT '10:00'",
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'booked'",
    "ALTER TABLE availability ADD COLUMN IF NOT EXISTS start_time TEXT NOT NULL DEFAULT '09:00'",
    "ALTER TABLE availability ADD COLUMN IF NOT EXISTS end_time TEXT NOT NULL DEFAULT '17:00'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()",
  ];
  for (const m of migrations) {
    try { await pool.query(m); } catch (_) {}
  }
}

async function getPgDb() {
  const pool = getPgPool();
  await pgEnsureSchema(pool);
  return pool;
}

async function pgGet(pool, sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows[0];
}
async function pgAll(pool, sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}
async function pgRun(pool, sql, params = []) {
  try {
    const res = await pool.query(sql + " RETURNING id", params);
    return { lastInsertRowid: res.rows?.[0]?.id ?? 0, changes: res.rowCount ?? 0 };
  } catch {
    const res = await pool.query(sql, params);
    return { lastInsertRowid: 0, changes: res.rowCount ?? 0 };
  }
}

// ── SQLite ─────────────────────────────────────────────────────────────────
let _sqliteDb = null;

async function getSqliteDb() {
  if (_sqliteDb) return _sqliteDb;
  const initSqlJs = (await import("sql.js")).default;
  const path = (await import("path")).default;
  const fs = (await import("fs")).default;
  const SQL = await initSqlJs();
  const DATA_DIR = path.join(process.cwd(), "data");
  const DB_PATH = path.join(DATA_DIR, "ars.db");
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  _sqliteDb = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();
  _sqliteDb._path = DB_PATH;

  _sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL,
        token      TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        used       INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS users (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      email             TEXT NOT NULL UNIQUE,
      password          TEXT NOT NULL,
      name              TEXT NOT NULL DEFAULT '',
      avatar_url        TEXT NOT NULL DEFAULT '',
      plan              TEXT NOT NULL DEFAULT 'free',
      email_verified    INTEGER NOT NULL DEFAULT 0,
      whatsapp_phone_id TEXT NOT NULL DEFAULT '',
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS email_verifications (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      code       TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS services (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      name       TEXT NOT NULL,
      price      REAL NOT NULL DEFAULT 0,
      duration   INTEGER NOT NULL DEFAULT 60,
      color      TEXT NOT NULL DEFAULT '#ff7a00',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS faqs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL DEFAULT 1,
      question   TEXT NOT NULL,
      answer     TEXT NOT NULL,
      keywords   TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL DEFAULT 1,
      service_id  INTEGER,
      client_name TEXT NOT NULL DEFAULT '',
      phone       TEXT NOT NULL DEFAULT '',
      date        TEXT NOT NULL DEFAULT '',
      start_time  TEXT NOT NULL DEFAULT '09:00',
      end_time    TEXT NOT NULL DEFAULT '10:00',
      status      TEXT NOT NULL DEFAULT 'booked',
      language    TEXT NOT NULL DEFAULT 'en',
      source      TEXT NOT NULL DEFAULT 'web',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS availability (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL DEFAULT 1,
      date         TEXT NOT NULL,
      start_time   TEXT NOT NULL DEFAULT '09:00',
      end_time     TEXT NOT NULL DEFAULT '17:00',
      is_available INTEGER NOT NULL DEFAULT 1,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, date, start_time)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL DEFAULT 1,
      phone      TEXT NOT NULL DEFAULT '',
      text       TEXT NOT NULL DEFAULT '',
      type       TEXT NOT NULL DEFAULT 'incoming',
      language   TEXT NOT NULL DEFAULT 'en',
      intent     TEXT NOT NULL DEFAULT 'unknown',
      source     TEXT NOT NULL DEFAULT 'web',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS missed_messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL DEFAULT 1,
      phone      TEXT NOT NULL DEFAULT '',
      text       TEXT NOT NULL DEFAULT '',
      language   TEXT NOT NULL DEFAULT 'en',
      source     TEXT NOT NULL DEFAULT 'web',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Safe migrations for existing databases
  const migrations = [
    "ALTER TABLE services ADD COLUMN color TEXT NOT NULL DEFAULT '#ff7a00'",
    "ALTER TABLE appointments ADD COLUMN service_id INTEGER",
    "ALTER TABLE appointments ADD COLUMN start_time TEXT NOT NULL DEFAULT '09:00'",
    "ALTER TABLE appointments ADD COLUMN end_time TEXT NOT NULL DEFAULT '10:00'",
    "ALTER TABLE appointments ADD COLUMN status TEXT NOT NULL DEFAULT 'booked'",
    "ALTER TABLE availability ADD COLUMN start_time TEXT NOT NULL DEFAULT '09:00'",
    "ALTER TABLE availability ADD COLUMN end_time TEXT NOT NULL DEFAULT '17:00'",
    "ALTER TABLE users ADD COLUMN stripe_customer_id TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE users ADD COLUMN subscription_status TEXT NOT NULL DEFAULT ''",
  ];
  for (const m of migrations) {
    try { _sqliteDb.run(m); } catch (_) {}
  }

  persist(_sqliteDb);
  return _sqliteDb;
}

function persist(db) {
  if (!db?._path) return;
  const fs = require("fs");
  try { fs.writeFileSync(db._path, Buffer.from(db.export())); } catch (e) { console.error("[db] persist failed:", e.message); }
}

function toPosArgs(sql) { return sql.replace(/\$\d+/g, "?"); }

function sqliteGet(db, sql, params = []) {
  try {
    const r = db.exec(toPosArgs(sql), params);
    if (!r.length || !r[0].values.length) return undefined;
    return Object.fromEntries(r[0].columns.map((c, i) => [c, r[0].values[0][i]]));
  } catch (e) { console.error("[db] sqliteGet:", e.message); return undefined; }
}
function sqliteAll(db, sql, params = []) {
  try {
    const r = db.exec(toPosArgs(sql), params);
    if (!r.length) return [];
    return r[0].values.map((row) => Object.fromEntries(r[0].columns.map((c, i) => [c, row[i]])));
  } catch (e) { console.error("[db] sqliteAll:", e.message); return []; }
}
function sqliteRun(db, sql, params = []) {
  try {
    db.run(toPosArgs(sql), params);
    persist(db);
    const r = db.exec("SELECT last_insert_rowid() AS lid, changes() AS ch");
    const row = r.length ? Object.fromEntries(r[0].columns.map((c, i) => [c, r[0].values[0][i]])) : {};
    return { lastInsertRowid: row.lid || 0, changes: row.ch || 0 };
  } catch (e) { console.error("[db] sqliteRun:", e.message, sql); throw e; }
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function getDb() { return IS_PG ? getPgDb() : getSqliteDb(); }
export async function dbGet(db, sql, params = []) { return IS_PG ? pgGet(db, sql, params) : sqliteGet(db, sql, params); }
export async function dbAll(db, sql, params = []) { return IS_PG ? pgAll(db, sql, params) : sqliteAll(db, sql, params); }
export async function dbRun(db, sql, params = []) { return IS_PG ? pgRun(db, sql, params) : sqliteRun(db, sql, params); }
export default getDb;

// ── Logging helpers ────────────────────────────────────────────────────────
export async function logMessage({ userId = 1, phone = "", text = "", type = "incoming", language = "en", intent = "unknown", source = "web" } = {}) {
  try {
    const db = await getDb();
    await dbRun(db, "INSERT INTO messages (user_id,phone,text,type,language,intent,source) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [userId, phone, String(text).slice(0, 1000), type, language, intent, source]);
  } catch (err) { console.error("[logMessage]", err.message); }
}

export async function logMissedMessage({ userId = 1, phone = "", text = "", language = "en", source = "web" } = {}) {
  try {
    const db = await getDb();
    await dbRun(db, "INSERT INTO missed_messages (user_id,phone,text,language,source) VALUES ($1,$2,$3,$4,$5)",
      [userId, phone, String(text).slice(0, 1000), language, source]);
  } catch (err) { console.error("[logMissedMessage]", err.message); }
}

/** Returns true if any availability slot covers the given date+time range */
export async function checkAvailability(userId, date, startTime, endTime) {
  try {
    const db = await getDb();
    // FIX: Fetch all rows for date, then filter is_available in JS
    // This avoids SQLite (0/1) vs PostgreSQL (true/false) boolean mismatch
    const rows = await dbAll(db,
      "SELECT * FROM availability WHERE user_id=$1 AND date=$2",
      [userId, date]
    );
    if (!rows.length) return false;
    // Filter available slots (works on both SQLite integer and PG boolean)
    const available = rows.filter(r => r.is_available === true || r.is_available === 1 || r.is_available === "1");
    if (!available.length) return false;
    // Check if any availability slot fully covers the requested time range
    return available.some(row => row.start_time <= startTime && row.end_time >= endTime);
  } catch (e) {
    console.error("[checkAvailability]", e.message);
    return false;
  }
}

/** Check if a time slot overlaps with existing appointments */
export async function checkOverlap(userId, date, startTime, endTime, excludeId = null) {
  try {
    const db = await getDb();
    let sql = `SELECT id FROM appointments WHERE user_id=$1 AND date=$2 AND status='booked'
               AND start_time < $3 AND end_time > $4`;
    const params = [userId, date, endTime, startTime];
    if (excludeId) { sql += ` AND id != $${params.length + 1}`; params.push(excludeId); }
    const rows = await dbAll(db, sql, params);
    return rows.length > 0;
  } catch { return false; }
}

export async function markDateUnavailable(userId, date) {
  try {
    const db = await getDb();
    await dbRun(db, "UPDATE availability SET is_available=$1 WHERE user_id=$2 AND date=$3", [0, userId, date]);
  } catch (err) { console.error("[markDateUnavailable]", err.message); }
}
