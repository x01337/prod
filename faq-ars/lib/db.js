// lib/db.js
// SQLite via sql.js (pure JavaScript/WASM — zero native compilation).
// The database is loaded from disk on first use and written back on every
// mutating operation.

import initSqlJs from "sql.js";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "ars.db");
const DATA_DIR = path.join(process.cwd(), "data");

let _SQL = null;
let _db  = null;

async function getSql() {
  if (_SQL) return _SQL;
  _SQL = await initSqlJs();
  return _SQL;
}

async function getDb() {
  if (_db) return _db;
  const SQL = await getSql();
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_PATH)) {
    _db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    _db = new SQL.Database();
  }
  initSchema();
  return _db;
}

function save() {
  if (!_db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(_db.export()));
}

function initSchema() {
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      keywords TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  save();
}

// ── helpers mirroring better-sqlite3's sync API ─────────────────────────────

export function dbRun(db, sql, params = []) {
  db.run(sql, params);
  save();
  const r = db.exec("SELECT last_insert_rowid() AS lid, changes() AS ch");
  const row = r.length ? Object.fromEntries(r[0].columns.map((c,i) => [c, r[0].values[0][i]])) : {};
  return { lastInsertRowid: row.lid || 0, changes: row.ch || 0 };
}

export function dbGet(db, sql, params = []) {
  const r = db.exec(sql, params);
  if (!r.length || !r[0].values.length) return undefined;
  return Object.fromEntries(r[0].columns.map((c,i) => [c, r[0].values[0][i]]));
}

export function dbAll(db, sql, params = []) {
  const r = db.exec(sql, params);
  if (!r.length) return [];
  return r[0].values.map(row => Object.fromEntries(r[0].columns.map((c,i) => [c, row[i]])));
}

export default getDb;
