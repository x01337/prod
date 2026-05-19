/**
 * lib/mailer.js — Nodemailer wrapper
 *
 * Exports:
 *   sendMail({ to, subject, html, text })
 *   sendVerificationEmail(to, code)
 *   sendTestEmail(to, message)
 *
 * Env: EMAIL_USER, EMAIL_PASS
 * Uses Gmail by default. For other providers set EMAIL_HOST, EMAIL_PORT.
 */

function getTransporter() {
  const nodemailer = require("nodemailer");

  if (process.env.EMAIL_HOST) {
    // Custom SMTP (SendGrid, Mailgun, etc.)
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587", 10),
      secure: process.env.EMAIL_SECURE === "true",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }

  // Default: Gmail
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

const FROM = () => `"ReplyAI" <${process.env.EMAIL_USER || "noreply@replyai.app"}>`;

export async function sendMail({ to, subject, html, text }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be set.");
  }
  const transporter = getTransporter();
  await transporter.sendMail({ from: FROM(), to, subject, html, text });
}

// ── Branded HTML wrapper ───────────────────────────────────────────────────
function brandedHtml(title, body) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { margin:0; padding:0; background:#0b0b0b; font-family:system-ui,sans-serif; }
  .wrap { max-width:560px; margin:40px auto; background:#111; border:1px solid #222; border-radius:12px; overflow:hidden; }
  .header { background:#ff7a00; padding:20px 32px; }
  .header h1 { color:#fff; margin:0; font-size:22px; font-weight:800; letter-spacing:-0.5px; }
  .body { padding:28px 32px; color:#e0e0e0; line-height:1.6; }
  .body h2 { color:#fff; font-size:18px; margin-bottom:12px; }
  .code { display:inline-block; font-size:32px; font-weight:800; letter-spacing:8px; color:#ff7a00; background:#1a1a1a; border:1px solid #333; border-radius:8px; padding:12px 24px; margin:16px 0; font-family:monospace; }
  .footer { padding:16px 32px; border-top:1px solid #222; font-size:12px; color:#555; }
  a { color:#ff7a00; }
</style></head>
<body><div class="wrap">
  <div class="header"><h1>ReplyAI</h1></div>
  <div class="body">${body}</div>
  <div class="footer">ReplyAI — AI-powered business assistant · If you didn't request this, ignore this email.</div>
</div></body></html>`;
}

export async function sendVerificationEmail(to, code) {
  const html = brandedHtml("Verify your email", `
    <h2>Verify your email address</h2>
    <p>Enter this code in the app to activate your account:</p>
    <div class="code">${code}</div>
    <p>This code expires in <strong>15 minutes</strong>.</p>
  `);
  await sendMail({
    to,
    subject: "Your ReplyAI verification code",
    html,
    text: `Your ReplyAI verification code is: ${code}\n\nExpires in 15 minutes.`,
  });
}

export async function sendTestEmail(to, message) {
  const safe = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = brandedHtml("Test Email", `
    <h2>Test message from ReplyAI</h2>
    <div style="background:#1a1a1a;border-radius:8px;padding:16px;border-left:3px solid #ff7a00;margin:12px 0;">
      <p style="margin:0;white-space:pre-wrap">${safe}</p>
    </div>
    <p style="color:#666;font-size:13px;margin-top:16px">Sent via ReplyAI dashboard</p>
  `);
  await sendMail({
    to,
    subject: "Message from ReplyAI",
    html,
    text: message,
  });
}
