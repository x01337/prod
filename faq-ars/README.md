# 🤖 ReplyAI — FAQ Auto-Response System

> **Let businesses create an FAQ knowledge base and automatically answer repetitive customer questions — zero AI cost, live in 5 minutes.**

![ReplyAI Dashboard](https://via.placeholder.com/800x400/0f1117/f59e0b?text=ReplyAI+Dashboard)

---

## ✨ Features

- 🔐 **Auth** — Email/password login & register with JWT (HttpOnly cookies)
- 📋 **FAQ Manager** — Create, edit, delete FAQs with optional custom keywords
- 🧠 **Smart Matching** — Keyword + Jaccard similarity (no AI APIs, no cost)
- 💬 **Live Bot Tester** — Chat UI in the dashboard to test responses
- 🧩 **Embed Widget** — Drop a JS snippet on any website (see `public/widget.js`)
- 📱 **Responsive** — Mobile sidebar, works on all screen sizes

---

## 🚀 Quick Start

```bash
# 1. Clone / unzip
cd faq-ars

# 2. Install dependencies (takes ~30s)
npm install

# 3. Set up environment
cp .env.local.example .env.local
# Edit .env.local and set a strong JWT_SECRET

# 4. Run
npm run dev

# 5. Open http://localhost:3000
```

The SQLite database is **auto-created** at `data/ars.db` on first run. No migrations, no setup.

---

## 📁 Project Structure

```
faq-ars/
├── lib/
│   ├── db.js          ← SQLite singleton + auto-schema creation
│   ├── auth.js        ← JWT helpers, cookie management, requireAuth()
│   └── matcher.js     ← Keyword + Jaccard FAQ matching engine
│
├── pages/
│   ├── login.js       ← /login  — split-panel auth page
│   ├── register.js    ← /register
│   └── dashboard.js   ← /dashboard — FAQ manager + bot tester
│
├── pages/api/
│   ├── auth/
│   │   ├── register.js ← POST /api/auth/register
│   │   ├── login.js    ← POST /api/auth/login
│   │   ├── logout.js   ← POST /api/auth/logout
│   │   └── me.js       ← GET  /api/auth/me
│   ├── faqs/
│   │   ├── index.js    ← GET /api/faqs  |  POST /api/faqs
│   │   └── [id].js     ← PUT /api/faqs/:id  |  DELETE /api/faqs/:id
│   └── ask.js          ← POST /api/ask (the auto-response engine)
│
├── public/
│   └── widget.js      ← Embeddable chat widget (drop on any website)
│
├── styles/
│   └── globals.css    ← Tailwind base + custom dark theme
│
└── data/
    └── ars.db         ← Auto-created SQLite file (gitignored)
```

---

## 🧠 How the Matching Works

The matcher in `lib/matcher.js` uses a **two-signal scoring blend** with no external APIs:

```
score = 0.45 × Jaccard(query_tokens, faq_tokens)
      + 0.55 × Coverage(query_tokens, faq_tokens)
```

| Signal | Formula | Good for |
|---|---|---|
| **Jaccard** | shared / total_unique | Precise overlap |
| **Coverage** | query_hits / query_length | Short queries |

**Pipeline:**
1. Strip punctuation, lowercase
2. Remove 60+ stop words (a, the, how, what, is…)
3. Score each FAQ with the blend above
4. Return best match **only if score > 0.08** (configurable in `ask.js`)

**Auto keyword extraction** — when you create a FAQ, keywords are automatically extracted from the question and stored for faster, richer matching. You can also add custom keywords (e.g. `refund return money back cancel`).

---

## 🌐 API Reference

All endpoints return JSON. Auth endpoints set/clear an `ars_token` HttpOnly cookie.

### Auth

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/register` | `{name, email, password}` | Create account |
| POST | `/api/auth/login` | `{email, password}` | Sign in |
| POST | `/api/auth/logout` | — | Clear session |
| GET  | `/api/auth/me` | — | Get current user |

### FAQs (requires auth)

| Method | Endpoint | Body | Description |
|---|---|---|---|
| GET    | `/api/faqs` | — | List all FAQs |
| POST   | `/api/faqs` | `{question, answer, keywords?}` | Create FAQ |
| PUT    | `/api/faqs/:id` | `{question, answer, keywords?}` | Update FAQ |
| DELETE | `/api/faqs/:id` | — | Delete FAQ |

### Auto-Response

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/ask` | `{question}` | Match question (auth cookie) |
| POST | `/api/ask?userId=123` | `{question}` | Match question (public embed) |

**Response:**
```json
{
  "found": true,
  "answer": "We offer full refunds within 30 days…",
  "matchedQuestion": "What is your refund policy?",
  "score": 0.7143,
  "faqId": 12
}
```

---

## 🧩 Embed Widget

Add your FAQ bot to any website in 2 lines:

```html
<script>
  window.ReplyAIConfig = {
    userId: "YOUR_USER_ID",           // find in your DB or profile
    baseUrl: "https://your-app.com",  // your deployed ReplyAI URL
    botName: "Support Bot",           // optional
    accentColor: "#f59e0b",           // optional
    position: "right",                // "right" | "left"
  };
</script>
<script src="https://your-app.com/widget.js" defer></script>
```

The widget is a self-contained IIFE — no frameworks, no dependencies, ~4KB.

---

## ☁️ Deployment

### Option A: Railway (recommended — SQLite persists)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway login
railway init
railway up

# Set env vars in the Railway dashboard:
# JWT_SECRET = <strong random string>
```

### Option B: Vercel (swap SQLite → cloud DB first)
```bash
npm i -g vercel
vercel --prod
```

> ⚠️ Vercel's filesystem is ephemeral. For Vercel, replace `better-sqlite3` with:
> - **[Turso](https://turso.tech)** (LibSQL, free tier) — minimal code change
> - **[PlanetScale](https://planetscale.com)** (MySQL) — swap queries
> - **[Supabase](https://supabase.com)** (PostgreSQL) — swap queries

### Generate a secure JWT secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🗄️ Database Schema

```sql
CREATE TABLE users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT    NOT NULL UNIQUE,
  password   TEXT    NOT NULL,      -- bcrypt hash, cost factor 10
  name       TEXT    NOT NULL DEFAULT '',
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE faqs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question   TEXT    NOT NULL,
  answer     TEXT    NOT NULL,
  keywords   TEXT    NOT NULL DEFAULT '',  -- pre-tokenised, space-separated
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

---

## 🔮 Roadmap

| Priority | Feature | Notes |
|---|---|---|
| 🥇 | CSV bulk import | Upload spreadsheet of Q&A pairs |
| 🥈 | Analytics — unmatched questions | Know what customers ask that you haven't covered |
| 🥉 | OpenAI embedding upgrade | Drop-in replacement for matcher.js |
| 4 | Webhook on no-match | Ping Slack/email when bot can't answer |
| 5 | Public REST API with API keys | Let devs integrate programmatically |
| 6 | Multi-language | `franc` for detection + translation API |
| 7 | Team accounts | Multiple users per FAQ set |

---

## 🛠️ Tech Stack

| | Tool | Why |
|---|---|---|
| **Framework** | Next.js 14 | Single repo for frontend + API, zero config |
| **Database** | SQLite (`better-sqlite3`) | File-based, synchronous, perfect for MVP |
| **Auth** | JWT + bcryptjs | Industry standard, no external service |
| **Styling** | Tailwind CSS | Rapid iteration, no CSS bloat |
| **Fonts** | Syne + DM Sans | Distinctive, professional SaaS feel |

---

## 📄 License

MIT — build whatever you want with it.
