# syntax=docker/dockerfile:1
# Express API — compiled TypeScript, long-running Node process

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/dashboard/package.json apps/dashboard/
COPY apps/checker/package.json apps/checker/
COPY apps/collector/package.json apps/collector/
COPY apps/agent/package.json apps/agent/
RUN pnpm install --frozen-lockfile --filter api...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api apps/api
WORKDIR /app/apps/api
RUN pnpm build
WORKDIR /app
RUN pnpm deploy --filter=api --prod --legacy /prod/api

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4010

RUN apk add --no-cache curl

COPY --from=builder /prod/api ./

EXPOSE 4010
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://127.0.0.1:4010/health || exit 1

CMD ["node", "dist/index.js"]
