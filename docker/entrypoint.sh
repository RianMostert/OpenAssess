#!/bin/bash
set -e

echo "================================================"
echo "OpenAssess Starting..."
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
echo "Starting services..."
echo "  - FastAPI Backend (internal port 8000)"
echo "  - Next.js Frontend (port 3000, proxies /api/* to backend)"
echo "================================================"

# Start FastAPI backend in background
cd /app/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start Next.js frontend (runs in foreground)
# Set HOSTNAME to 0.0.0.0 so Next.js binds to all interfaces (not just localhost/container hostname)
cd /app/frontend
export HOSTNAME=0.0.0.0
exec node server.js

# If Next.js exits, kill backend too
kill $BACKEND_PID 2>/dev/null || true
