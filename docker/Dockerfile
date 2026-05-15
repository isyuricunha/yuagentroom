# stage 1: build
FROM node:24-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
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

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm

WORKDIR /app

# Copy workspace root files required by pnpm
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./

# Copy sub-project package.json files into their workspace paths
# This ensures pnpm creates the correct symlink structure for each workspace
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

# Install only production dependencies with correct symlink structure
RUN pnpm install --prod --frozen-lockfile

# Copy built files AFTER installing dependencies (preserves node_modules)
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist

# Environment default
ENV PORT=3000
ENV DATABASE_URL=sqlite:./data/db.sqlite

EXPOSE 3000

CMD ["node", "./apps/api/dist/index.js"]
