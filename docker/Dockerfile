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

# Copy package.json files and lockfile to install dependencies
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

# Copy .npmrc if it exists (preserves pnpm registry config)
RUN test -f /app/.npmrc && cp /app/.npmrc ./.npmrc || true

# Install only production dependencies with correct symlink structure
RUN pnpm install --prod --frozen-lockfile

# Copy built files AFTER installing dependencies
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/web/dist ./public
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Environment default
ENV PORT=3000
ENV DATABASE_URL=sqlite:./data/db.sqlite

EXPOSE 3000

CMD ["node", "./dist/index.js"]
