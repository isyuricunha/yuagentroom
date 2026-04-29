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

WORKDIR /app

COPY --from=builder /app/apps/api/dist .
COPY --from=builder /app/apps/web/dist ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Because the monorepo hoisting might put bettersqlite3 in root or in api, we need the whole tree, 
# but for a production ready approach we just copy what we need. Since this is an MVP monorepo, 
# copying the node_modules as above works if we maintain the structure. We map the package.json so it finds it.
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json

# Environment default
ENV PORT=3000
ENV DATABASE_URL=sqlite:./data/db.sqlite

EXPOSE 3000

CMD ["node", "./index.js"]
