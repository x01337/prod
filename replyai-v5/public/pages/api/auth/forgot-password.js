import crypto from "crypto";
import getDb, { dbGet, dbRun } from "../../../lib/db";
import { v } from "../../../lib/validate";
import { rateLimit } from "../../../lib/ratelimit";

const OK = { ok:true, message:"If that email is registered you'll receive a reset link shortly." };

async function sendResetEmail(email, token) {
  const base    = process.env.SITE_URL || "http://localhost:3000";
  const url     = `${base}/reset-password?token=${token}`;
  const user    = process.env.EMAIL_USER;
  const pass    = process.env.EMAIL_PASS;
  if (!user || !pass) { console.log("\n[RESET LINK]", url, "\n"); return; }
  const nodemailer = (await import("nodemailer")).default;
  const t = nodemailer.createTransport({ service:"gmail", auth:{user,pass} });
  await t.sendMail({
    from:`"ReplyAI" <${user}>`, to:email,
    subject:"Reset your ReplyAI password",
    html:`<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0b0b0b;color:#ddd;border-radius:12px">
      <h2 style="color:#fff;margin:0 0 12px">Reset your password</h2>
      <p style="color:#888;margin:0 0 24px">Click below to set a new password. This link expires in 30 minutes.</p>
      <a href="${url}" style="display:inline-block;background:#ff7a00;color:#000;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none">Reset Password →</a>
      <p style="color:#444;font-size:12px;margin-top:24px">If you didn't request this, ignore this email.</p>
    </div>`,
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!rateLimit(req, { limit:3, window:600 })) return res.status(200).json(OK);

  const { email } = req.body || {};
  if (v.email(email)) return res.status(200).json(OK); // invalid email → still 200

  const db   = await getDb();
  const user = await dbGet(db, "SELECT id,email FROM users WHERE email=$1", [email.toLowerCase().trim()]);
  if (user) {
    await dbRun(db, "DELETE FROM password_reset_tokens WHERE user_id=$1 AND used=$2", [user.id, false]);
    const token     = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30*60*1000).toISOString();
    await dbRun(db, "INSERT INTO password_reset_tokens (user_id,token,expires_at) VALUES ($1,$2,$3)", [user.id, token, expiresAt]);
    try { await sendResetEmail(email.toLowerCase().trim(), token); } catch(e) { console.error("[forgot-pw] email error:", e.message); }
  }
  return res.status(200).json(OK);
}
