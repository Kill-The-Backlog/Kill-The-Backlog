# Kill The Backlog

Self-hosted background agents for your GitHub repos. Connect GitHub, choose a repo and branch, describe the work, and Kill The Backlog runs an agent in a cloud sandbox until it can preview the app, push commits, and open a draft PR.

![Kill The Backlog session](docs/screenshot.png)

Kill The Backlog is built for the "ship it from a prompt" loop: every session gets an isolated [E2B](https://e2b.dev/) VM, a cloned working tree, [opencode](https://opencode.ai/) running headless, realtime session updates in the browser, automatic commits, draft PR creation, and optional live app previews.

## What It Does

- Starts coding sessions from a GitHub repo, base branch, model, and prompt.
- Runs opencode headless inside a per-session E2B sandbox.
- Streams agent messages, reasoning, tool calls, todos, and errors back to the session page in realtime.
- Accepts follow-up prompts in the same session and supports aborting a running turn.
- Commits sandbox changes on idle, pushes a `ktb/<sessionId>` branch, and opens a draft PR on the first commit.
- Keeps the session available after idle by pausing the E2B sandbox instead of deleting it.
- Optionally starts a target repo preview app from `.kill-the-backlog/preview.sh`, shows preview status/logs, and links to the public E2B preview URL.

## Quick Start

Run locally with Docker in under 5 minutes. You'll need [Docker](https://docs.docker.com/get-docker/) and [Node.js 22+](https://nodejs.org/) to build the E2B sandbox template.

### 1. Clone And Configure

```sh
git clone https://github.com/Kill-The-Backlog/Kill-The-Backlog.git
cd Kill-The-Backlog
cp .env.example .env
```

### 2. Create A GitHub OAuth App

1. Go to [Settings > Developer settings > OAuth Apps > New OAuth App](https://github.com/settings/applications/new).
2. Fill in:
   - Application name: `Kill The Backlog` or anything you like.
   - Homepage URL: `http://localhost:3000`.
   - Authorization callback URL: `http://localhost:3000/auth/github/callback`.
3. Click Register application.
4. Copy the Client ID and generate a Client secret.
5. Paste both into `.env`:

```sh
GITHUB_OAUTH_CLIENT_ID=your_client_id
GITHUB_OAUTH_CLIENT_SECRET=your_client_secret
```

### 3. Add AI And Sandbox Keys

Each session boots an E2B sandbox running opencode headless, with Anthropic as the model provider. Add both keys to `.env`:

```sh
ANTHROPIC_API_KEY=your_key
E2B_API_KEY=your_key
```

Both services have free tiers that are enough to try things out. `E2B_TEMPLATE_NAME` is already set to `e2b-template-dev` in `.env.example`; you'll publish a template under that name in the next step.

### 4. Build The E2B Sandbox Template

Sessions launch from a custom E2B template with opencode pre-installed and served over HTTP. Publish it once to your E2B account:

```sh
corepack enable pnpm
pnpm install
pnpm tools:e2b-template e2b:build:dev
```

This takes a few minutes the first time. It tags the template as `e2b-template-dev`, matching `E2B_TEMPLATE_NAME`.

### 5. Start

```sh
docker compose up
```

The first run builds the app image and may take a few minutes. Once you see `Server is running on http://localhost:3000`, open [http://localhost:3000](http://localhost:3000) and sign in with GitHub.

## Preview Apps

Target repositories can opt into live previews by adding this executable script:

```sh
.kill-the-backlog/preview.sh
```

Kill The Backlog runs the script from the cloned repo root after the sandbox finishes bootstrapping. The script should start the app on `KTB_PREVIEW_PORT`, which is currently `5173`.

```sh
#!/usr/bin/env bash
set -euo pipefail

corepack enable pnpm
pnpm install
pnpm dev --host 0.0.0.0 --port "$KTB_PREVIEW_PORT"
```

Preview behavior:

- If `.kill-the-backlog/preview.sh` is missing, the session shows "Preview not configured".
- If the script starts and `http://127.0.0.1:5173/` responds before the timeout, the session shows "Preview ready" and links to `https://5173-<sandboxId>.e2b.app`.
- The session details panel shows preview status, stdout/stderr logs, and a restart action.
- Restart stops the previous preview process when possible, clears the old error, and queues the preview worker again.
- Preview logs are stored on the session and capped to the newest 200 entries.

## Developing

This project uses [Devbox](https://www.jetify.com/devbox) for system-level dependencies: Node.js 22, PostgreSQL 18, Valkey, nginx, mkcert, and the local service runner.

### First-Time Setup

```sh
devbox shell
./setup-devbox.sh
```

Create a GitHub OAuth App with callback URL `https://ktb.localhost/auth/github/callback` and add the credentials to `.env`. A GitHub OAuth App only allows one callback URL, so register a second app if you already created one for the Docker quick start.

Infrastructure variables for the local database, Redis-compatible queue, Zero cache, and origins are set by `process-compose.yaml`.

If you did not already publish the E2B sandbox template during the quick start, do it now:

```sh
devbox run -- 'pnpm tools:e2b-template e2b:build:dev'
```

### Day-To-Day Development

```sh
devbox services up
```

This starts nginx with HTTPS, PostgreSQL, Valkey, the main app, Zero cache, and the marketing site. Open [https://ktb.localhost](https://ktb.localhost).

Useful commands:

```sh
devbox run -- 'pnpm apps:main typecheck'
devbox run -- 'pnpm apps:main lint'
devbox run -- 'pnpm packages:db build'
devbox run -- 'pnpm prisma migrate dev --name your_migration_name'
devbox run -- 'pnpm tools:e2b-template e2b:build:dev'
```

## Architecture

| Component            | Role                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `apps/main`          | React Router 7 + Express app. Hosts GitHub OAuth, session UI, API routes, Zero endpoints, and BullMQ workers. |
| `apps/www`           | Astro marketing site.                                                                                         |
| `packages/db`        | Prisma migrations, generated Kysely types, generated Zero schema, and shared DB helpers.                      |
| `tools/e2b-template` | E2B template that installs opencode and exposes `opencode serve` on port `4096`.                              |
| PostgreSQL           | Source of truth for users, GitHub accounts, sessions, messages, previews, and preferences.                    |
| Valkey               | Redis-compatible backing store for BullMQ queues.                                                             |
| Zero cache           | Realtime sync layer between PostgreSQL and the browser.                                                       |
| E2B sandboxes        | Per-session VMs that hold the cloned repo, opencode state, git branch, and optional preview app.              |

## Deploying

See [docs/deploying.md](docs/deploying.md) for deploying to GKE Autopilot with werf.

## License

[AGPL-3.0-or-later](LICENSE)
