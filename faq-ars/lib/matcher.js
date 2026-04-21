// lib/matcher.js
// Simple keyword + Jaccard-similarity FAQ matcher.
// No embeddings, no external APIs — works 100% offline.

const STOP_WORDS = new Set([
  "a","an","the","is","are","was","were","be","been","being",
  "have","has","had","do","does","did","will","would","could","should",
  "may","might","shall","can","need","dare","ought","used",
  "i","you","he","she","it","we","they","me","him","her","us","them",
  "my","your","his","its","our","their","this","that","these","those",
  "what","which","who","whom","when","where","why","how",
  "and","but","or","nor","for","yet","so","if","then","than","because",
  "as","at","by","in","of","on","to","up","with","about","from","into",
  "not","no","yes","please","tell","explain","give","show",
]);

/**
 * Tokenise a string → meaningful lowercase words
 */
function tokenise(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Jaccard similarity between two token sets
 */
function jaccardScore(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = [...setA].filter((t) => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

/**
 * Bonus: how many query tokens appear in the full FAQ text
 */
function coverageScore(queryTokens, faqTokens) {
  if (queryTokens.length === 0) return 0;
  const faqSet = new Set(faqTokens);
  const hits = queryTokens.filter((t) => faqSet.has(t)).length;
  return hits / queryTokens.length;
}

/**
 * Find the best-matching FAQ for a user query.
 * @param {string} query  – the user's question
 * @param {Array}  faqs   – [{id, question, answer, keywords}]
 * @returns {{ faq, score } | null}
 */
export function findBestMatch(query, faqs) {
  if (!faqs || faqs.length === 0) return null;

  const queryTokens = tokenise(query);
  if (queryTokens.length === 0) return null;
  const querySet = new Set(queryTokens);

  let best = null;
  let bestScore = -1;

  for (const faq of faqs) {
    // Combine question + stored keywords for matching
    const faqText = `${faq.question} ${faq.keywords || ""}`;
    const faqTokens = tokenise(faqText);
    const faqSet = new Set(faqTokens);

    const jac = jaccardScore(querySet, faqSet);
    const cov = coverageScore(queryTokens, faqTokens);

    // Weighted blend: coverage matters more for short queries
    const score = 0.45 * jac + 0.55 * cov;

    if (score > bestScore) {
      bestScore = score;
      best = faq;
    }
  }

  // Require at least one shared token to return a result
  if (bestScore === 0) return null;

  return { faq: best, score: bestScore };
}

/**
 * Extract keywords from a question string (for pre-indexing).
 */
export function extractKeywords(text) {
  return [...new Set(tokenise(text))].join(" ");
}
