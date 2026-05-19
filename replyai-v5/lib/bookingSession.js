/**
 * lib/bookingSession.js
 *
 * In-memory store for multi-step booking conversations.
 * Keyed by senderId (WhatsApp/Instagram phone or PSID).
 *
 * Steps:  idle → ask_date → ask_name → done
 *
 * Sessions expire after 30 minutes of inactivity.
 */

const SESSIONS = new Map(); // senderId → session
const TTL_MS = 30 * 60 * 1000; // 30 min

// Anti-spam: max 5 booking attempts per sender per hour
const SPAM = new Map(); // senderId → { count, resetAt }

export function getSession(senderId) {
  const s = SESSIONS.get(senderId);
  if (!s) return null;
  if (Date.now() > s.expiresAt) { SESSIONS.delete(senderId); return null; }
  return s;
}

export function createSession(senderId, lang) {
  const s = { senderId, lang, step: "ask_date", date: null, name: null, expiresAt: Date.now() + TTL_MS };
  SESSIONS.set(senderId, s);
  return s;
}

export function updateSession(senderId, patch) {
  const s = SESSIONS.get(senderId);
  if (!s) return null;
  Object.assign(s, patch, { expiresAt: Date.now() + TTL_MS });
  return s;
}

export function clearSession(senderId) {
  SESSIONS.delete(senderId);
}

// ── Anti-spam ─────────────────────────────────────────────────────────────────
export function isSpam(senderId) {
  const now = Date.now();
  const entry = SPAM.get(senderId);
  if (!entry || now > entry.resetAt) {
    SPAM.set(senderId, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return false;
  }
  entry.count++;
  return entry.count > 5;
}

// ── Date validation ───────────────────────────────────────────────────────────
export function parseDate(text) {
  if (!text) return null;
  const s = text.trim();
  // ISO: 2025-06-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s);
    return isNaN(d) ? null : s;
  }
  // Common: 15/06/2025 or 15.06.2025
  const dmy = s.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})$/);
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2].padStart(2,"0")}-${dmy[1].padStart(2,"0")}`);
    return isNaN(d) ? null : d.toISOString().slice(0, 10);
  }
  // Try native parse (handles "June 15", "15 June 2025", etc.)
  const d = new Date(s);
  if (!isNaN(d) && d.getFullYear() > 2020) return d.toISOString().slice(0, 10);
  return null;
}
