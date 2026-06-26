/**
 * ============================================================
 *  matcher.js  —  ARS FAQ Matching Engine
 * ============================================================
 *
 * Scoring pipeline (no AI, no external APIs):
 *   1. Normalise  – lowercase, strip punctuation
 *   2. Tokenise   – split on whitespace
 *   3. Stopword   – remove common words
 *   4. Synonyms   – expand every token with known aliases
 *   5. Score      – for each FAQ compute a blended score:
 *        • keywordOverlap  – Jaccard on expanded token sets
 *        • coverage        – fraction of query tokens found in FAQ
 *        • bigramBonus     – consecutive-word phrase matches
 *        • titleWeight     – matches on original (un-stopworded) question
 *   6. Threshold  – only return a result if score ≥ MIN_SCORE
 *
 * ============================================================
 */

// ── 1. STOPWORDS ──────────────────────────────────────────────────────────────
const STOPWORDS = new Set([
  "a","an","the","is","are","was","were","be","been","being",
  "have","has","had","do","does","did","will","would","could","should",
  "may","might","shall","can","need","ought","used",
  "i","you","he","she","it","we","they","me","him","her","us","them",
  "my","your","his","its","our","their","this","that","these","those",
  "what","which","who","whom","when","where","why","how",
  "and","but","or","nor","for","yet","so","if","then","than","because",
  "as","at","by","in","of","on","to","up","with","about","from","into",
  "not","no","yes","please","tell","explain","give","show","want","need",
  "get","make","go","let","put","set","use","find","look",
  "there","here","now","just","also","very","really","actually","like",
  "ok","okay","hi","hello","hey","thanks","thank","help","me","please",
  // Polish stopwords
  "i","w","z","na","do","się","że","to","nie","jest","są","jak",
  "co","czy","już","po","ale","też","tak","więc","przez","o","ze",
  "przy","dla","czy","pan","pani","prosze","proszę","dziękuję",
  "dziekuje","cześć","hej","witam","chcę","chce","chciałbym","chciałabym",
]);

// ── 2. SYNONYM DICTIONARY ─────────────────────────────────────────────────────
// Format: canonical_word → [aliases]
// During expansion, aliases also map BACK to the canonical word.
// This means "forgot" will match "reset" entries and vice-versa.
const SYNONYMS_RAW = {
  // Account / Auth
  "reset":       ["forgot", "recover", "restore", "change", "update", "fix"],
  "password":    ["pass", "passwd", "passphrase", "credentials", "login", "credential", "pwd"],
  "account":     ["profile", "user", "membership", "subscription"],
  "login":       ["sign in", "signin", "log in", "logon", "authenticate", "access"],
  "register":    ["sign up", "signup", "create account", "join", "enroll", "new account"],
  "logout":      ["sign out", "signout", "log out", "exit"],

  // Commerce
  "buy":         ["purchase", "order", "get", "acquire", "shop", "checkout"],
  "price":       ["cost", "fee", "charge", "rate", "pricing", "payment", "how much", "tariff"],
  "refund":      ["return", "money back", "reimburse", "reimbursement", "cancel", "chargeback", "money", "back", "repay"],
  "discount":    ["coupon", "promo", "code", "offer", "deal", "voucher", "sale", "promotion"],
  "shipping":    ["delivery", "deliver", "dispatch", "send", "transit", "track", "arrive"],

  // Support
  "contact":     ["reach", "support", "help", "email", "call", "chat", "speak", "talk"],
  "delete":      ["remove", "cancel", "erase", "terminate", "close", "deactivate"],
  "update":      ["edit", "change", "modify", "alter", "fix", "correct"],
  "error":       ["problem", "issue", "bug", "fault", "broken", "fail", "crash", "wrong"],
  "slow":        ["lag", "performance", "speed", "fast", "quick", "loading"],

  // Product
  "feature":     ["functionality", "option", "capability", "tool", "function"],
  "free":        ["trial", "demo", "gratis", "no cost", "without paying", "complimentary"],
  "plan":        ["tier", "subscription", "package", "pricing"],
  "upgrade":     ["improve", "premium", "pro", "paid", "advanced"],
  "integrate":   ["connect", "sync", "link", "api", "webhook"],

  // Time
  "cancel":      ["stop", "terminate", "end", "quit", "discontinue"],
  "hours":       ["schedule", "timing", "open", "available", "when", "time"],
};

// Build a flat token → Set(synonyms+self) lookup (bidirectional)
const SYNONYM_MAP = new Map(); // token → Set of equivalent tokens

function buildSynonymMap() {
  for (const [canonical, aliases] of Object.entries(SYNONYMS_RAW)) {
    const group = new Set([canonical, ...aliases.map(normaliseWord)]);
    for (const word of group) {
      if (!SYNONYM_MAP.has(word)) SYNONYM_MAP.set(word, new Set());
      for (const sibling of group) SYNONYM_MAP.get(word).add(sibling);
    }
  }
}

