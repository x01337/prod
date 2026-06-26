# ReplyAI SaaS — Production-Ready AI Assistant

> Multi-tenant AI chatbot that answers messages and books clients automatically.
> Supports WhatsApp, web chat, and Instagram. Multi-language (EN / PL / PT-BR).

---

## Architecture

```
CHANNELS:  WhatsApp Cloud API · Web Widget · /chat/[userId]
                          │
PIPELINE:
  1. Receive message
  2. Deduplicate (in-memory Set, 5min TTL)
  3. detectLanguage()   → en | pl | pt
  4. detectIntent()     → greeting | booking | cancel | unknown
  5. Route:
       greeting → t("welcome_dm")
       booking  → BookingFlow state machine (ask_date → ask_name → done)
       cancel   → clearSession() + confirm
       other    → findBestMatch() → getAIAnswer() → fallback
  6. logMessage()          (every message, incoming + outgoing)
  7. logMissedMessage()    (score < threshold → review in dashboard)
  8. enqueue(sendFn)       (retry queue: 3 attempts, exponential backoff)
                          │
DATABASE:  SQLite (dev) · PostgreSQL (prod: Supabase / Neon / Railway)
```

---

## Database Schema

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, name TEXT DEFAULT '',
  plan TEXT DEFAULT 'free', booksy_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE faqs (
  id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL, answer TEXT NOT NULL,
  keywords TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE appointments (
  id SERIAL PRIMARY KEY, user_id INTEGER DEFAULT 1,
  client_name TEXT, phone TEXT, date TEXT,
  language TEXT DEFAULT 'en', source TEXT DEFAULT 'web',
  status TEXT DEFAULT 'confirmed', created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NEW: Every message logged (incoming + outgoing)
CREATE TABLE messages (
  id SERIAL PRIMARY KEY, user_id INTEGER DEFAULT 1,
  phone TEXT, text TEXT, type TEXT DEFAULT 'incoming',
  language TEXT DEFAULT 'en', intent TEXT DEFAULT 'unknown',
  source TEXT DEFAULT 'web', created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NEW: Unanswered questions for FAQ improvement
CREATE TABLE missed_messages (
  id SERIAL PRIMARY KEY, user_id INTEGER DEFAULT 1,
  phone TEXT, text TEXT, language TEXT DEFAULT 'en',
  source TEXT DEFAULT 'web', created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## New Files Added

| File | Purpose |
|------|---------|
| `lib/intents.js` | Intent detection: greeting / booking / cancel / unknown |
| `lib/queue.js` | Message send queue with retry + exponential backoff |
| `pages/chat/[userId].js` | Public chat page per business |
| `pages/booking.js` | Public booking form (EN/PL/PT, ?userId=) |
| `pages/api/messages.js` | GET message log (with type/lang/intent filters) |
| `pages/api/missed.js` | GET/DELETE missed messages |

## Updated Files

| File | Changes |
|------|---------|
| `lib/db.js` | Added messages, missed_messages tables; logMessage(), logMissedMessage(), isSlotAvailable() |
| `lib/bookingFlow.js` | Uses detectIntent(), logs all messages, checks slot availability, cancel resets session |
| `pages/api/whatsapp/webhook.js` | Full pipeline: dedup, intent, queue, logging, missed messages |
| `pages/api/public/ask.js` | Logs all messages, saves missed messages |
| `pages/dashboard.js` | Added Messages Log tab + Missed Messages tab |

---

## Test Cases

### 1. Greeting
```
"hi" → "Hi! 👋 Thanks for your message! Want to book? Type 'booking' 📅"
"cześć" → Polish greeting
"oi" → Portuguese greeting
```

### 2. Full Booking Flow
```
"book" → "What date do you prefer?"
"2025-06-15" → (checks slot) → "What is your name?"
"John Smith" → "Booking confirmed ✅" (saved to DB)
```

### 3. Cancel Flow
```
"book" → "What date do you prefer?"
"cancel" → "No problem, booking cancelled. How can I help? 😊"
```

### 4. Slot Full
```
"book" → "What date do you prefer?"
"2025-06-15" (full) → "Sorry, 2025-06-15 is fully booked. Please choose another date."
```

### 5. FAQ Answer
```
"how do I reset my password" → matcher returns answer (score > 0.3)
```

### 6. Unknown → Missed
```
"xyzzy nonsense" → fallback message → saved to missed_messages → visible in dashboard
```

---

## Deployment (Vercel + Neon PostgreSQL)

### Step 1 — Get a database
1. Sign up at [neon.tech](https://neon.tech) (free tier)
2. Create a new project
3. Copy the connection string: `postgres://user:pass@host/dbname`

### Step 2 — Deploy
```bash
npm install -g vercel
vercel deploy --prod
```

### Step 3 — Set environment variables in Vercel dashboard
```
DATABASE_URL               = postgres://... (from Neon)
JWT_SECRET                 = <openssl rand -hex 32>
WHATSAPP_VERIFY_TOKEN      = any-secret-string
WHATSAPP_ACCESS_TOKEN      = from Meta Developer panel
WHATSAPP_PHONE_NUMBER_ID   = from Meta Developer panel
SLOT_LIMIT                 = 5
AI_ENABLED                 = false
AI_API_KEY                 = (optional, from openrouter.ai)
SITE_URL                   = https://your-domain.vercel.app
```

### Step 4 — Connect WhatsApp
1. Go to [developers.facebook.com](https://developers.facebook.com) → Your App → WhatsApp → Configuration
2. Callback URL: `https://your-domain.vercel.app/api/whatsapp/webhook`
3. Verify Token: same as `WHATSAPP_VERIFY_TOKEN`
4. Subscribe to: **messages**

### Step 5 — First run
1. Visit `/register` → create your business account
2. Dashboard → FAQ Manager → add your FAQs
3. Settings → optionally add Booksy URL
4. Share your public chat: `/chat/YOUR_USER_ID`
5. Share booking form: `/booking?userId=YOUR_USER_ID`

---

## Embed Widget

```html
<script src="https://yourdomain.com/widget.js" data-user-id="YOUR_ID"></script>
```

Auto-detects PL and PT, responds in the correct language.

---

## Multi-Tenant Extension

To give each business their own WhatsApp number:
```sql
ALTER TABLE users ADD COLUMN whatsapp_phone_id TEXT DEFAULT '';
```

Update `resolveUserId()` in `webhook.js`:
```js
const user = await dbGet(db, "SELECT id FROM users WHERE whatsapp_phone_id=$1", [phoneNumberId]);
return user?.id || 1;
```

---

## Production Notes

- Sessions and rate-limiter are in-memory — reset on Vercel cold starts
- For true persistence at scale: migrate to Redis (Upstash) for sessions + rate limits
- Queue is in-memory — for guaranteed delivery at scale: use BullMQ + Redis
- DB connections are pooled (max 10) — works well on Vercel serverless
