// pages/api/missed.js
//
// GET    → list missed messages for current user
// DELETE → delete a missed message by id
//
// Requires auth cookie.

import getDb, { dbAll, dbGet, dbRun } from "../../lib/db";
import { requireAuth } from "../../lib/auth";

export default async function handler(req, res) {
  try {
  const user = requireAuth(req, res);
  if (!user) return;

  const db = await getDb();

  if (req.method === "GET") {
    const rows = await dbAll(db,
      "SELECT * FROM missed_messages WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
      [user.id]
    );
    return res.status(200).json(rows);
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id required" });

    const row = await dbGet(db, "SELECT * FROM missed_messages WHERE id=$1 AND user_id=$2", [id, user.id]);
    if (!row) return res.status(404).json({ error: "Not found" });

    await dbRun(db, "DELETE FROM missed_messages WHERE id=$1", [id]);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error('[missed]', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Server error.' });
  }
}