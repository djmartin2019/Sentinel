# syntax=docker/dockerfile:1
# Next.js dashboard — production build (next build + next start via standalone server)

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/dashboard/package.json apps/dashboard/
COPY apps/api/package.json apps/api/
COPY apps/checker/package.json apps/checker/
COPY apps/collector/package.json apps/collector/
COPY apps/agent/package.json apps/agent/
COPY prisma prisma/
RUN pnpm install --frozen-lockfile --filter dashboard...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/dashboard/node_modules ./apps/dashboard/node_modules
COPY . .
# Prisma generate only needs a valid URL shape; the real URL is set at runtime.
ENV DATABASE_URL="postgresql://sentinel:sentinel@postgres:5432/sentinel?schema=public"
RUN pnpm exec prisma generate --schema=prisma/schema.prisma
WORKDIR /app/apps/dashboard
RUN pnpm build
RUN test -f app/icon.png \
  && test -f app/opengraph-image.png \
  && test -f public/OG-Sentinel.png

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3010
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache curl

COPY --from=builder /app/apps/dashboard/public ./apps/dashboard/public
COPY --from=builder /app/apps/dashboard/.next/standalone ./
COPY --from=builder /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
RUN test -f apps/dashboard/public/OG-Sentinel.png

EXPOSE 3010
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://127.0.0.1:3010/ || exit 1

CMD ["node", "apps/dashboard/server.js"]
