/**
 * lib/auth.js  —  JWT auth helpers
 *
 * Security notes:
 *   - JWT_SECRET MUST be set in .env.local (never hardcoded in production)
 *   - Tokens stored as HttpOnly; SameSite=Lax cookies (not localStorage)
 *   - verifyToken returns null on any error (never throws)
 *   - Passwords are never in the JWT payload
 */
import jwt from "jsonwebtoken";
import { parse } from "cookie";

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE     = "ars_token";
const MAX_AGE    = 60 * 60 * 24 * 7; // 7 days

// Warn loudly in development if secret is not set
if (!JWT_SECRET && process.env.NODE_ENV !== "test") {
  console.warn(
    "[auth] WARNING: JWT_SECRET is not set in environment variables!\n" +
    "       Using a weak default secret. Set JWT_SECRET in .env.local before production."
  );
}

const SECRET = JWT_SECRET || "ars-dev-secret-INSECURE-change-before-deploy";

export function signToken(payload) {
  // Never include password in JWT payload
  const { password, password_hash, ...safe } = payload;
  return jwt.sign(safe, SECRET, { expiresIn: MAX_AGE });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export const setTokenCookie = (t) =>
  `${COOKIE}=${t}; HttpOnly; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

export const clearTokenCookie = () =>
  `${COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;

export function getUserFromRequest(req) {
  try {
    const cookies = parse(req.headers.cookie || "");
    return verifyToken(cookies[COOKIE] || "");
  } catch {
    return null;
  }
}

export function requireAuth(req, res) {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return user;
}
