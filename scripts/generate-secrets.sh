#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  MITRA v3.2 — Secure Secret Generator
#  Run this on Git Bash, WSL, or any Linux/macOS terminal to generate
#  cryptographically secure values for your .env file.
# ═══════════════════════════════════════════════════════════════════════════════

echo "════════════════════════════════════════════════════════════════"
echo "  MITRA v3.2 Secure Secret Generator"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Generate a 64-char hex (256 bits) for DB password
DB_PASSWORD=$(openssl rand -hex 32)
# Generate 64-char hex for JWT secrets
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
# Generate 32-char hex for MinIO credentials
MINIO_ACCESS_KEY=$(openssl rand -hex 16)
MINIO_SECRET_KEY=$(openssl rand -hex 32)
# Generate Redis password
REDIS_PASSWORD=$(openssl rand -hex 16)
# Generate strong admin password
SEED_ADMIN_PASSWORD=$(openssl rand -hex 16)

echo "Copy these values into your .env file:"
echo ""
echo "# ── Database ─────────────────────────────────────────────────────"
echo "DB_PASSWORD=${DB_PASSWORD}"
echo ""
echo "# ── JWT ─────────────────────────────────────────────────────────"
echo "JWT_SECRET=${JWT_SECRET}"
echo "JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}"
echo ""
echo "# ── MinIO ────────────────────────────────────────────────────────"
echo "MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}"
echo "MINIO_SECRET_KEY=${MINIO_SECRET_KEY}"
echo ""
echo "# ── Redis ────────────────────────────────────────────────────────"
echo "REDIS_PASSWORD=${REDIS_PASSWORD}"
echo ""
echo "# ── Seeding ─────────────────────────────────────────────────────"
echo "SEED_ADMIN_PASSWORD=${SEED_ADMIN_PASSWORD}"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "⚠️  IMPORTANT: After updating .env, run:"
echo "   podman compose -f podman-compose.yml down"
echo "   podman compose -f podman-compose.yml up -d --build"
echo "════════════════════════════════════════════════════════════════"
