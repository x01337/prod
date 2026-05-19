# ReplyAI

FAQ auto-response chatbot + scheduling calendar for small businesses.

Built with Next.js 14, PostgreSQL/SQLite, and zero external AI dependencies.

---

## Features

- **FAQ bot** — keyword + Jaccard similarity matching, optional AI fallback
- **Calendar** — week view, drag & drop bookings, working hours
- **Password recovery** — secure email reset flow
- **WhatsApp integration** — official Meta Business API
- **Multi-DB** — SQLite locally, PostgreSQL in production

---

## Quick start (local dev)

```bash
git clone https://github.com/YOUR_USERNAME/replyai.git
cd replyai

npm install
cp .env.example .env
# Edit .env — set JWT_SECRET at minimum

npm run dev
# → http://localhost:3000
```

SQLite auto-creates at `data/ars.db`. No database setup needed for local dev.

---

## Deploy to Railway (recommended — 10 minutes)

Railway runs both the app and the database with minimal setup.

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/replyai.git
git push -u origin main
```

### Step 2 — Create Railway project

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo** → select your repo
3. Railway detects Next.js and starts the first deploy automatically

### Step 3 — Add PostgreSQL

1. In your Railway project, click **+ Add Service** → **Database** → **PostgreSQL**
2. Click on the PostgreSQL service → **Variables** tab
3. Copy the `DATABASE_URL` value

### Step 4 — Set environment variables

In your Railway project → your app service → **Variables** tab, add:

| Variable | Value |
|---|---|
| `JWT_SECRET` | Run `openssl rand -hex 32` and paste the result |
| `DATABASE_URL` | Paste from the PostgreSQL service |
| `SITE_URL` | Your Railway app URL (shown in the Deployments tab) |
| `EMAIL_USER` | Your Gmail address (optional — for password reset emails) |
| `EMAIL_PASS` | Your Gmail App Password (optional) |

### Step 5 — Done

Railway redeploys automatically. Your app is live at the URL shown in the Railway dashboard.

**Auto-deploy on push:** Every `git push` to `main` triggers a new deploy automatically.

---

## Deploy to Vercel

Vercel hosts the Next.js app. You still need an external database.

### Step 1 — Set up database (Supabase — free)

1. Go to [supabase.com](https://supabase.com) → New project
2. Settings → Database → Connection string → URI mode
3. Copy the connection string (starts with `postgresql://`)

### Step 2 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
2. In **Environment Variables**, add:
   - `JWT_SECRET` — `openssl rand -hex 32`
   - `DATABASE_URL` — your Supabase connection string
   - `SITE_URL` — your Vercel app URL (e.g. `https://replyai.vercel.app`)
3. Click **Deploy**

---

## Deploy with Docker (VPS)

If you have a Linux server (DigitalOcean, Hetzner, etc.):

```bash
# On your server
git clone https://github.com/YOUR_USERNAME/replyai.git
cd replyai

cp .env.example .env
nano .env   # set JWT_SECRET and POSTGRES_PASSWORD

npm run docker:build
npm run docker:start
# → http://your-server-ip:3000
```

| Command | Description |
|---|---|
| `npm run docker:build` | Build the Docker image |
| `npm run docker:start` | Start app + PostgreSQL in background |
| `npm run docker:stop` | Stop everything (data is preserved) |
| `npm run docker:logs` | Watch live app logs |
| `npm run docker:reset` | Wipe all data and start fresh |

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | ✅ | `openssl rand -hex 32` |
| `DATABASE_URL` | Production | PostgreSQL connection string |
| `SITE_URL` | Recommended | Your public URL |
| `EMAIL_USER` | Optional | Gmail for password reset emails |
| `EMAIL_PASS` | Optional | Gmail App Password |
| `WHATSAPP_ACCESS_TOKEN` | Optional | Meta WhatsApp Business token |
| `AI_ENABLED` | Optional | `true` to enable AI fallback |
| `AI_API_KEY` | Optional | OpenRouter API key |
| `POSTGRES_PASSWORD` | Docker only | Password for the Postgres container |

---

## Gmail App Password setup

Required for password reset emails to work.

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Security → 2-Step Verification → turn it **on**
3. Security → App Passwords
4. Name it "ReplyAI" → Generate
5. Copy the 16-character code → paste into `EMAIL_PASS` (no spaces)

If email is not configured, reset links are printed to the server console — useful for testing.

---

## Project structure

```
replyai/
├── .github/workflows/     GitHub Actions (CI + auto-deploy)
├── components/
│   └── CalendarView.js    Week planner with drag & drop
├── lib/
│   ├── db.js              SQLite / PostgreSQL abstraction
│   ├── auth.js            JWT helpers
│   ├── matcher.js         FAQ matching engine
│   ├── ai.js              Optional AI fallback
│   ├── ratelimit.js       Rate limiting
│   └── validate.js        Input validation
├── pages/
│   ├── api/               All API routes
│   ├── dashboard.js       Main app
│   ├── login.js
│   ├── register.js
│   ├── forgot-password.js
│   ├── reset-password.js
│   └── verify-email.js
├── public/
│   └── widget.js          Embeddable chat widget
├── styles/globals.css
├── Dockerfile
├── docker-compose.yml
├── .env.example           Template — copy to .env
└── .gitignore
```

---

## License

MIT
