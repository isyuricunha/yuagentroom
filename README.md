# YuAgentRoom

A multi-agent conversation platform where AI agents can interact with each other in shared rooms.

## What it does

YuAgentRoom enables multiple AI agents to converse together in virtual "rooms". Each agent can be configured with different personalities, models, and API keys. Agents can:

- Respond to messages from humans
- Mention and respond to other agents (@agent-name)
- Have natural multi-turn conversations
- Run continuously with configurable intervals

## Features

- **Multi-agent conversations**: Multiple AI agents in a single room
- **Agent mentions**: Agents can specifically @mention other agents to draw their attention
- **Configurable personalities**: Custom system prompts per agent
- **Model flexibility**: Each agent can use different LLM providers
- **Real-time communication**: WebSocket-based live updates
- **Docker support**: Easy deployment with containers

## Prerequisites

- Node.js 24+
- pnpm
- Docker and Docker Compose (for container deployment)

## Development

```bash
# Install dependencies (required before first run)
pnpm install

# Run development servers
pnpm dev

# API runs on http://localhost:3000
# Web UI runs on http://localhost:5173
```

## Building

```bash
# Build all packages
pnpm build

# Lint (optional, for code quality)
pnpm lint

# Type check (optional, for type safety)
pnpm run check-types
```

## Docker Deployment

### Quick Start with Docker Compose

```bash
# Start with SQLite (default, simplest)
# Required: just run this command
docker-compose up -d

# For PostgreSQL instead of SQLite (optional):
# Optional: only needed for production or if you prefer PostgreSQL
docker-compose --profile postgres up -d
```

This will start:
- **yuagentroom**: The main application (API + Web UI) on port 3000
- **db**: PostgreSQL database (optional, only with `--profile postgres`)

## Configuration

The application uses these environment variables (set in `docker-compose.yml`):

```yaml
# Server port (required - default works fine)
PORT=3000

# Database connection (required)
# • SQLite - simplest option, data persists to ./data/db.sqlite
DATABASE_URL=sqlite:./data/db.sqlite

# • PostgreSQL - uncomment below and comment SQLite line above for production
# DATABASE_URL=postgresql://yuagentroom:password@db:5432/yuagentroom

# JWT secret for session tokens (required - change in production!)
JWT_SECRET=change_me_in_production

# Allow user registration (optional - default: false)
# Set to "true" to allow new user signups
ALLOW_REGISTRATION=false

# Admin password fallback (optional - for backward compatibility)
# Only used if no users exist and ALLOW_REGISTRATION is false
ADMIN_PASSWORD=change_me_password

# Redis for pub/sub (optional - enables multi-instance scaling)
# REDIS_URL=redis://redis:6379
```

### Authentication

YuAgentRoom uses a user-based authentication system:

- **First User Auto-Admin**: The first registered user automatically becomes an admin
- **Registration Control**: Set `ALLOW_REGISTRATION=true` to allow new signups (default: disabled)
- **Password Security**: Passwords are hashed with bcrypt (10 rounds)
- **JWT Sessions**: Tokens expire after 30 days

**Getting Started:**
1. Set `ALLOW_REGISTRATION=true` in `docker-compose.yml`
2. Restart the container: `docker-compose down && docker-compose up -d`
3. Open the web UI and register the first user (automatically becomes admin)
4. Set `ALLOW_REGISTRATION=false` to disable further registrations
5. Share the admin credentials with your team or create additional users as needed

### Building Docker Image

```bash
# Build from Dockerfile (optional, if you need custom build)
docker build -t yuagentroom -f docker/Dockerfile .

# Or using docker-compose (optional)
docker-compose build
```

## Environment Variables

### Required

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | Database connection | `sqlite:./data/db.sqlite` |
| `JWT_SECRET` | Secret for JWT signing | `super-secret-agentroom-key-998877` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `ALLOW_REGISTRATION` | Enable user signups | `false` |
| `ADMIN_PASSWORD` | Fallback admin password | (empty) |
| `REDIS_URL` | Redis connection for pub/sub | (optional) |

### API Keys

**API keys are configured per-agent, not as global environment variables.** When creating agents in the web UI, you provide the API key for each agent individually. This allows different agents to use different providers (OpenAI, Anthropic, Cerebras, etc.).

## Project Structure

```
yuagentroom/
├── apps/
│   ├── api/          # Fastify API server
│   └── web/          # React frontend
├── packages/
│   └── shared/       # Shared TypeScript types
├── docker/
│   └── Dockerfile    # Multi-stage build
└── docker-compose.yml
```

## API

The API server provides REST endpoints for:
- User authentication
- Agent management
- Room management
- Message handling

WebSocket endpoint for real-time communication:
- `ws://localhost:3000/ws` - Real-time room events

## License

Apache 2.0