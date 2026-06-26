/**
 * lib/ai.js  —  Optional AI fallback layer
 *
 * When AI_ENABLED=true and AI_API_KEY is set, low-confidence matcher
 * results are escalated to an OpenRouter-compatible API (free models).
 *
 * DEFAULT = local matcher only (zero cost, zero latency).
 *
 * Usage:
 *   import { getAIAnswer } from '../lib/ai';
 *   const reply = await getAIAnswer(question, faqs, matcherResult);
 */

const AI_ENABLED = process.env.AI_ENABLED === "true";
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "mistralai/mistral-7b-instruct:free";
const AI_THRESHOLD = 0.30; // escalate if matcher score is below this

/**
 * Build a compact FAQ context string for the AI prompt.
 * We keep it short to avoid token waste.
 */
function buildFaqContext(faqs) {
  return faqs
    .slice(0, 20) // cap at 20 FAQs to stay within context limits
    .map((f, i) => `Q${i + 1}: ${f.question}\nA${i + 1}: ${f.answer}`)
    .join("\n\n");
}

/**
 * Call OpenRouter (or any OpenAI-compatible endpoint) with the FAQ context.
 * Returns the answer string, or null on failure.
 */
async function callAI(question, faqs, lang = "en") {
  if (!AI_API_KEY) return null;
  const faqContext = buildFaqContext(faqs);
  const systemPrompt = `You are a customer support assistant. Answer ONLY using the FAQ entries below.
If the question is not covered by any FAQ, reply exactly: "I don't have information about that."
Be concise and friendly. Do not make up information.
${lang === "pl" ? "IMPORTANT: Always respond in Polish language." : "Always respond in English."}

FAQs:
${faqContext}`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`,
        "HTTP-Referer": process.env.SITE_URL || "https://replyai.app",
        "X-Title": "ReplyAI",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 200,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text || text === "I don't have information about that.") return null;
    return text;
  } catch {
    return null;
  }
}

/**
 * Main entry point.
 *
 * @param {string} question        — user's raw question
 * @param {Array}  faqs            — all user FAQs
 * @param {{ faq, score } | null} matcherResult — result from findBestMatch()
 * @param {string} lang — "en" | "pl"
 *
 * @returns {{ answer: string, source: 'matcher'|'ai'|'fallback', score: number }}
 */
export async function getAIAnswer(question, faqs, matcherResult, lang = "en") {
  const FALLBACK_MSG = lang === "pl"
    ? "Nie znalazłem odpowiedzi na to pytanie 😔 Spróbuj inaczej lub skontaktuj się z nami."
    : "Sorry, I couldn't find a clear answer to that 😔 — try rephrasing, or contact us directly.";

  // 1. Matcher found a confident answer → return it immediately
  if (matcherResult && matcherResult.score >= AI_THRESHOLD) {
    return {
      answer: matcherResult.faq.answer,
      matchedQuestion: matcherResult.faq.question,
      score: matcherResult.score,
      source: "matcher",
    };
  }

  // 2. Low confidence or no match → try AI if enabled
  if (AI_ENABLED && faqs.length > 0) {
    const aiAnswer = await callAI(question, faqs, lang);
    if (aiAnswer) {
      return {
        answer: aiAnswer,
        matchedQuestion: null,
        score: 0.5, // synthetic confidence for AI answers
        source: "ai",
      };
    }
  }

  // 3. Matcher had a weak match but AI is off — still return it if score > 0.12
  if (matcherResult && matcherResult.score >= 0.12) {
    return {
      answer: matcherResult.faq.answer,
      matchedQuestion: matcherResult.faq.question,
      score: matcherResult.score,
      source: "matcher",
    };
  }

  // 4. Complete fallback
  return {
    answer: FALLBACK_MSG,
    matchedQuestion: null,
    score: 0,
    source: "fallback",
  };
}
