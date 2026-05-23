# syntax=docker/dockerfile:1
# Host telemetry agent — sends metrics to collector via gRPC (no HTTP port)

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/agent/package.json apps/agent/
RUN pnpm install --frozen-lockfile --filter agent...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/agent/node_modules ./apps/agent/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/proto packages/proto
COPY apps/agent apps/agent
WORKDIR /app/apps/agent
RUN pnpm build

FROM node:22-alpine AS runner
RUN apk add --no-cache procps
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/agent ./apps/agent
COPY --from=builder /app/packages/proto ./packages/proto

ENV NODE_ENV=production
WORKDIR /app/apps/agent

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD pgrep -f "node dist/index.js" > /dev/null || exit 1

CMD ["node", "dist/index.js"]
