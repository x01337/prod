/**
 * lib/validate.js — Unified input validation
 * Password rules: min 8 chars, at least 1 letter, at least 1 number.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TIME_RE  = /^\d{2}:\d{2}$/;
const DATE_RE  = /^\d{4}-\d{2}-\d{2}$/;
const HEX_RE   = /^#[0-9a-fA-F]{6}$/;

export const v = {
  email(val) {
    if (!val || typeof val !== "string") return "Email is required.";
    if (!EMAIL_RE.test(val.trim())) return "Invalid email address.";
    return null;
  },
  password(val) {
    if (!val || typeof val !== "string") return "Password is required.";
    if (val.length < 8) return "Password must be at least 8 characters.";
    if (!/[a-zA-Z]/.test(val)) return "Password must contain at least one letter.";
    if (!/[0-9]/.test(val)) return "Password must contain at least one number.";
    return null;
  },
  name(val, label = "Name", max = 100) {
    if (!val || typeof val !== "string" || !val.trim()) return `${label} is required.`;
    if (val.trim().length > max) return `${label} must be under ${max} characters.`;
    return null;
  },
  text(val, label = "Field", min = 1, max = 2000) {
    if (typeof val !== "string") return `${label} must be a string.`;
    const t = val.trim();
    if (t.length < min) return `${label} is required.`;
    if (t.length > max) return `${label} must be under ${max} characters.`;
    return null;
  },
  price(val) {
    const n = parseFloat(val);
    if (isNaN(n) || n < 0) return "Price must be a positive number.";
    if (n > 99999) return "Price too large.";
    return null;
  },
  duration(val) {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 5) return "Duration must be at least 5 minutes.";
    if (n > 480) return "Duration must be under 480 minutes.";
    return null;
  },
  date(val) {
    if (!val || !DATE_RE.test(val)) return "Invalid date (YYYY-MM-DD).";
    if (isNaN(Date.parse(val))) return "Invalid date.";
    return null;
  },
  time(val, label = "Time") {
    if (!val || !TIME_RE.test(val)) return `Invalid ${label} (HH:MM).`;
    return null;
  },
  color(val) {
    if (!val) return null; // optional
    if (!HEX_RE.test(val)) return "Color must be a hex code like #ff7a00.";
    return null;
  },
};

export function collect(...results) {
  return results.find(Boolean) || null;
}

export function sanitize(str) {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "").trim();
}

/**
 * Password strength scoring (for UI indicator).
 * Returns: { score: 0-4, label: "weak"|"fair"|"good"|"strong", color }
 */
export function passwordStrength(pwd) {
  if (!pwd) return { score: 0, label: "—", color: "#444" };
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;

  if (score <= 1) return { score: 1, label: "Weak",   color: "#ef4444" };
  if (score === 2) return { score: 2, label: "Fair",   color: "#f97316" };
  if (score === 3) return { score: 3, label: "Good",   color: "#eab308" };
  return             { score: 4, label: "Strong", color: "#22c55e" };
}
