#!/bin/bash
set -euo pipefail

# Make self-signed certs.
mkcert -install
mkcert \
  -cert-file $NGINX_CONFDIR/ktb.localhost.crt \
  -key-file $NGINX_CONFDIR/ktb.localhost.key \
  "ktb.localhost" \
  "*.ktb.localhost"

# Install packages and build.
pnpm install
turbo build

# Setup database.
initdb -A scram-sha-256 -U ktb --pwfile=<(echo ktb) --set wal_level=logical

devbox services up postgresql -b
until pg_isready; do
  echo "Waiting for postgres to start..."
  sleep 1
done

pnpm prisma migrate deploy

devbox services stop
