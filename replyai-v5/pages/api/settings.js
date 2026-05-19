/**
 * pages/api/settings.js
 * GET  → user settings (name, email, plan, email_verified, whatsapp_phone_id)
 * POST → update name + whatsapp_phone_id
 *
 * For full profile edits (email, password, avatar) → use /api/profile
 */
import getDb, { dbGet, dbRun } from "../../lib/db";
import { requireAuth } from "../../lib/auth";
import { sanitize, v } from "../../lib/validate";

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const db = await getDb();

  if (req.method === "GET") {
    const row = await dbGet(db,
      "SELECT id, email, name, plan, email_verified, whatsapp_phone_id FROM users WHERE id=$1",
      [user.id]
    );
    if (!row) return res.status(404).json({ error: "User not found." });
    return res.status(200).json({
      ...row,
      email_verified: row.email_verified === true || row.email_verified === 1,
    });
  }

  if (req.method === "POST") {
    const { name, whatsapp_phone_id } = req.body || {};
    const err = v.name(name || user.name);
    if (err) return res.status(400).json({ error: err });

    await dbRun(db,
      "UPDATE users SET name=$1, whatsapp_phone_id=$2 WHERE id=$3",
      [sanitize(name?.trim() || user.name), (whatsapp_phone_id || "").trim(), user.id]
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed." });
}