function normaliseWord(w) {
  return w.toLowerCase().replace(/[^a-z0-9]/g, "");
}

buildSynonymMap();

// ── 3. NORMALISE & TOKENISE ────────────────────────────────────────────────────

/**
 * Turn raw text into a clean array of meaningful tokens.
 * Returns: { raw: string[], filtered: string[] }
 *   raw       – all tokens (no stopword removal — used for phrase matching)
 *   filtered  – stopwords removed (used for scoring)
 */
function tokenise(text) {
  const raw = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const filtered = raw.filter((w) => w.length > 1 && !STOPWORDS.has(w));
  return { raw, filtered };
}

// ── 4. SYNONYM EXPANSION ──────────────────────────────────────────────────────

/**
 * For each token in the array, add every synonym.
 * Returns a flat Set of all tokens (original + expanded).
 */
function expandTokens(tokens) {
  const expanded = new Set(tokens);
  for (const t of tokens) {
    const syns = SYNONYM_MAP.get(t);
    if (syns) for (const s of syns) expanded.add(s);
  }
  return expanded;
}

// ── 5. BIGRAM EXTRACTION ──────────────────────────────────────────────────────

/** Extract consecutive word-pairs from a token array. */
function bigrams(tokens) {
  const bg = new Set();
  for (let i = 0; i < tokens.length - 1; i++) {
    bg.add(`${tokens[i]}__${tokens[i + 1]}`);
  }
  return bg;
}

// ── 6. SCORING ────────────────────────────────────────────────────────────────

const MIN_SCORE = 0.12; // minimum confidence to return a result

/**
 * Compute a 0..1 score for how well `queryTokens` match `faqText`.
 *
 * @param {string[]} qFiltered   – filtered query tokens
 * @param {Set}      qExpanded   – synonym-expanded query token set
 * @param {string[]} qRaw        – raw (un-filtered) query tokens
 * @param {string}   faqQuestion – the FAQ question text
 * @param {string}   faqKeywords – pre-stored keyword string
 */
function scoreFaq(qFiltered, qExpanded, qRaw, faqQuestion, faqKeywords) {
  // Combine FAQ question + stored keywords for matching surface
  const faqText = `${faqQuestion} ${faqKeywords}`;
  const { raw: faqRaw, filtered: faqFiltered } = tokenise(faqText);
  const faqExpanded = expandTokens(faqFiltered);

  if (qExpanded.size === 0 || faqExpanded.size === 0) return 0;

  // ── a) Jaccard on expanded sets
  const intersection = [...qExpanded].filter((t) => faqExpanded.has(t)).length;
  const union = new Set([...qExpanded, ...faqExpanded]).size;
  const jaccard = intersection / union;

  // ── b) Coverage: how many query filtered tokens appear in faq expanded set
  const coverageHits = qFiltered.filter((t) => {
    if (faqExpanded.has(t)) return true;
    // Check if any synonym of this token is in faqExpanded
    const syns = SYNONYM_MAP.get(t);
    if (syns) for (const s of syns) if (faqExpanded.has(s)) return true;
    return false;
  }).length;
  const coverage = qFiltered.length > 0 ? coverageHits / qFiltered.length : 0;

  // ── c) Bigram bonus: consecutive-word matches reward phrase similarity
  const qBigrams = bigrams(qRaw);
  const faqBigrams = bigrams(faqRaw);
  let bigramHits = 0;
  for (const bg of qBigrams) if (faqBigrams.has(bg)) bigramHits++;
  const bigramBonus = qBigrams.size > 0 ? bigramHits / qBigrams.size : 0;

  // ── d) Exact-phrase bonus: does the faq question contain a contiguous
  //       subsequence of 2+ query words?
  let phraseBonus = 0;
  if (qRaw.length >= 2) {
    const faqStr = faqQuestion.toLowerCase().replace(/[^\w\s]/g, " ");
    for (let len = Math.min(qRaw.length, 4); len >= 2; len--) {
      for (let start = 0; start <= qRaw.length - len; start++) {
        const phrase = qRaw.slice(start, start + len).join(" ");
        if (faqStr.includes(phrase)) {
          phraseBonus = len / qRaw.length;
          break;
        }
      }
      if (phraseBonus > 0) break;
    }
  }

  // ── Final blend
  // Coverage is the most reliable signal for short queries.
  // Jaccard rewards symmetric overlap.
  // Bigram/phrase bonuses reward word-order similarity.
  const score =
    0.35 * jaccard +
    0.40 * coverage +
    0.15 * bigramBonus +
    0.10 * phraseBonus;

  return score;
}

