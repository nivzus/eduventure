# syntax=docker/dockerfile:1
#
# Eduventure API — NestJS 11 + Prisma 6 (PostgreSQL)
# Build context: apps/api
#   docker build -t eduventure-api apps/api
#   docker run -p 4000:4000 -e DATABASE_URL=... -e JWT_ACCESS_SECRET=... -e JWT_REFRESH_SECRET=... eduventure-api
#
# On start the entrypoint runs `prisma migrate deploy` (see docker-entrypoint.sh),
# then `node dist/main`. Set SEED_ON_START=true once to load the demo accounts.

# ─── base: Debian slim + OpenSSL (Prisma engines need libssl) + tini (PID 1) ───
FROM node:22-bookworm-slim AS base
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

# ─── deps: full install (dev deps are needed for nest build / prisma generate) ───
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ─── build: prisma client + compile TypeScript ───
FROM deps AS build
COPY . .
RUN npx prisma generate \
 && npm run build \
 && if [ ! -f dist/main.js ]; then \
      echo "dist/main.js not found - check tsconfig 'include'/'rootDir' (start:prod expects dist/main)"; \
      find dist -name 'main.js' -not -path '*/node_modules/*'; exit 1; \
    fi

# ─── prod-deps: production dependencies only ───
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ─── runner ───
FROM base AS runner
ENV NODE_ENV=production \
    PORT=4000 \
    UPLOAD_DIR=/app/uploads \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1

# Prisma CLI (migrate deploy / db seed) and tsx (seed script) are devDependencies,
# so install them globally at the exact versions from package-lock.json instead of
# shipping every devDependency.
COPY package-lock.json /tmp/package-lock.json
RUN PRISMA_VERSION="$(node -p "require('/tmp/package-lock.json').packages['node_modules/prisma'].version")" \
 && TSX_VERSION="$(node -p "(require('/tmp/package-lock.json').packages['node_modules/tsx'] || { version: 'latest' }).version")" \
 && npm install -g "prisma@${PRISMA_VERSION}" "tsx@${TSX_VERSION}" \
 && npm cache clean --force \
 && rm /tmp/package-lock.json

COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma
# Generate the Prisma client (+ query engine for this platform) into node_modules/.prisma
RUN prisma generate

COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
 && mkdir -p /app/uploads \
 && chown -R node:node /app/uploads

# No `USER node` here on purpose: the entrypoint starts as root only to chown the uploads
# volume (PaaS volumes are root-owned) and then re-execs everything as `node` via setpriv.
EXPOSE 4000

# Any HTTP answer < 500 means Nest is up (a dedicated /api/health route is optional).
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.status<500?0:1),()=>process.exit(1))"

ENTRYPOINT ["tini", "--", "docker-entrypoint.sh"]
CMD ["node", "dist/main"]
