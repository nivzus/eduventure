# syntax=docker/dockerfile:1
#
# Eduventure Web — Next.js 15 (App Router)
# Build context: apps/web
#   docker build -t eduventure-web --build-arg API_URL=http://api:4000 apps/web
#   docker run -p 3000:3000 eduventure-web
#
# IMPORTANT: Next.js resolves `rewrites()` (/api/:path* -> ${API_URL}/api/:path*) at BUILD
# time, so API_URL must be passed as a build arg (it is also set at runtime for SSR code).
#
# Uses the small `output: 'standalone'` bundle when next.config.ts enables it and falls
# back to a regular `next start` bundle (production node_modules) otherwise.

ARG NODE_VERSION=22

# ─── base ───
FROM node:${NODE_VERSION}-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

# ─── deps ───
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ─── build ───
FROM base AS build
ARG API_URL=http://api:4000
ENV API_URL=${API_URL} \
    NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# Assemble the runtime bundle in /out
RUN set -eu; mkdir -p /out; \
    if [ -f .next/standalone/server.js ]; then \
      echo "==> standalone output detected"; \
      cp -a .next/standalone/. /out/; \
      mkdir -p /out/.next; \
      cp -a .next/static /out/.next/static; \
    else \
      echo "==> no standalone output: shipping a 'next start' bundle (add output: 'standalone' to next.config.ts for a ~4x smaller image)"; \
      npm prune --omit=dev; \
      cp -a package.json node_modules .next /out/; \
      for f in next.config.ts next.config.mjs next.config.js; do if [ -f "$f" ]; then cp -a "$f" /out/; fi; done; \
      rm -rf /out/.next/cache; \
    fi; \
    if [ -d public ]; then cp -a public /out/public; fi

# ─── runner ───
FROM base AS runner
ARG API_URL=http://api:4000
ENV NODE_ENV=production \
    API_URL=${API_URL} \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=build --chown=node:node /out ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.status<500?0:1),()=>process.exit(1))"

CMD ["sh", "-c", "if [ -f server.js ]; then exec node server.js; else exec node_modules/.bin/next start -H \"${HOSTNAME:-0.0.0.0}\" -p \"${PORT:-3000}\"; fi"]
