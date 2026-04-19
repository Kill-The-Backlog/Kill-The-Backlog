# e2b-template — opencode headless

An E2B sandbox template that runs [opencode](https://opencode.ai) in headless
`serve` mode. The template exposes opencode's HTTP API (including its `/event`
SSE stream) directly; the worker subscribes to live events and re-hydrates
any missed state by fetching a snapshot of `/session/:id/message` on every
(re)connect.

## Ports

| Service  | Port | Notes                                                 |
| -------- | ---- | ----------------------------------------------------- |
| opencode | 4096 | Bound on `0.0.0.0`. Full opencode HTTP API available. |

## Prerequisites

- An E2B account (sign up at [e2b.dev](https://e2b.dev))
- `E2B_API_KEY` set in your environment
- Node.js installed locally (to run the builder)

## Building

```bash
# Dev image (tagged "e2b-template-dev")
pnpm tools:e2b-template e2b:build:dev

# Prod image (tagged "e2b-template")
pnpm tools:e2b-template e2b:build:prod
```

## Using the template

```ts
import { Sandbox } from "e2b";

const sandbox = await Sandbox.create("e2b-template");

const opencodeUrl = `https://${sandbox.getHost(4096)}`;

// Hit opencode's API directly for everything: sessions, prompts, events, etc.
await fetch(`${opencodeUrl}/session`, { method: "POST" /* ... */ });

// Subscribe to the live SSE stream. Note: opencode's /event does not support
// Last-Event-ID or replay — clients must re-read `/session/:id/message` on
// reconnect to recover any events missed while disconnected.
const es = new EventSource(`${opencodeUrl}/event`);
```

## Template files

- `template.ts` — E2B Template definition (base image, install steps, start cmd)
- `build.dev.ts` / `build.prod.ts` — Build entrypoints
