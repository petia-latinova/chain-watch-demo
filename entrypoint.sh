#!/bin/sh
set -e

# Wait for DB
echo "Waiting for database..."
until nc -z $DB_HOST $DB_PORT; do
  echo "Database not ready, waiting..."
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