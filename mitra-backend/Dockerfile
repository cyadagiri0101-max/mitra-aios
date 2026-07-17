# ─── Stage 1: Build ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install build essentials for native addons
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy manifests first for layer caching
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY . .
RUN npm run build

# ─── Stage 2: Production runtime ──────────────────────────────────────────
#  ⚠️  CRITICAL: npm ci --omit=dev strips ALL devDependencies.
#     Any package imported (even conditionally) at runtime MUST be listed
#     under "dependencies" in package.json, NOT "devDependencies".
#     If you see "Cannot find module '@xxx/yyy'", move it to dependencies.
FROM node:20-alpine AS runner

# Security: non-root user
RUN addgroup -g 1001 -S mitra && adduser -u 1001 -S mitra -G mitra

WORKDIR /app

# Only production dependencies — see the WARNING above
COPY package.json package-lock.json ./
COPY tsconfig.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/database ./src/database

# Verify no runtime module is missing (defensive check)
# We check individual packages instead of loading main.js because bootstrap()
# requires env vars (JWT_SECRET, DB_PASSWORD) that are NOT available during build.
# This catches packages incorrectly placed in devDependencies.
RUN node -e " \
  const mods = ['@nestjs/common','@nestjs/core','@nestjs/swagger','typeorm','pg','redis','minio','passport-jwt','class-validator','helmet','compression','bcryptjs']; \
  for (const m of mods) { try { require(m); } catch(e) { console.error('MISSING MODULE:', m, e.message); process.exit(1); } } \
  console.log('[MITRA] All runtime modules verified.'); \
"

# Healthcheck — polls the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

USER mitra

EXPOSE 3001

CMD ["node", "dist/main"]
