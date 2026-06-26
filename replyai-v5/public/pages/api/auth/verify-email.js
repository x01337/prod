/**
 * POST /api/auth/verify-email
 * Body: { code }
 * Verifies the 6-digit code sent by email.
 * Marks user as email_verified=true on success.
 */

import getDb, { dbGet, dbRun } from "../../../lib/db";
import { requireAuth } from "../../../lib/auth";
import { rateLimit } from "../../../lib/ratelimit";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  if (!rateLimit(req, { limit: 10, window: 300 }))
    return res.status(429).json({ error: "Too many attempts." });

  const user = requireAuth(req, res);
  if (!user) return;

  const { code } = req.body || {};
  if (!code || typeof code !== "string" || !/^\d{6}$/.test(code.trim()))
    return res.status(400).json({ error: "Invalid code format." });

  const db = await getDb();

  const record = await dbGet(db,
    `SELECT * FROM email_verifications
     WHERE user_id=$1 AND code=$2 AND used=$3
     ORDER BY created_at DESC LIMIT 1`,
    [user.id, code.trim(), 0]
  );

  if (!record) return res.status(400).json({ error: "Invalid or expired code." });

  const expired = new Date(record.expires_at) < new Date();
  if (expired) return res.status(400).json({ error: "Code has expired. Please request a new one." });

  // Mark code as used
  await dbRun(db, "UPDATE email_verifications SET used=$1 WHERE id=$2", [1, record.id]);

  // Mark user as verified
  await dbRun(db, "UPDATE users SET email_verified=$1 WHERE id=$2", [1, user.id]);

  return res.status(200).json({ ok: true, message: "Email verified successfully." });
}
