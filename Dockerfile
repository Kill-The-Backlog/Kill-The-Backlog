#
# Base
#
FROM node:22.21-slim AS base

WORKDIR /app

RUN corepack enable pnpm


#
# Builder
#
FROM base AS builder

RUN apt-get update -qq && \
  apt-get install --no-install-recommends -y python3 && \
  rm -rf /var/lib/apt/lists /var/cache/apt/archives

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

COPY . .
RUN pnpm install --frozen-lockfile --offline

RUN pnpm packages:shared build

RUN pnpm packages:db build
RUN pnpm packages:db --prod deploy /db-deployment --legacy

RUN pnpm apps:main build
RUN pnpm apps:main --prod deploy /main-deployment --legacy


#
# Main
#
FROM base AS main

ENV NODE_ENV=production

# Prisma (to run migrations) requires openssl.
RUN apt-get update -qq && \
  apt-get install --no-install-recommends -y openssl && \
  rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Required to run db migrations.
COPY --from=builder /db-deployment /db

COPY --from=builder /main-deployment /app
CMD ["bash", "-c", "(cd /db && exec pnpm prisma migrate deploy) && pnpm start"]
