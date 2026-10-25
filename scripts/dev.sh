#!/usr/bin/env bash
set -e

# ResQVision Predictable Development Runner
# Starts both FastAPI backend (port 8000) and Next.js frontend (port 3000)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Locate Python environment
if [ -d "$ROOT_DIR/backend/.venv" ]; then
    PYTHON_BIN="$ROOT_DIR/backend/.venv/bin/python"
    UVICORN_BIN="$ROOT_DIR/backend/.venv/bin/uvicorn"
elif [ -d "$ROOT_DIR/.venv" ]; then
    PYTHON_BIN="$ROOT_DIR/.venv/bin/python"
    UVICORN_BIN="$ROOT_DIR/.venv/bin/uvicorn"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
    UVICORN_BIN="uvicorn"
else
    echo "Error: Python runtime not found." >&2
    exit 1
fi

echo "=========================================="
echo " Starting ResQVision Full-Stack Services"
echo " Backend:  http://localhost:8000"
echo " Frontend: http://localhost:3000"
echo "=========================================="

# Cleanup handler on exit or Ctrl+C
cleanup() {
    echo ""
    echo "Shutting down ResQVision services..."
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    wait 2>/dev/null || true
    echo "All services stopped."
}
trap cleanup SIGINT SIGTERM EXIT

# Start backend
cd "$ROOT_DIR/backend"
"$UVICORN_BIN" app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
cd "$ROOT_DIR/frontend"
npm run dev -- --port 3000 &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
