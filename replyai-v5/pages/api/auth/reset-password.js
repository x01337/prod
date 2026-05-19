/**
 * POST /api/auth/reset-password
 * Body: { token, password }
 *
 * Validates the reset token, hashes the new password, updates the user,
 * marks the token as used, and issues a new JWT (auto-login).
 *
 * Security:
 * - Token must exist, be unused, and not expired
 * - Password validated (min 8 chars)
 * - Token is single-use: immediately marked used on success
 * - All expired/used tokens cleaned up
 * - Rate limited: 10 per 15 minutes per IP
 */
import bcrypt from "bcryptjs";
import getDb, { dbGet, dbRun } from "../../../lib/db";
import { signToken, setTokenCookie } from "../../../lib/auth";
import { rateLimit } from "../../../lib/ratelimit";
import { v } from "../../../lib/validate";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const allowed = rateLimit(req, { limit: 10, window: 900 });
  if (!allowed) return res.status(429).json({ error: "Too many attempts. Wait a few minutes." });

  const { token, password } = req.body || {};

  if (!token || typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
    return res.status(400).json({ error: "Invalid or missing reset token." });

  const pwErr = v.password(password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  const db = await getDb();

  // Find valid token
  const row = await dbGet(db,
    "SELECT * FROM password_reset_tokens WHERE token = $1",
    [token]
  );

  if (!row) return res.status(400).json({ error: "Invalid reset link. Please request a new one." });

  // Check used
  if (row.used === true || row.used === 1)
    return res.status(400).json({ error: "This reset link has already been used. Please request a new one." });

  // Check expiry (works for both ISO string and PG timestamp)
  if (new Date(row.expires_at) < new Date())
    return res.status(400).json({ error: "This reset link has expired. Please request a new one." });

  // Fetch user
  const user = await dbGet(db, "SELECT id, email, name FROM users WHERE id = $1", [row.user_id]);
  if (!user) return res.status(400).json({ error: "User not found." });

  // Hash new password
  const hash = bcrypt.hashSync(password, 12);

  // Update password
  await dbRun(db, "UPDATE users SET password = $1 WHERE id = $2", [hash, user.id]);

  // Mark token as used
  await dbRun(db, "UPDATE password_reset_tokens SET used = $1 WHERE id = $2", [true, row.id]);

  // Clean up all expired/used tokens for this user
  await dbRun(db,
    "DELETE FROM password_reset_tokens WHERE user_id = $1 AND (used = $2 OR expires_at < $3)",
    [user.id, true, new Date().toISOString()]
  );

  // Auto-login: issue JWT
  const jwtToken = signToken({ id: user.id, email: user.email, name: user.name });
  res.setHeader("Set-Cookie", setTokenCookie(jwtToken));

  return res.status(200).json({ ok: true, message: "Password updated successfully." });
}
