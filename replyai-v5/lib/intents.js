/**
 * lib/intents.js — Intent Detection System
 *
 * Replaces simple keyword triggers with a structured intent engine.
 * Returns: { intent, confidence, lang }
 *
 * Intents: greeting | booking | cancel | faq | unknown
 */

// ── Intent keyword maps (lang → keywords) ────────────────────────────────────

const INTENT_MAP = {
  greeting: {
    en: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "howdy", "greetings", "sup", "what's up"],
    pl: ["cześć", "czesc", "hej", "witaj", "witam", "dzień dobry", "dzien dobry", "siema", "co słychać"],
    pt: ["oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "tudo bem", "salve", "e aí"],
  },
  booking: {
    en: ["book", "booking", "appointment", "reserve", "reservation", "schedule", "slot", "visit", "set up a meeting", "make an appointment", "when can i come", "available"],
    pl: ["rezerwacja", "rezerwację", "zarezerwować", "zapisać", "zapisac", "zapisz", "termin", "terminy", "wizyta", "wizyty", "umówić", "umowic", "umów", "umow", "chcę się umówić", "kiedy mogę przyjść"],
    pt: ["agendar", "agendamento", "agendamentos", "marcar", "marcação", "marcacao", "consulta", "consultas", "horário", "horario", "reservar", "reserva", "disponível", "disponivel", "quando posso vir"],
  },
  cancel: {
    en: ["cancel", "stop", "quit", "exit", "abort", "nevermind", "forget it", "reset", "start over", "no thanks"],
    pl: ["anuluj", "anulować", "stop", "koniec", "zrezygnuj", "zapomnij", "od nowa", "nie chcę", "zrezygnowanie"],
    pt: ["cancelar", "parar", "stop", "desistir", "esquece", "sair", "encerrar", "não quero"],
  },
};

// ── Confidence scoring ────────────────────────────────────────────────────────

/**
 * Calculate a confidence score (0–1) for how well text matches an intent.
 * Uses keyword matching + length normalization.
 */
function scoreIntent(text, keywords) {
  const lower = text.toLowerCase();
  let hits = 0;
  let maxKeywordLen = 0;

  for (const kw of keywords) {
    if (lower.includes(kw)) {
      hits++;
      maxKeywordLen = Math.max(maxKeywordLen, kw.length);
    }
  }

  if (hits === 0) return 0;

  // Confidence boosted by: number of hits, length of matched keyword (phrase > single word)
  const hitScore = Math.min(hits / 2, 1); // cap at 1 for multiple hits
  const lengthBonus = Math.min(maxKeywordLen / 15, 0.3); // longer phrase = more confident
  return Math.min(hitScore + lengthBonus, 1);
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Detect intent from a user message.
 *
 * @param {string} text  - raw user message
 * @param {string} lang  - detected language: "en" | "pl" | "pt"
 * @returns {{ intent: string, confidence: number }}
 *
 * intent: "greeting" | "booking" | "cancel" | "unknown"
 */
export function detectIntent(text, lang = "en") {
  if (!text || typeof text !== "string") {
    return { intent: "unknown", confidence: 0 };
  }

  const sanitized = text.trim();
  if (sanitized.length === 0) {
    return { intent: "unknown", confidence: 0 };
  }

  const results = [];

  for (const [intentName, langMap] of Object.entries(INTENT_MAP)) {
    // Check both detected lang AND English (universal fallback)
    const langKeywords   = langMap[lang]  || [];
    const enKeywords     = langMap["en"]  || [];
    const allKeywords    = [...new Set([...langKeywords, ...enKeywords])];

    const score = scoreIntent(sanitized, allKeywords);
    if (score > 0) {
      results.push({ intent: intentName, confidence: score });
    }
  }

  if (results.length === 0) {
    return { intent: "unknown", confidence: 0 };
  }

  // Return highest confidence intent
  results.sort((a, b) => b.confidence - a.confidence);
  return results[0];
}

/**
 * Quick helpers for common intent checks.
 */
export const isGreeting = (text, lang) => detectIntent(text, lang).intent === "greeting";
export const isBooking  = (text, lang) => detectIntent(text, lang).intent === "booking";
export const isCancel   = (text, lang) => detectIntent(text, lang).intent === "cancel";
