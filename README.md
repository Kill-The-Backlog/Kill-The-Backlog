# Kill The Backlog

AI-powered kanban board for your GitHub repos. Create cards, and an AI agent picks them up and opens PRs with real code changes.

![Kill The Backlog screenshot](docs/screenshot.png)

## Quick Start

Run locally with Docker in under 5 minutes. The only prerequisite is [Docker](https://docs.docker.com/get-docker/).

### 1. Clone and configure

```sh
git clone https://github.com/Kill-The-Backlog/Kill-The-Backlog.git
cd Kill-The-Backlog
cp .env.example .env
```

### 2. Create a GitHub OAuth App

1. Go to [**Settings → Developer settings → OAuth Apps → New OAuth App**](https://github.com/settings/applications/new)
2. Fill in:
   - **Application name:** Kill The Backlog (or anything you like)
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/auth/github/callback`
3. Click **Register application**
4. Copy the **Client ID** and generate a **Client secret**
5. Paste both into your `.env`:

```
GITHUB_OAUTH_CLIENT_ID=your_client_id
GITHUB_OAUTH_CLIENT_SECRET=your_client_secret
```

### 3. Start

```sh
docker compose up
```

The first run builds the app image and may take a few minutes. Once you see `Server is running on http://localhost:3000`, open [**http://localhost:3000**](http://localhost:3000) and sign in with GitHub.

### Recommended: AI card runs

The core idea of Kill The Backlog is that you create a card and an AI agent picks it up, works on it in a sandboxed environment, and pushes a branch. Without AI card runs the app is just a kanban board.

Right now card runs use **[Anthropic](https://console.anthropic.com/)** (Claude Code does the coding) and **[E2B](https://e2b.dev/)** (cloud sandboxes where the repo is cloned and the agent executes). Support for other models and sandbox providers is planned.

Add both keys to your `.env`:

```
ANTHROPIC_API_KEY=your_key
E2B_API_KEY=your_key
```

Then restart with `docker compose up`. Both services have free tiers that are enough to try things out.

---

## Developing

### With Devbox (recommended)

This project uses [Devbox](https://www.jetify.com/devbox) to manage system-level dependencies (Node.js 22, PostgreSQL 18, Valkey, nginx, mkcert).

#### First-time setup

```sh
devbox shell
./setup-devbox.sh
```

Create a GitHub OAuth App with callback URL `https://ktb.localhost/auth/github/callback` and add the credentials to your `.env`. Infrastructure variables (DB URL, Redis, Zero, etc.) are set automatically by `process-compose.yaml`.

#### Day-to-day development

```sh
devbox services up
```

This starts nginx (HTTPS), PostgreSQL, Valkey, the app, Zero cache, and the marketing site. Open [**https://ktb.localhost**](https://ktb.localhost).

### With Docker + local Node

If you prefer not to use Devbox, you can run infrastructure in Docker and the app locally:

```sh
docker compose up postgres valkey -d
```

Add these to your `.env` (alongside the GitHub OAuth credentials from the quick start):

```sh
DB_URL=postgres://ktb:ktb@localhost:5432/ktb
GITHUB_OAUTH_REDIRECT_URI=http://localhost:5173/auth/github/callback
MAIN_ORIGIN=http://localhost:5173
REDIS_URL=redis://localhost:6379
ZERO_CACHE_URL=http://localhost:4848
```

Then install dependencies, run migrations, and start the dev server:

```sh
corepack enable pnpm
pnpm install
pnpm turbo build
pnpm prisma migrate deploy
pnpm apps:main dev
```

> **Note:** This setup doesn't include Zero cache, so board updates won't appear in realtime (a page refresh will pick them up). Use Devbox for the full experience.

---

## Architecture

| Component                       | Role                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------- |
| **Main app** (`apps/main`)      | React Router 7 + Express. Kanban UI, GitHub OAuth, BullMQ workers                 |
| **Marketing site** (`apps/www`) | Astro static site                                                                 |
| **PostgreSQL**                  | Primary database (Prisma migrations, Kysely queries)                              |
| **Valkey**                      | Redis-compatible store for BullMQ job queues                                      |
| **Zero cache**                  | [Rocicorp Zero](https://zero.rocicorp.dev) — realtime sync between DB and browser |

---

## Deploying

See [docs/deploying.md](docs/deploying.md) for deploying to GKE Autopilot with werf.

---

Why do programmers prefer dark mode? Because light attracts bugs.
