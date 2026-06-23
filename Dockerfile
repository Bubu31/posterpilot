# syntax=docker/dockerfile:1

# --- install dependencies (with dev, for the build) ---
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- build the SvelteKit app (adapter-node) ---
FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# --- runtime: production deps + built server + migrations ---
FROM oven/bun:1 AS run
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL=file:/data/posterpilot.db \
    KOMETA_ASSETS_DIR=/kometa \
    LOG_DIR=/data/logs
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile
COPY --from=build /app/build ./build
COPY --from=build /app/drizzle ./drizzle
EXPOSE 3000
CMD ["bun", "./build/index.js"]