// ── 7. PUBLIC API ─────────────────────────────────────────────────────────────

/**
 * Pre-index: extract and store keywords for a FAQ question.
 * Call this when creating/updating a FAQ so search is richer.
 */
export function extractKeywords(text) {
  const { filtered } = tokenise(text);
  const expanded = expandTokens(filtered);
  return [...expanded].join(" ");
}

/**
 * Find the best-matching FAQ for a user query.
 *
 * @param {string} query   – the user's question
 * @param {Array}  faqs    – [{ id, question, answer, keywords }]
 * @returns {{ faq, score } | null}
 */
export function findBestMatch(query, faqs) {
  if (!faqs || faqs.length === 0) return null;

  const { raw: qRaw, filtered: qFiltered } = tokenise(query);
  if (qFiltered.length === 0) return null;

  const qExpanded = expandTokens(qFiltered);

  let bestFaq = null;
  let bestScore = -1;

  for (const faq of faqs) {
    const score = scoreFaq(
      qFiltered,
      qExpanded,
      qRaw,
      faq.question || "",
      faq.keywords || ""
    );
    if (score > bestScore) {
      bestScore = score;
      bestFaq = faq;
    }
  }

  if (bestScore < MIN_SCORE) return null;

  return { faq: bestFaq, score: bestScore };
}

// ── 8. SELF-TEST (run with: node lib/matcher.js) ──────────────────────────────
// Only executes when run directly, not when imported.
if (typeof process !== "undefined" && process.argv[1]?.includes("matcher")) {
  const testFaqs = [
    {
      id: 1,
      question: "How do I reset my password?",
      answer: "Click 'Forgot password' on the login page and follow the instructions.",
      keywords: extractKeywords("How do I reset my password?"),
    },
    {
      id: 2,
      question: "What is your refund policy?",
      answer: "We offer full refunds within 30 days of purchase.",
      keywords: extractKeywords("What is your refund policy?"),
    },
    {
      id: 3,
      question: "How do I contact support?",
      answer: "Email us at support@example.com or use the live chat.",
      keywords: extractKeywords("How do I contact support?"),
    },
    {
      id: 4,
      question: "Do you offer a free trial?",
      answer: "Yes! You get 14 days free, no credit card required.",
      keywords: extractKeywords("Do you offer a free trial?"),
    },
    {
      id: 5,
      question: "How much does the Pro plan cost?",
      answer: "The Pro plan is $29/month billed monthly, or $19/month billed annually.",
      keywords: extractKeywords("How much does the Pro plan cost?"),
    },
    {
      id: 6,
      question: "How do I cancel my subscription?",
      answer: "Go to Settings → Billing → Cancel Subscription.",
      keywords: extractKeywords("How do I cancel my subscription?"),
    },
    {
      id: 7,
      question: "Is there a mobile app?",
      answer: "Yes, available on iOS and Android.",
      keywords: extractKeywords("Is there a mobile app?"),
    },
    {
      id: 8,
      question: "How do I delete my account?",
      answer: "Contact support@example.com to permanently delete your account.",
      keywords: extractKeywords("How do I delete my account?"),
    },
  ];

  const tests = [
    // Expected matches
    ["I forgot my password",                   1],
    ["How can I change my credentials?",        1],
    ["Can I get my money back?",                2],
    ["I want a return",                         2],
    ["How do I reach customer service?",        3],
    ["I need help, who can I call?",            3],
    ["Is there a demo version?",               4],
    ["trial for free?",                        4],
    ["What does the pro plan charge per month?",5],
    ["How much does it cost?",                 5],
    ["I want to stop my subscription",         6],
    ["terminate my account billing",           6],
    ["do you have an app for my phone?",       7],
    ["remove my profile permanently",          8],
    // Should NOT match
    ["asdfjkl qwerty",                        null],
    ["",                                      null],
  ];

  let passed = 0; let failed = 0;
  console.log("\n── MATCHER SELF-TEST ─────────────────────────────────\n");
  for (const [q, expectedId] of tests) {
    const result = findBestMatch(q, testFaqs);
    const gotId = result?.faq?.id ?? null;
    const ok = gotId === expectedId;
    if (ok) passed++; else failed++;
    const mark = ok ? "✓" : "✗";
    const scoreStr = result ? ` (score ${result.score.toFixed(3)})` : " (no match)";
    const expected = expectedId ? `FAQ#${expectedId}` : "no match";
    const got      = gotId     ? `FAQ#${gotId}`       : "no match";
    if (!ok) {
      console.log(`${mark} "${q}"\n    expected ${expected}, got ${got}${scoreStr}`);
    } else {
      console.log(`${mark} "${q}"${scoreStr}`);
    }
  }
  console.log(`\n── Results: ${passed}/${passed + failed} passed ────────────────\n`);
}
