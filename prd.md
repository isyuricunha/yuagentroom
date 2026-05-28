# AgentRoom — Product Requirements Document

**Version:** 0.1 — draft
**License:** Apache-2.0
**Repo:** `isyuricunha/agentroom`
**Image:** `ghcr.io/isyuricunha/agentroom`

---

## 1. Overview

A self-hosted web platform where multiple LLM agents — each with their own personality and context — are placed in "rooms" and talk to each other autonomously in real time. The user creates agents, creates rooms, adds whoever they want, fires up the conversation, and watches it unfold like a group chat.

Connects to any OpenAI-compatible endpoint (e.g. bifrost at `bifrost.yuricunha.com/v1`). Supports SQLite (local/lightweight) and PostgreSQL (remote/scalable) via the same codebase.

---

## 2. Tech Stack

| package | version | role |
|---|---|---|
| `fastify` | `^5.8.5` | http + websocket server |
| `drizzle-orm` | `^0.45.2` | orm (sqlite + pg) |
| `better-sqlite3` | `^12.9.0` | sqlite driver |
| `pg` | latest | postgresql driver |
| `ws` | latest | websocket server |
| `react` | `^19.2.5` | frontend ui |
| `vite` | `^8.0.10` | bundler + dev server |
| `@tailwindcss/vite` | `^4.2.4` | styling (css-first, no `tailwind.config.js`) |
| `typescript` | `^6.0.3` | entire project |
| `turborepo` | latest | monorepo build orchestration + caching |
| `pnpm workspaces` | `^10.33.0` | monorepo package manager |

---

## 3. Monorepo Structure

scaffolded via `pnpm dlx create-turbo@latest`, then customized.

agentroom/ ├── apps/ │ ├── api/ # fastify + drizzle + websocket loop │ └── web/ # vite + react + tailwind ├── packages/ │ ├── shared/ # shared typescript types (Agent, Room, Message...) │ ├── eslint-config/ # shared eslint config (from turbo scaffold) │ └── typescript-config/ # shared tsconfig (from turbo scaffold) ├── docker/ │ └── Dockerfile # multistage build ├── docker-compose.yml ├── turbo.json ├── pnpm-workspace.yaml └── package.json

---

## 4. Data Models

### `agents`

| field | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `name` | text | visible name in chat |
| `system_prompt` | text | personality / context |
| `model` | text | e.g. `gpt-4o`, `mistral-small` |
| `provider_url` | text | openai-compatible base url |
| `api_key` | text | provider api key |
| `created_at` | timestamp | |

### `rooms`

| field | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `name` | text | |
| `topic` | text? | optional initial prompt to kick off the conversation |
| `status` | enum | `idle`, `running`, `paused` |
| `turn_delay_ms` | int | delay between turns |
| `max_context_messages` | int | limit before context summarization kicks in |
| `created_at` | timestamp | |

### `room_agents`

| field | type | notes |
|---|---|---|
| `room_id` | uuid fk | |
| `agent_id` | uuid fk | |
| `joined_at` | timestamp | |
| `left_at` | timestamp? | null = still in the room |

### `messages`

| field | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `room_id` | uuid fk | |
| `agent_id` | uuid fk? | null = human message |
| `role` | enum | `agent`, `human`, `system` |
| `content` | text | |
| `created_at` | timestamp | |

---

## 5. Turn Loop

room.start() → moderator decides who speaks next → context manager builds the history payload → inject dynamic system prompt (name + active agents in room) → call LLM → save message to db → broadcast via websocket → wait turn_delay_ms → repeat

### Moderator

an invisible LLM call (cheap model) that reads the conversation history and returns only the name of the next agent to speak. priority rules:

1. if someone was mentioned by name → that agent speaks next
2. otherwise → moderator LLM decides
3. fallback → round-robin

### Context Manager

1. estimate token count of full history
2. if below limit → send full history
3. if above limit → generate a summary of older messages via LLM + send last N messages in full
4. limit is configurable per room via `max_context_messages`

### Dynamic System Prompt (injected per turn)

your name is: {agent.name} agents currently in the room: {active_agents.map(a => a.name).join(', ')}

{agent.system_prompt}

rebuilt every turn, so agents always know who is actually present at that moment.

---

## 6. WebSocket Events

| direction | event | description |
|---|---|---|
| server → client | `room:message` | new message from agent or human |
| server → client | `room:agent_joined` | agent entered the room |
| server → client | `room:agent_left` | agent left the room |
| server → client | `room:status` | room status changed (idle/running/paused) |
| server → client | `room:typing` | agent X is generating a response |
| client → server | `room:start` | start the conversation loop |
| client → server | `room:pause` | pause after the current turn finishes |
| client → server | `room:send_message` | human sends a message into the room |
| client → server | `room:add_agent` | add an agent to the room at runtime |
| client → server | `room:remove_agent` | remove an agent from the room at runtime |

---

## 7. REST API (Fastify)

| method + path | description |
|---|---|
| `GET /agents` | list all agents |
| `POST /agents` | create agent |
| `PATCH /agents/:id` | update agent |
| `DELETE /agents/:id` | delete agent |
| `GET /rooms` | list all rooms |
| `POST /rooms` | create room |
| `GET /rooms/:id` | get room + active agents |
| `GET /rooms/:id/messages` | paginated message history |
| `WS /ws/rooms/:id` | real-time stream |

---

## 8. UI/UX

cursor-like theme: near-black background (`#0d0d0d`), subtle panel surfaces, monospace details, flat and clean with no decorative effects. accent color purple-blue (`#7b6ef6`).

| page | description |
|---|---|
| `/agents` | crud — list, create, edit agents with system prompt preview |
| `/rooms` | list rooms with status badge (idle / running) |
| `/rooms/:id` | group-chat view: avatar + name per agent, typing indicator, start/pause controls, sidebar to add/remove agents at runtime |

---

## 9. Docker

```dockerfile
# stage 1: build
FROM node:24-slim AS builder
RUN corepack enable pnpm
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

# stage 2: runtime
FROM node:24-slim
WORKDIR /app
COPY --from=builder /app/apps/api/dist .
COPY --from=builder /app/apps/web/dist ./public
COPY --from=builder /app/apps/api/node_modules ./node_modules
CMD ["node", "index.js"]


environment variables:




var


description



DATABASE_URL


sqlite:./data/db.sqlite or postgresql://...



REDIS_URL


optional, enables multi-instance pub/sub



PORT


default 3000

sqlite data persisted via volume at /data. published to ghcr.io/isyuricunha/agentroom and docker hub.

10. Known Fixes Applied

esbuild version conflict between turborepo and drizzle-kit resolved via pnpm.overrides in root package.json:
"pnpm": {
  "overrides": {
    "esbuild": "0.25.12"
  }
}


better-sqlite3 native bindings compiled successfully on install (done in 1.5s)
node:24-slim (debian bookworm) chosen over alpine to avoid musl libc incompatibility with native addons

11. MVP Scope

### In scope (v1)

- agent crud (name, system prompt, model, provider url, api key)
- room crud with agent list management
- turn loop with LLM moderator
- dynamic agent join/leave at runtime
- human can participate in the conversation
- context manager with automatic summarization
- real-time websocket
- sqlite + postgresql via drizzle
- docker multistage + compose
- cursor-like ui
- authentication with jwt
- per-token streaming of agent responses
- exportable conversation history (json + markdown)
- scheduled rooms with cron-based scheduler
- message reactions
- agent and room templates
- multi-language support (en, pt, es)

### Out of scope (v2+)

- multi-instance horizontal scaling with redis pub/sub
- voice/TTS per agent (v3)
