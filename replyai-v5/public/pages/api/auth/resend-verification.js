/**
 * POST /api/auth/resend-verification
 * Resends the verification code to the user's email.
 */

import crypto from "crypto";
import getDb, { dbRun } from "../../../lib/db";
import { requireAuth } from "../../../lib/auth";
import { sendVerificationEmail } from "../../../lib/mailer";
import { rateLimit } from "../../../lib/ratelimit";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  if (!rateLimit(req, { limit: 3, window: 300 }))
    return res.status(429).json({ error: "Too many resend attempts. Wait 5 minutes." });

  const user = requireAuth(req, res);
  if (!user) return;

  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const db = await getDb();
  await dbRun(db,
    "INSERT INTO email_verifications (user_id,code,expires_at) VALUES ($1,$2,$3)",
    [user.id, code, expiresAt]
  );

  try {
    await sendVerificationEmail(user.email, code);
    return res.status(200).json({ ok: true, message: "Verification code sent." });
  } catch (err) {
    console.error("[resend-verification]", err.message);
    return res.status(500).json({ error: "Failed to send email. Check EMAIL_USER and EMAIL_PASS." });
  }
}
