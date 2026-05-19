# ─── Stage 1: Install deps ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args become env vars during build only
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ─── Stage 3: Production runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Port Next.js listens on inside container
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy only what's needed to run
COPY --from=builder /app/public        ./public
COPY --from=builder /app/.next/standalone  ./
COPY --from=builder /app/.next/static  ./.next/static

# SQLite data directory (persisted via volume when DATABASE_URL not set)
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Give nextjs user ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
