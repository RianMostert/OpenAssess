#!/bin/bash
set -e

echo "Running database initialization..."
python init_db.py

echo "Starting FastAPI application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
