/**
 * POST /api/auth/forgot-password
 * Body: { email }
 *
 * Generates a secure reset token, stores it with 30-min expiry,
 * and emails a reset link to the user.
 *
 * Security notes:
 * - Always returns the same response whether email exists or not (no user enumeration)
 * - Token is 32 random bytes (256-bit security)
 * - Rate limited: 3 attempts per 10 minutes per IP
 * - Old unused tokens for this user are deleted before creating a new one
 */
import crypto from "crypto";
import getDb, { dbGet, dbRun } from "../../../lib/db";
import { rateLimit } from "../../../lib/ratelimit";
import { v } from "../../../lib/validate";

const TOKEN_TTL_MINUTES = 30;

// Generic response — never reveal whether email exists
const OK_RESPONSE = {
  ok: true,
  message: "If that email is registered, you'll receive a reset link shortly.",
};

async function sendResetEmail(email, token, baseUrl) {
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const user     = process.env.EMAIL_USER;
  const pass     = process.env.EMAIL_PASS;
  const from     = process.env.EMAIL_FROM || user;

  if (!user || !pass) {
    // Dev mode — log to console so you can test without email setup
    console.log("\n[FORGOT-PASSWORD] Reset link (email not configured):");
    console.log(" →", resetUrl, "\n");
    return;
  }

  const nodemailer = (await import("nodemailer")).default;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;background:#0b0b0b;color:#ddd;padding:40px 32px;border-radius:12px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px">
        <div style="width:36px;height:36px;background:#ff7a00;border-radius:9px;display:flex;align-items:center;justify-content:center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2h12v8H9.5L7 13V10H2V2z" fill="#fff"/></svg>
        </div>
        <span style="font-size:18px;font-weight:800;color:#fff">Reply<span style="color:#ff7a00">AI</span></span>
      </div>

      <h2 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 8px">Reset your password</h2>
      <p style="color:#888;font-size:14px;line-height:1.7;margin:0 0 28px">
        We received a request to reset the password for your ReplyAI account.
        Click the button below to choose a new password.
      </p>

      <a href="${resetUrl}"
        style="display:inline-block;background:#ff7a00;color:#000;font-weight:700;font-size:14px;padding:13px 28px;border-radius:9px;text-decoration:none;margin-bottom:28px">
        Reset Password →
      </a>

      <p style="color:#555;font-size:12px;line-height:1.6;margin:0 0 6px">
        This link expires in <strong style="color:#888">${TOKEN_TTL_MINUTES} minutes</strong>.
      </p>
      <p style="color:#555;font-size:12px;margin:0">
        If you didn't request this, you can safely ignore this email. Your password won't change.
      </p>

      <div style="margin-top:36px;padding-top:20px;border-top:1px solid #1f1f1f">
        <p style="color:#333;font-size:11px;margin:0">
          Or copy this link: <span style="color:#555;word-break:break-all">${resetUrl}</span>
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"ReplyAI" <${from}>`,
    to:   email,
    subject: "Reset your ReplyAI password",
    text:  `Reset your password: ${resetUrl}\n\nExpires in ${TOKEN_TTL_MINUTES} minutes.`,
    html,
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Rate limit: 3 per 10 minutes per IP
  const allowed = rateLimit(req, { limit: 3, window: 600 });
  if (!allowed) {
    // Still return 200 to not reveal info — just log and do nothing
    console.warn("[forgot-password] Rate limit hit");
    return res.status(200).json(OK_RESPONSE);
  }

  const { email } = req.body || {};
  const emailErr = v.email(email);
  if (emailErr) {
    // Return 200 with generic message — don't reveal validation detail
    return res.status(200).json(OK_RESPONSE);
  }

  const db = await getDb();

  // Look up user (silently do nothing if not found)
  const user = await dbGet(db,
    "SELECT id, email FROM users WHERE email = $1", [email.toLowerCase().trim()]
  );

  if (user) {
    // Delete any existing unused tokens for this user
    await dbRun(db,
      "DELETE FROM password_reset_tokens WHERE user_id = $1 AND used = $2",
      [user.id, false]
    );

    // Generate cryptographically secure token
    const token     = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

    await dbRun(db,
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, token, expiresAt]
    );

    // Send email (non-blocking — don't fail the request if email fails)
    const baseUrl = process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
    try {
      await sendResetEmail(email.toLowerCase().trim(), token, baseUrl);
    } catch (err) {
      console.error("[forgot-password] Email send failed:", err.message);
      // Still succeed — link is logged to console in dev
    }
  }

  // Always return the same response
  return res.status(200).json(OK_RESPONSE);
}
