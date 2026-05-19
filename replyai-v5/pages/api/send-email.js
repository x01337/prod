/**
 * POST /api/send-email
 * Body: { to, message }
 * Auth: required
 * Rate limit: 10/hour
 */

import { requireAuth } from "../../lib/auth";
import { sendTestEmail } from "../../lib/mailer";
import { rateLimit } from "../../lib/ratelimit";
import { v, collect } from "../../lib/validate";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  const user = requireAuth(req, res);
  if (!user) return;

  if (!rateLimit(req, { limit: 10, window: 3600 }))
    return res.status(429).json({ error: "Email limit reached (10/hour). Try again later." });

  const { to, message } = req.body || {};

  const err = collect(v.email(to), v.text(message, "Message", 1, 2000));
  if (err) return res.status(400).json({ error: err });

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)
    return res.status(503).json({ error: "Email not configured. Set EMAIL_USER and EMAIL_PASS." });

  try {
    await sendTestEmail(to.trim(), message.trim());
    return res.status(200).json({ ok: true, message: "Email sent successfully." });
  } catch (err) {
    console.error("[send-email]", err.message);
    let userMsg = "Failed to send email. Check your email configuration.";
    if (err.message?.includes("Invalid login") || err.message?.includes("Username and Password"))
      userMsg = "Authentication failed. Use a Gmail App Password, not your regular password.";
    else if (err.message?.includes("ECONNREFUSED"))
      userMsg = "Cannot connect to email server.";
    return res.status(500).json({ error: userMsg });
  }
}
