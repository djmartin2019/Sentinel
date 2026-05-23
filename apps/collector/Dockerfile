# syntax=docker/dockerfile:1
# gRPC telemetry collector — listens on GRPC_PORT (default 50051)

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/collector/package.json apps/collector/
COPY prisma prisma/
RUN pnpm install --frozen-lockfile --filter collector...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/collector/node_modules ./apps/collector/node_modules
COPY --from=deps /app/prisma ./prisma
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/proto packages/proto
COPY apps/collector apps/collector
ENV DATABASE_URL="postgresql://sentinel:sentinel@postgres:5432/sentinel?schema=public"
RUN pnpm exec prisma generate --schema=prisma/schema.prisma
WORKDIR /app/apps/collector
RUN pnpm build

FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/collector ./apps/collector
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/packages/proto ./packages/proto

ENV NODE_ENV=production
WORKDIR /app/apps/collector

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD pgrep -f "node dist/index.js" > /dev/null || exit 1

CMD ["node", "dist/index.js"]
