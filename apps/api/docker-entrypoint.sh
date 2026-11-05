#!/bin/sh
# Eduventure API container entrypoint.
#  0. When started as root: make the uploads volume writable for `node`, then re-exec as `node`
#     (PaaS volumes on Railway/Fly/Render are mounted root-owned).
#  1. Applies the database schema: `prisma migrate deploy` (db push fallback when no migrations exist)
#  2. Optionally seeds demo data (SEED_ON_START=true)
#  3. Execs the CMD (node dist/main) so signals reach Node directly
set -e

log() { echo "[entrypoint] $*"; }

UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"
export UPLOAD_DIR

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$UPLOAD_DIR"
  find "$UPLOAD_DIR" \! -user node -exec chown node:node {} + 2>/dev/null || true
  HOME=/home/node exec setpriv --reuid=node --regid=node --init-groups "$0" "$@"
fi

if [ "${SKIP_MIGRATIONS:-false}" != "true" ]; then
  if ls prisma/migrations/*/migration.sql >/dev/null 2>&1; then
    log "applying migrations: prisma migrate deploy"
    prisma migrate deploy
  else
    log "WARNING: prisma/migrations is empty - syncing schema with 'prisma db push'."
    log "         Commit an initial migration (npm run prisma:migrate -- --name init) for production use."
    prisma db push --skip-generate
  fi
else
  log "SKIP_MIGRATIONS=true - not touching the database schema"
fi

if [ "${SEED_ON_START:-false}" = "true" ]; then
  log "seeding demo data: prisma db seed"
  # SEED_ON_START=true is an explicit opt-in to the (database-wiping) demo seed
  ALLOW_DEMO_SEED=1 prisma db seed || log "seed failed (already seeded?) - continuing"
fi

mkdir -p "$UPLOAD_DIR" 2>/dev/null || true

log "starting: $*"
exec "$@"
