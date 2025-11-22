#!/bin/bash
set -e

echo "================================================"
echo "OpenAssess Starting (DEVELOPMENT MODE)"
echo "================================================"

# Wait for database to be ready
if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for database to be ready..."
    sleep 5
fi

# Run database migrations
echo "Running database migrations..."
cd /app/backend
python init_db.py

# Optionally seed the database if SEED_DB is set
if [ "$SEED_DB" = "true" ]; then
    echo "Seeding database with initial data..."
    python seed_db.py
fi

echo "================================================"
echo "Starting services in DEVELOPMENT mode..."
echo "  - FastAPI Backend (port 8000) with --reload"
echo "  - Next.js Frontend (port 3000) with HMR"
echo "================================================"

# Start FastAPI backend with hot reload
cd /app/backend
echo "Starting FastAPI with hot reload..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start Next.js in dev mode
cd /app/frontend
export HOSTNAME=0.0.0.0

# Check if dependencies need updating (compare package.json timestamps)
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    pnpm install --frozen-lockfile
elif [ "package.json" -nt "node_modules" ]; then
    echo "Package.json updated, reinstalling dependencies..."
    pnpm install --frozen-lockfile
else
    echo "Frontend dependencies already installed"
fi

echo "Starting Next.js dev server with HMR..."
exec pnpm run dev --hostname 0.0.0.0 --port 3000

# If Next.js exits, kill backend too
kill $BACKEND_PID 2>/dev/null || true
