#!/bin/bash
set +e

echo "⚡ [SAARTHI BACKEND] Running database migrations..."
alembic upgrade head || echo "Migration warning: proceeding with startup..."

PORT_TO_USE="${PORT:-8000}"
echo "⚡ [SAARTHI BACKEND] Starting Uvicorn server on port ${PORT_TO_USE}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT_TO_USE}"
