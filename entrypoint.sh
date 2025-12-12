#!/bin/sh
set -e

# Use pg_isready to wait until DB is ready for queries
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_NAME=$DB_NAME

echo "Waiting for PostgreSQL to be fully ready..."

# Loop until pg_isready returns 0 (ready for connections)
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; do
  echo "Database not ready, waiting 2 seconds..."
  sleep 2
done
echo "Database ready ✅"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -c "CREATE DATABASE \"$DB_NAME\""

# Start the app
echo "Starting app..."
if [ "$NODE_ENV" = "production" ]; then
  # Run migrations based on environment or explicit flag
  yarn run migration:run:prod
  node dist/main.js
else
  # Run migrations based on environment or explicit flag
  yarn run migration:run
  # Use ts-node for development
  npx ts-node -r tsconfig-paths/register src/main.ts
fi
