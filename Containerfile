# syntax=docker/dockerfile:1.7
# Multi-stage build for forkit-site (Next.js 14 + Prisma, standalone output).
# OCI-compatible — works with both Docker and Podman.

# --- deps ---------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
# --legacy-peer-deps: matches local resolution (avoids @types/react@19 drift).
# --ignore-scripts:   skip native USB/Ledger builds; prisma generate is run
#                     explicitly in the builder stage.
RUN npm install --no-audit --no-fund --legacy-peer-deps --ignore-scripts

# --- builder ------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* are baked into the build. Pass them via --build-arg.
ARG NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
ARG NEXT_PUBLIC_SOLANA_NETWORK=devnet
ARG NEXT_PUBLIC_BASE_URL=http://localhost:3000

ENV NEXT_PUBLIC_SOLANA_RPC_URL=${NEXT_PUBLIC_SOLANA_RPC_URL} \
    NEXT_PUBLIC_SOLANA_NETWORK=${NEXT_PUBLIC_SOLANA_NETWORK} \
    NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# --- runner -------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/public/uploads \
    DATABASE_URL=file:/data/forkit.db

RUN addgroup -g 1001 -S nodejs \
 && adduser -u 1001 -S nextjs -G nodejs \
 && mkdir -p /data /app/public/uploads \
 && chown -R nextjs:nodejs /data /app/public/uploads

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma schema + generated client + query engine for runtime migrations.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

USER nextjs
EXPOSE 3000
VOLUME ["/data", "/app/public/uploads"]

# Push schema to the DB on startup so SQLite volumes work out of the box.
# For Postgres, set DATABASE_URL and this is a no-op if the schema matches.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss=false && node server.js"]
