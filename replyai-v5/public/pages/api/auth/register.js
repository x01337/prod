/**
 * POST /api/auth/register
 * Body: { name, email, password }
 *
 * Security:
 *   - Validates all inputs before touching DB
 *   - bcrypt cost 12 for production security
 *   - Never stores or logs plain-text password
 *   - Rate limited: 5 per hour per IP
 */
import bcrypt from "bcryptjs";
import crypto from "crypto";
import getDb, { dbGet, dbRun } from "../../../lib/db";
import { signToken, setTokenCookie } from "../../../lib/auth";
import { rateLimit } from "../../../lib/ratelimit";
import { v, collect, sanitize } from "../../../lib/validate";

// Optional: import mailer if configured
let sendVerificationEmail;
try {
  const mailerModule = await import("../../../lib/mailer.js");
  sendVerificationEmail = mailerModule.sendVerificationEmail;
} catch { /* mailer not configured */ }

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  if (!rateLimit(req, { limit: 5, window: 3600 }))
    return res.status(429).json({ error: "Too many registration attempts. Try again later." });

  const { name, email, password } = req.body || {};

  const err = collect(
    v.name(name),
    v.email(email),
    v.password(password)
  );
  if (err) return res.status(400).json({ error: err });

  const cleanEmail = email.toLowerCase().trim();
  const cleanName  = sanitize(name.trim());

  let db;
  try {
    db = await getDb();
  } catch (e) {
    console.error("[register] DB connect error:", e.message);
    return res.status(500).json({ error: "Server error. Please try again." });
  }

  const existing = await dbGet(db, "SELECT id FROM users WHERE email=$1", [cleanEmail]);
  if (existing) return res.status(409).json({ error: "Email already registered." });

  // SECURITY: Hash with bcrypt cost 12
  // NEVER store plain-text password
  let hash;
  try {
    hash = bcrypt.hashSync(password, 12);
  } catch (e) {
    console.error("[register] bcrypt error:", e.message);
    return res.status(500).json({ error: "Server error. Please try again." });
  }

  let userId;
  try {
    const result = await dbRun(db,
      "INSERT INTO users (email, password, name) VALUES ($1,$2,$3)",
      [cleanEmail, hash, cleanName]   // 'hash' not 'password' — stored as bcrypt hash
    );
    userId = result.lastInsertRowid;
  } catch (e) {
    console.error("[register] insert error:", e.message);
    return res.status(500).json({ error: "Could not create account. Please try again." });
  }

  // Email verification (non-blocking — failure doesn't stop registration)
  let emailSent = false;
  try {
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await dbRun(db,
      "INSERT INTO email_verifications (user_id, code, expires_at) VALUES ($1,$2,$3)",
      [userId, code, expiresAt]
    );
    if (sendVerificationEmail) {
      await sendVerificationEmail(cleanEmail, code);
      emailSent = true;
    }
  } catch (e) {
    console.error("[register] verification email error:", e.message);
    // Continue — user can request resend
  }

  // Issue JWT — NEVER include password in token
  const token = signToken({ id: userId, email: cleanEmail, name: cleanName });
  res.setHeader("Set-Cookie", setTokenCookie(token));

  return res.status(201).json({
    ok: true,
    message: emailSent
      ? "Account created! Check your email to verify your address."
      : "Account created successfully!",
    emailSent,
  });
}
