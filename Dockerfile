#
# Base
#
FROM node:24.15-slim AS base

WORKDIR /app

RUN corepack enable pnpm


#
# Builder
#
FROM base AS builder

ENV CI=true

RUN apt-get update -qq && \
  apt-get install --no-install-recommends -y python3 && \
  rm -rf /var/lib/apt/lists /var/cache/apt/archives

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm config set store-dir /pnpm/store
RUN pnpm config set cache-dir /pnpm/cache
RUN pnpm config set prefer-offline true

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    --mount=type=cache,id=pnpm-cache,target=/pnpm/cache \
    pnpm fetch

COPY . .

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    --mount=type=cache,id=pnpm-cache,target=/pnpm/cache \
    pnpm install --frozen-lockfile

RUN pnpm packages:shared build
RUN pnpm packages:db build
RUN pnpm apps:main build

# `deploy --legacy` seems to resolve packages separately from `pnpm fetch`.

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    --mount=type=cache,id=pnpm-cache,target=/pnpm/cache \
    pnpm packages:db --prod deploy /db-deployment --legacy

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    --mount=type=cache,id=pnpm-cache,target=/pnpm/cache \
    pnpm apps:main --prod deploy /main-deployment --legacy


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
CMD ["bash", "-c", "(cd /db && ./node_modules/.bin/prisma migrate deploy) && node server.ts"]
