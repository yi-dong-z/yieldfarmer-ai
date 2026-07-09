#!/usr/bin/env bash
# ─── YieldFarmer AI — Quick Start (non-Docker) ───
# Usage:  chmod +x start.sh && ./start.sh
set -e

echo "╔══════════════════════════════════════════════╗"
echo "║        🌾 YieldFarmer AI — Quick Start       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Check prerequisites ──
echo "[1/4] Checking prerequisites..."

if ! command -v python3 &>/dev/null; then
    echo "❌ python3 not found. Please install Python 3.10+."
    exit 1
fi
echo "   ✅ Python $(python3 --version)"

if ! command -v npm &>/dev/null; then
    echo "❌ npm not found. Please install Node.js 18+."
    exit 1
fi
echo "   ✅ Node $(node --version) / npm $(npm --version)"

# ── 2. Install dependencies ──
echo ""
echo "[2/4] Installing Python dependencies..."
pip install -r agent/requirements.txt

echo ""
echo "[3/4] Installing frontend dependencies..."
cd frontend && npm install && cd ..

# ── 3. Check .env ──
echo ""
if [ ! -f .env ]; then
    echo "[4/4] Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "   ⚠️  IMPORTANT: Please edit .env with your API keys, then re-run:"
    echo ""
    echo "      ./start.sh"
    echo ""
    echo "   Required: KEEPERHUB_API_KEY  (get from https://app.keeperhub.com → Settings → API Keys)"
    echo "   Required: DEEPSEEK_API_KEY or OPENAI_API_KEY"
    echo ""
    exit 0
else
    echo "[4/4] .env found, starting services..."
fi

# ── 4. Start services ──
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  🚀 Starting services...                      ║"
echo "║  Backend  → http://localhost:8000/docs        ║"
echo "║  Frontend → http://localhost:3000             ║"
echo "║  Press Ctrl+C to stop all services            ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID 2>/dev/null || true
    wait $FRONTEND_PID 2>/dev/null || true
    echo "✅ All services stopped."
}
trap cleanup EXIT INT TERM

# Start backend in background
cd agent && python3 main.py &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo "   Waiting for backend to be ready..."
for i in $(seq 1 30); do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "   ✅ Backend ready!"
        break
    fi
    sleep 1
done

# Start frontend
cd frontend && npm run dev &
FRONTEND_PID=$!

# Wait forever (Ctrl+C to stop)
wait
