#!/bin/sh
# ═══════════════════════════════════════════════════════════════════════════════
#  Ollama Init Script — Auto-pull Phi-3 model on first start
#  Mounted into the Ollama container via docker-compose.yml
# ═══════════════════════════════════════════════════════════════════════════════

set -e

MODEL="${OLLAMA_MODEL:-phi3}"
OLLAMA_HOST="${OLLAMA_HOST:-0.0.0.0}"

echo "[ollama-init] Starting Ollama server on ${OLLAMA_HOST}:11434..."

# Start ollama serve in background
ollama serve &
SERVER_PID=$!

# Wait for server to be ready (max 60 seconds)
for i in $(seq 1 60); do
  if ollama list >/dev/null 2>&1; then
    echo "[ollama-init] Ollama server is ready."
    break
  fi
  echo "[ollama-init] Waiting for Ollama server... (${i}/60)"
  sleep 1
done

# Check if model already exists
if ollama list | grep -q "^${MODEL}"; then
  echo "[ollama-init] Model '${MODEL}' already present."
else
  echo "[ollama-init] Pulling model '${MODEL}' (this may take several minutes on first run)..."
  ollama pull "${MODEL}"
  echo "[ollama-init] Model '${MODEL}' pulled successfully."
fi

# Keep the server running in foreground
wait ${SERVER_PID}
