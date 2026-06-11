# syntax=docker/dockerfile:1
# Background retention worker — internal-only, no HTTP port

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/retention/package.json apps/retention/
COPY apps/checker/package.json apps/checker/
COPY apps/dashboard/package.json apps/dashboard/
COPY apps/api/package.json apps/api/
COPY apps/collector/package.json apps/collector/
COPY apps/agent/package.json apps/agent/
COPY prisma prisma/
RUN pnpm install --frozen-lockfile --filter retention...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/retention/node_modules ./apps/retention/node_modules
COPY --from=deps /app/prisma ./prisma
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/retention apps/retention
ENV DATABASE_URL="postgresql://sentinel:sentinel@postgres:5432/sentinel?schema=public"
RUN pnpm exec prisma generate --schema=prisma/schema.prisma
WORKDIR /app/apps/retention
RUN pnpm build

FROM node:22-alpine AS runner
RUN apk add --no-cache procps openssl
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/retention ./apps/retention
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production
WORKDIR /app/apps/retention

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD pgrep -f "node dist/index.js" > /dev/null || exit 1

CMD ["node", "dist/index.js"]
