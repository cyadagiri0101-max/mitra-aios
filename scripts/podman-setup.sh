#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  Podman Rootless Setup Script — MITRA v2.1
#
#  Run this ONCE before first `podman compose up` to pre-create named volumes
#  with correct ownership for rootless Podman containers.
#
#  Why this is needed:
#    Rootless Podman maps container UIDs to host UIDs. PostgreSQL (UID 999),
#    Redis (UID 999), and MinIO (UID 1000) need their data directories owned
#    by the mapped UID, or they will fail with "Permission denied".
#
#  Usage:
#    ./scripts/podman-setup.sh
#    podman compose -f podman-compose.yml up -d
# ═══════════════════════════════════════════════════════════════════════════════

set -e

echo "[podman-setup] Pre-creating Podman volumes with correct ownership..."

# ── PostgreSQL (container UID 999 = postgres) ─────────────────────────────────
echo "[podman-setup] Setting up postgres-data volume..."
podman volume create mitra-postgres-data 2>/dev/null || true
# If using a local directory instead of named volume:
# mkdir -p ~/.local/share/mitra/postgres-data
# podman unshare chown 999:999 ~/.local/share/mitra/postgres-data

# ── Redis (container UID 999 = redis) ─────────────────────────────────────────
echo "[podman-setup] Setting up redis-data volume..."
podman volume create mitra-redis-data 2>/dev/null || true

# ── MinIO (container UID 1000 = minio) ────────────────────────────────────────
echo "[podman-setup] Setting up minio-data volume..."
podman volume create mitra-minio-data 2>/dev/null || true

# ── Ollama (root in container, maps to your host user) ──────────────────────
echo "[podman-setup] Setting up ollama-data volume..."
podman volume create mitra-ollama-data 2>/dev/null || true

echo ""
echo "[podman-setup] ✅ Volumes ready."
echo ""
echo "Next steps:"
echo "  1. cp .env.example .env  (and fill in secrets)"
echo "  2. podman compose -f podman-compose.yml up -d"
echo "  3. podman compose -f podman-compose.yml exec backend npm run migration:run"
echo "  4. podman compose -f podman-compose.yml exec backend npm run seed"
echo ""
echo "Frontend will be at: http://localhost:8080 (not 80 — rootless can't bind <1024)"
echo "API will be at:      http://localhost:3001/api"
