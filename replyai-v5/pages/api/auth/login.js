/**
 * POST /api/auth/login
 * Body: { email, password }
 *
 * Security:
 *   - Rate limited: 5 attempts per 15 minutes per IP
 *   - Constant-time bcrypt compare (prevents timing attacks)
 *   - Never logs passwords
 *   - Generic error message (no "email not found" vs "wrong password" distinction)
 */
import bcrypt from "bcryptjs";
import getDb, { dbGet } from "../../../lib/db";
import { signToken, setTokenCookie } from "../../../lib/auth";
import { rateLimit } from "../../../lib/ratelimit";
import { v, collect } from "../../../lib/validate";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // 5 attempts per 15 minutes per IP
  if (!rateLimit(req, { limit: 5, window: 900 }))
    return res.status(429).json({ error: "Too many login attempts. Try again in 15 minutes." });

  const { email, password } = req.body || {};

  const err = collect(v.email(email), v.text(password, "Password"));
  if (err) return res.status(400).json({ error: err });

  let user;
  try {
    const db = await getDb();
    user = await dbGet(db, "SELECT id, email, name, password FROM users WHERE email=$1", [email.toLowerCase().trim()]);
  } catch (e) {
    console.error("[login] DB error:", e.message);
    return res.status(500).json({ error: "Server error. Please try again." });
  }

  // SECURITY: Always run bcrypt even if user not found — prevents timing attacks
  // that could reveal whether an email is registered
  const hashToCompare = user?.password || "$2b$12$invalidhashpaddingtomakeconstanttime0000000000000";
  let valid = false;
  try {
    valid = bcrypt.compareSync(password, hashToCompare);
  } catch (e) {
    console.error("[login] bcrypt error:", e.message);
  }

  if (!user || !valid) {
    // SECURITY: Same message for "user not found" and "wrong password"
    return res.status(401).json({ error: "Invalid email or password." });
  }

  // SECURITY: Never log the password field
  // SECURITY: Never include password hash in JWT
  const token = signToken({ id: user.id, email: user.email, name: user.name });
  res.setHeader("Set-Cookie", setTokenCookie(token));

  return res.status(200).json({ ok: true });
}
