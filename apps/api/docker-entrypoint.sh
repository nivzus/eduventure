#!/bin/sh
# Eduventure API container entrypoint.
#  1. Applies the database schema (prisma migrate deploy; db push fallback when no migrations exist)
#  2. Optionally seeds demo data (SEED_ON_START=true)
#  3. Execs the CMD (node dist/main) so signals reach Node directly
set -e

log() { echo "[entrypoint] $*"; }

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
  prisma db seed || log "seed failed (already seeded?) - continuing"
fi

mkdir -p "${UPLOAD_DIR:-/app/uploads}" 2>/dev/null || true

log "starting: $*"
exec "$@"
