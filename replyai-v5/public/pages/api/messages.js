// pages/api/messages.js
//
// GET  → list messages for current user (with optional filters)
// Query: ?type=incoming|outgoing&lang=en|pl|pt&limit=50&offset=0
//
// Requires auth cookie.

import getDb, { dbAll } from "../../lib/db";
import { requireAuth } from "../../lib/auth";

export default async function handler(req, res) {
  try {
  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { type, lang, intent, limit = "50", offset = "0" } = req.query;

  const db = await getDb();

  let sql = "SELECT * FROM messages WHERE user_id=$1";
  const params = [user.id];
  let idx = 2;

  if (type && ["incoming", "outgoing"].includes(type)) {
    sql += ` AND type=$${idx++}`;
    params.push(type);
  }
  if (lang && ["en", "pl", "pt"].includes(lang)) {
    sql += ` AND language=$${idx++}`;
    params.push(lang);
  }
  if (intent) {
    sql += ` AND intent=$${idx++}`;
    params.push(intent);
  }

  sql += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(Math.min(parseInt(limit, 10) || 50, 200));
  params.push(parseInt(offset, 10) || 0);

  const rows = await dbAll(db, sql, params);
  return res.status(200).json(rows);
  } catch (err) {
    console.error('[messages]', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Server error.' });
  }
}