#!/bin/sh
# =============================================================================
# nestjs Backend - Docker Entrypoint
# =============================================================================
set -e

echo "=========================================="
echo "nestjs Backend Starting..."
echo "=========================================="

# ------------------------------------------------------------------
# Wait for PostgreSQL to be ready
# ------------------------------------------------------------------
echo "Waiting for PostgreSQL at ${DB_HOST:-postgres}:${DB_PORT:-5432}..."
MAX_RETRIES=30
RETRY_COUNT=0

until nc -z "${DB_HOST:-postgres}" "${DB_PORT:-5432}"; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "ERROR: Could not connect to PostgreSQL after $MAX_RETRIES attempts"
        exit 1
    fi
    echo "Waiting for PostgreSQL... (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

echo "PostgreSQL is ready!"
sleep 3  # allow DB to fully initialize

# ------------------------------------------------------------------
# Run migrations
# ------------------------------------------------------------------
if [ -f "dist/database/data-source.js" ]; then
    echo "Running database migrations..."
    npx typeorm migration:run -d dist/database/data-source.js || \
        echo "Migrations already applied or failed (continuing)"
else
    echo "WARNING: data-source.js not found, skipping migrations"
fi

# ------------------------------------------------------------------
# Run seeders
# ------------------------------------------------------------------
if [ -f "dist/database/seeder.js" ]; then
    echo "Running database seeders..."
    node dist/database/seeder.js || echo "Seeders failed or already applied (continuing)"
else
    echo "No seeders found, skipping..."
fi

# ------------------------------------------------------------------
# Start NestJS
# ------------------------------------------------------------------
echo "=========================================="
echo "Starting NestJS application..."
echo "=========================================="

# 🚀 IMPORTANT: use exec to replace shell with Node process
exec node dist/main.js


