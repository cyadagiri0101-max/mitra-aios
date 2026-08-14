# MITRA v3.2 Infrastructure, Dependencies & Deployment Security Audit Report

**Audit Date:** 2025-06-20
**Auditor:** DevOps / Security Engineering Specialist
**Scope:** `mitra-backend`, `mitra-frontend`, `docker-compose.yml`, `podman-compose.yml`, deployment scripts, CI/CD, and infrastructure configuration.

---

## Executive Summary

A comprehensive review of the MITRA v3.2 infrastructure identified **7 CRITICAL**, **19 HIGH**, **11 MEDIUM**, and **7 LOW** severity findings. While several foundational security controls are already in place (non-root container user, `HEALTHCHECK`, custom Docker networks), significant gaps remain in **runtime container hardening**, **secret management**, **TypeScript strictness**, **CI/CD security gates**, and **PostgreSQL production tuning**.

---

## CRITICAL Findings

### CRIT-001: `axios` Resolved to Potentially Vulnerable Version (1.17.0) in Lockfile

| Field | Detail |
|-------|--------|
| **Severity** | CRITICAL |
| **File** | `mitra-backend/package-lock.json` |
| **Line** | `axios` dependency block |
| **Description** | The `package.json` specifies `axios: ^1.7.2`, but `package-lock.json` resolves to `1.17.0`. Historically, `axios` < 1.7.4 has known CVEs (e.g., SSRF via `Proxy-Authorization` header, `CVE-2024-39300`/`CVE-2024-39360` family). The lockfile must be regenerated to pull the latest patched version within the `^1.7.2` range. |
| **Current Config** | `package.json`: `"axios": "^1.7.2"`  <br>`package-lock.json`: `"version": "1.17.0"` |
| **Suggested Fix** | ```bash
cd mitra-backend
rm package-lock.json
npm install --package-lock-only
# Or explicitly: npm install axios@^1.7.9 --save
``` |

---

### CRIT-002: `DB_SYNC` Environment-Driven Synchronization Risk in Production

| Field | Detail |
|-------|--------|
| **Severity** | CRITICAL |
| **File** | `mitra-backend/src/app.module.ts` |
| **Line** | 59 |
| **Description** | `synchronize: configService.get('DB_SYNC', 'false') === 'true'` allows an environment variable to enable TypeORM `synchronize`. In production, this can drop columns, recreate tables, and cause catastrophic data loss if `DB_SYNC=true` is accidentally set. The `.env.example` sets it to `false`, but there is no runtime enforcement that prevents `true` in `NODE_ENV=production`. |
| **Current Config** | `synchronize: configService.get('DB_SYNC', 'false') === 'true'` |
| **Suggested Fix** | ```typescript
// In app.module.ts — enforce synchronize=false in production regardless of env
synchronize: configService.get('NODE_ENV') === 'production'
  ? false
  : configService.get('DB_SYNC', 'false') === 'true',
// OR throw at bootstrap if DB_SYNC=true in production
``` |

---

### CRIT-003: Redis Runs Without Authentication by Default

| Field | Detail |
|-------|--------|
| **Severity** | CRITICAL |
| **File** | `mitra-backend/.env.example` (line 42) <br>`docker-compose.yml` (line 84) <br>`podman-compose.yml` (line 90) |
| **Description** | `REDIS_PASSWORD=` is empty in `.env.example`. The compose files use `--requirepass ${REDIS_PASSWORD:-}`, which defaults to an empty string when unset, effectively disabling Redis authentication. In a containerized environment with inter-container network access, any compromised container can connect to Redis without credentials. |
| **Current Config** | `.env.example`: `REDIS_PASSWORD=`  <br>Compose: `--requirepass ${REDIS_PASSWORD:-}` |
| **Suggested Fix** | `.env.example` line 42:  <br>`REDIS_PASSWORD=REPLACE_WITH_REDIS_PASSWORD_min_32_chars`  <br>Compose: remove `:-` fallback or require the variable:  <br>`--requirepass ${REDIS_PASSWORD:?REDIS_PASSWORD is required}` |

---

### CRIT-004: Missing Container Security Context / Hardening in Compose

| Field | Detail |
|-------|--------|
| **Severity** | CRITICAL |
| **File** | `docker-compose.yml` (lines 125–157) <br>`podman-compose.yml` (lines 130–161) |
| **Description** | Neither compose file specifies `security_opt`, `read_only: true`, `no_new_privs: true`, or dropped Linux capabilities. The backend container has a writable root filesystem, can gain new privileges, and retains full capabilities. This violates defense-in-depth for production container deployments. |
| **Current Config** | No `security_opt`, `cap_drop`, `read_only`, or `tmpfs` settings. |
| **Suggested Fix** | ```yaml
backend:
  read_only: true
  security_opt:
    - no-new-privileges:true
  cap_drop:
    - ALL
  cap_add:
    - NET_BIND_SERVICE
  tmpfs:
    - /tmp:noexec,nosuid,size=100m
  # Ensure COPY --chown in Dockerfile so mitra user can read /app
``` |

---

### CRIT-005: Missing TLS / SSL Termination

| Field | Detail |
|-------|--------|
| **Severity** | CRITICAL |
| **File** | `mitra-frontend/nginx.conf` (line 2) <br>`docker-compose.yml` (line 168) |
| **Description** | The nginx configuration only listens on port 80. There is no TLS/SSL listener (port 443), no certificate configuration, and no HTTP-to-HTTPS redirect. All API traffic between frontend and backend is unencrypted inside the container network, and external traffic is plaintext. The `Strict-Transport-Security` header is also sent over HTTP, which browsers ignore and which is a security anti-pattern. |
| **Current Config** | `listen 80;` only. No `listen 443 ssl;`. No `ssl_certificate` directives. |
| **Suggested Fix** | ```nginx
server {
    listen 80;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl http2;
    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest of config
}
```  <br>Mount TLS certificates via secrets or volume in compose. |

---

### CRIT-006: All Secrets Stored in Plaintext `.env` — No Secret Manager Integration

| Field | Detail |
|-------|--------|
| **Severity** | CRITICAL |
| **File** | `mitra-backend/.env.example` (all lines) <br>`docker-compose.yml` (line 132) |
| **Description** | The `.env.example` file contains every secret (JWT_SECRET, DB_PASSWORD, MINIO_SECRET_KEY, SEED_ADMIN_PASSWORD) and the compose file sources the entire `.env` file. There is no integration with a secret manager (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault, Docker Secrets, or Kubernetes Secrets). In production, secrets should be injected at runtime from a secure vault, not stored in a flat file on the host filesystem. |
| **Current Config** | `env_file: .env` in compose; all secrets in `.env.example`. |
| **Suggested Fix** | 1. Use Docker Swarm Secrets or Kubernetes Secrets for production.  <br>2. Inject secrets via environment variables populated by a CI/CD secret manager.  <br>3. At minimum, remove `env_file: .env` and explicitly map only required variables:  <br>```yaml
environment:
  JWT_SECRET: ${JWT_SECRET:?required}
  DB_PASSWORD: ${DB_PASSWORD:?required}
``` |

---

### CRIT-007: `helmet` `crossOriginEmbedderPolicy` Disabled Unconditionally

| Field | Detail |
|-------|--------|
| **Severity** | CRITICAL |
| **File** | `mitra-backend/src/main.ts` |
| **Line** | 68–85 |
| **Description** | `crossOriginEmbedderPolicy: false` is set unconditionally in the `helmet()` configuration. This disables the `Cross-Origin-Embedder-Policy` header, which mitigates cross-origin leakage attacks (Spectre-style). While COEP can be strict, disabling it entirely removes a critical browser security boundary. If the application does not need to embed cross-origin resources, this should be enabled in production. |
| **Current Config** | `crossOriginEmbedderPolicy: false` |
| **Suggested Fix** | ```typescript
helmet({
  crossOriginEmbedderPolicy: isProd ? { policy: 'require-corp' } : false,
  contentSecurityPolicy: isProd ? { ... } : false,
  // Also enable HSTS only when serving HTTPS
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}),
``` |

---

## HIGH Findings

### HIGH-001: Global API Rate Limit Too Permissive (100 req/min)

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **File** | `mitra-backend/src/app.module.ts` |
| **Line** | 48 |
| **Description** | The global `ThrottlerModule` is configured to `limit: 100` requests per 60-second window. For a production API with sensitive operations (CAD file uploads, BOM analysis, admin endpoints), 100 req/min is too permissive and provides little protection against brute-force or scraping attacks. The auth controller has a custom override of 10 per 15 min, but the global guard is still overly generous. |
| **Current Config** | `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])` |
| **Suggested Fix** | ```typescript
ThrottlerModule.forRoot([
  { ttl: 60_000, limit: 30, name: 'default' },
  { ttl: 60_000, limit: 10, name: 'strict' }, // for auth / file upload
]),
```  <br>Apply `@Throttle('strict')` to sensitive controllers. |

---

### HIGH-002: Missing `.dockerignore` — Layer Bloat and Secret Leakage Risk

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **File** | `mitra-backend/Dockerfile` (line 14) <br>`mitra-frontend/Dockerfile` (line 9) |
| **Description** | Neither the backend nor frontend has a `.dockerignore` file. The `COPY . .` instruction copies everything from the build context into the image, including `.git`, `node_modules`, `.env` files, local IDE configs, test coverage reports, and potentially uncommitted secrets. This increases image size, build cache invalidation, and attack surface. |
| **Current Config** | No `.dockerignore` in `mitra-backend/` or `mitra-frontend/`. |
| **Suggested Fix** | Create `mitra-backend/.dockerignore`:  <br>```
node_modules
npm-debug.log
.git
.gitignore
.env*
*.env
coverage
.vscode
.idea
dist
test
*.spec.ts
*.e2e-spec.ts
``` |

---

### HIGH-003: `COPY --chown` Missing in Backend Dockerfile

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **File** | `mitra-backend/Dockerfile` |
| **Line** | 34–35 |
| **Description** | The `COPY --from=builder /app/dist ./dist` and `COPY --from=builder /app/src/database ./src/database` commands copy files as `root` (the default user in the builder stage). Although the `USER mitra` directive is set later, the files on disk are owned by root. If the container ever runs with `read_only: true` (as recommended), the `mitra` user may not be able to read them. This also violates the principle of least privilege for file ownership. |
| **Current Config** | `COPY --from=builder /app/dist ./dist`  <br>`COPY --from=builder /app/src/database ./src/database` |
| **Suggested Fix** | ```dockerfile
COPY --from=builder --chown=mitra:mitra /app/dist ./dist
COPY --from=builder --chown=mitra:mitra /app/src/database ./src/database
``` |

---

### HIGH-004: `tsconfig.json` Missing `strict: true` and Additional Strictness Flags

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **File** | `mitra-backend/tsconfig.json` |
| **Lines** | 2–37 |
| **Description** | The `tsconfig.json` does not set `strict: true`, which is the single most important TypeScript flag for catching null-reference errors, implicit-any bugs, and unsafe assignments. While `strictNullChecks` and `noImplicitAny` are individually enabled, `strict: true` also enables `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, and `useUnknownInCatchVariables`. Additionally, `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`, and `noUncheckedIndexedAccess` are missing, reducing compile-time safety. |
| **Current Config** | `strictNullChecks: true` (line 15)  <br>`noImplicitAny: true` (line 16)  <br>Missing: `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` |
| **Suggested Fix** | ```json
"compilerOptions": {
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "exactOptionalPropertyTypes": true,
  "noUncheckedIndexedAccess": true,
  "strictPropertyInitialization": false, // keep if needed for DI
  ...
}
``` |

---

### HIGH-005: `passWithNoTests` Masks Missing Test Coverage

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **File** | `mitra-backend/package.json` |
| **Lines** | 12–14, 23 |
| **Description** | The `test`, `test:watch`, `test:cov`, and `test:e2e` scripts all include `--passWithNoTests`. This Jest flag forces a zero exit code even when no test files exist or all tests are empty. In CI, this can hide catastrophic drops in test coverage or missing test suites without failing the build. |
| **Current Config** | `"test": "jest --passWithNoTests"`  <br>`"test:watch": "jest --watch --passWithNoTests"`  <br>`"test:cov": "jest --coverage --passWithNoTests"`  <br>`"test:e2e": "jest --config ./test/jest-e2e.json --passWithNoTests"` |
| **Suggested Fix** | Remove `--passWithNoTests` from all test scripts:  <br>```json
"test": "jest",
"test:watch": "jest --watch",
"test:cov": "jest --coverage",
"test:e2e": "jest --config ./test/jest-e2e.json"
``` |

---

### HIGH-006: Missing `coverageThreshold` in Jest Configuration

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **File** | `mitra-backend/package.json` |
| **Lines** | 84–109 |
| **Description** | The inline Jest configuration does not define `coverageThreshold`. Without minimum coverage thresholds, CI can pass with dangerously low code coverage (e.g., 5%). This is a major quality and security risk because untested code paths often contain vulnerabilities. |
| **Current Config** | No `coverageThreshold` block. |
| **Suggested Fix** | ```json
"coverageThreshold": {
  "global": {
    "branches": 70,
    "functions": 70,
    "lines": 75,
    "statements": 75
  }
}
``` |

---

### HIGH-007: No ESLint Configuration File Found

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **File** | `mitra-backend/` (root) |
| **Description** | Despite `eslint` being installed and a `lint` script existing (`eslint 'src/**/*.ts' --fix`), there is no `.eslintrc.js`, `.eslintrc.json`, or `eslint.config.mjs` in the `mitra-backend/` directory. This means ESLint is running with its default built-in rules only, missing critical TypeScript security and best-practice rules. |
| **Current Config** | `lint: "eslint 'src/**/*.ts' --fix"` — but no config file. |
| **Suggested Fix** | Create `mitra-backend/eslint.config.mjs` (flat config):  <br>```javascript
import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import security from 'eslint-plugin-security';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser: tsParser },
    plugins: { '@typescript-eslint': ts, security },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-console': 'warn',
      'security/detect-object-injection': 'error',
      'security/detect-non-literal-fs-filename': 'error',
    },
  },
];
``` |

---

### HIGH-008: `sourceMap: true` Exposes Source Code in Production Builds

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **File** | `mitra-backend/tsconfig.json` |
| **Line** | 10 |
| **Description** | `sourceMap: true` causes TypeScript to emit `.js.map` files alongside compiled JavaScript. In production, these map files can be used by attackers to reconstruct the original TypeScript source code, including internal logic, file paths, and comments that may contain TODOs or security notes. |
| **Current Config** | `"sourceMap": true` |
| **Suggested Fix** | ```json
"sourceMap": false,
// OR conditionally via NODE_ENV in build script
```  <br>Alternative: strip `.map` files from the `dist/` folder in the Dockerfile after build:  <br>```dockerfile
RUN find ./dist -name "*.map" -delete
``` |

---

### HIGH-009: `declaration: true` Emits Unnecessary `.d.ts` Files in Production

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **File** | `mitra-backend/tsconfig.json` |
| **Line** | 4 |
| **Description** | `declaration: true` emits TypeScript declaration files (`.d.ts`). For a standalone application (not a library), these files are unnecessary in production and increase image size. They also leak internal module structures and type names. |
| **Current Config** | `"declaration": true` |
| **Suggested Fix** | ```json
"declaration": false
```  <br>If types are needed for a library build, use a separate `tsconfig.build.json`. |

---

### HIGH-010: `emitDecoratorMetadata: true` Causes Metadata Bloat and Reflection Leakage

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **File** | `mitra-backend/tsconfig.json` |
| **Line** | 6 |
| **Description** | `emitDecoratorMetadata: true` is required by some NestJS features (class-transformer, class-validator) but it embeds type metadata into the compiled JavaScript via `design:type`, `design:paramtypes`, etc. This exposes internal TypeScript types at runtime and slightly increases bundle size. For production, this should be minimized or removed if not strictly needed. Note: NestJS requires this for `class-validator`/`class-transformer` to work correctly, so this is a **note** rather than a hard fix — but it should be acknowledged as a risk. |
| **Current Config** | `"emitDecoratorMetadata": true` |
| **Suggested Fix** | **Acknowledge as required by NestJS ecosystem.** No action needed unless the project can migrate to explicit decorator metadata. Document this in `SECURITY.md` as an accepted risk. |

---

### HIGH-011: `coverageDirectory` is Relative Path

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **File** | `mitra-backend/package.json` |
| **Line** | 100 |
| **Description** | `coverageDirectory: "../coverage"` is a relative path. In CI environments with multiple working directories or nested clones, this can write coverage reports outside the expected workspace or cause artifacts to be lost. It also makes it harder to integrate with SonarQube or Codecov. |
| **Current Config** | `"coverageDirectory": "../coverage"` |
| **Suggested Fix** | ```json
"coverageDirectory": "<rootDir>/../coverage"
```  <br>Or use an absolute path in CI: `coverageDirectory: process.env.CI ? '/tmp/coverage' : '<rootDir>/../coverage'` |

---

### HIGH-012: `ci.yml` Lint Step Never Fails (`|| true`)

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **File** | `.github/workflows/ci.yml` |
| **Line** | 37 |
| **Description** | The lint step runs `npm run lint -- --max-warnings 0 || true`. The `|| true` means the step always exits with code 0, even if ESLint finds errors. This makes the lint job useless as a quality gate. |
| **Current Config** | `run: npm run lint -- --max-warnings 0 || true   # warn only — don't block PRs` |
| **Suggested Fix** | ```yaml
- name: Lint
  run: npm run lint -- --max-warnings 0
``` |

---

### HIGH-013: `ci.yml` Frontend Uses `npm install` Instead of `npm ci`

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **File** | `.github/workflows/ci.yml` |
| **Line** | 85 |
| **Description** | The frontend CI job uses `npm install --ignore-scripts` instead of `npm ci`. `npm install` can mutate `package-lock.json` and install different versions than those locked, leading to non-deterministic builds and potential supply-chain inconsistencies. |
| **Current Config** | `run: npm install --ignore-scripts` |
| **Suggested Fix** | ```yaml
run: npm ci --ignore-scripts
``` |

---

### HIGH-014: `ci.yml` Missing Container Security Scan (`trivy` / `snyk` / `dependency-check`)

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **File** | `.github/workflows/ci.yml` |
| **Description** | The CI pipeline builds Docker images but does not scan them for OS-level vulnerabilities (Alpine packages), misconfigurations, or embedded secrets. There is no `trivy`, `snyk`, `grype`, or OWASP `dependency-check` step. This is a significant gap in the supply-chain security posture. |
| **Current Config** | Docker build step exists (lines 96–124), but no scan step. |
| **Suggested Fix** | Add a Trivy scan step after Docker build:  <br>```yaml
- name: Scan backend image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: mitra-backend:ci
    format: sarif
    output: trivy-backend.sarif
- name: Scan frontend image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: mitra-frontend:ci
    format: sarif
    output: trivy-frontend.sarif
``` |

---

### HIGH-015: `ci.yml` Smoke Test Does Not Validate Health Endpoint

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **File** | `.github/workflows/ci.yml` |
| **Lines** | 111–124 |
| **Description** | The Docker smoke test starts the backend container but does not wait for the health endpoint to return `200`. It only prints logs and immediately removes the container. A container that crashes 2 seconds after startup will still "pass" this test. |
| **Current Config** | ```yaml
run: |
  docker run -d --name test-backend ...
  sleep 5
  docker logs test-backend 2>&1 | head -20
  docker rm -f test-backend || true
``` |
| **Suggested Fix** | ```yaml
run: |
  docker run -d --name test-backend ...
  for i in {1..30}; do
    sleep 2
    docker exec test-backend wget -qO- http://localhost:3001/api/health && break
  done
  docker rm -f test-backend
``` |

---

### HIGH-016: `@types/minio` v7.1.0 Mismatched with `minio` v8 Runtime

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **File** | `mitra-backend/package.json` |
| **Line** | 70 |
| **Description** | The runtime dependency `minio` is `^8.0.2` (resolved to `8.0.7`), but the dev dependency `@types/minio` is `^7.1.0`. Type definitions for v7 may be inaccurate or missing APIs introduced in v8, causing type-safety holes and misleading IDE autocompletion. There is no `@types/minio` for v8 because MinIO v8 ships its own types. |
| **Current Config** | `"@types/minio": "^7.1.0"` |
| **Suggested Fix** | ```bash
npm uninstall @types/minio
```  <br>MinIO v8 includes built-in TypeScript declarations; `@types/minio` is obsolete. |

---

### HIGH-017: `log_min_duration_statement=500` Too Low for Production — Log Data Leakage Risk

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **File** | `docker-compose.yml` (line 74) <br>`podman-compose.yml` (line 81) |
| **Description** | PostgreSQL is configured to log every query that takes ≥500 ms. In production, this can cause sensitive data (email addresses, passwords, tokens) to be written to logs if those values appear in queries. It also increases log volume and I/O pressure. Production logs should either be off or set to a very high threshold (e.g., 5000 ms+) with query parameter redaction. |
| **Current Config** | `-c log_min_duration_statement=500` |
| **Suggested Fix** | ```yaml
-c log_min_duration_statement=5000
# OR disable entirely:
-c log_min_duration_statement=-1
```  <br>Additionally, set `log_line_prefix` to include timestamps and connection IDs without query text:  <br>`-c log_line_prefix='%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '` |

---

### HIGH-018: `ci.yml` Missing `npm audit` in Frontend Job

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **File** | `.github/workflows/ci.yml` |
| **Lines** | 68–94 |
| **Description** | The backend CI job includes a production security audit (`npm audit`), but the frontend job does not. The frontend uses `axios`, `react-router-dom`, `vite`, and other packages that can have their own vulnerabilities. A complete pipeline should audit both sides. |
| **Current Config** | No `npm audit` step in frontend job. |
| **Suggested Fix** | Add to frontend job:  <br>```yaml
- name: Production security audit
  run: |
    RESULT=$(npm audit --omit=dev --json 2>/dev/null | python3 -c "import json,sys; v=json.load(sys.stdin)['metadata']['vulnerabilities']; print(f'critical={v[\"critical\"]} high={v[\"high\"]}')")
    echo "Frontend audit: $RESULT"
    HIGH=$(npm audit --omit=dev --json 2>/dev/null | python3 -c "import json,sys; v=json.load(sys.stdin)['metadata']['vulnerabilities']; print(v['high'] + v['critical'])")
    if [ "$HIGH" -gt "0" ]; then exit 1; fi
``` |

---

### HIGH-019: `jest-e2e.json` Uses `setupFiles` Instead of `setupFilesAfterEnv`

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **File** | `mitra-backend/test/jest-e2e.json` |
| **Line** | 13–15 |
| **Description** | `setupFiles` runs before the test framework is installed (Jest environment). For test utilities that depend on Jest globals (e.g., `expect.extend`, `jest.mock`), `setupFilesAfterEnv` is the correct directive. Using `setupFiles` can cause timing issues where custom matchers are not available when tests run. |
| **Current Config** | `"setupFiles": ["<rootDir>/test/jest.e2e.setup.ts"]` |
| **Suggested Fix** | ```json
"setupFilesAfterEnv": ["<rootDir>/test/jest.e2e.setup.ts"]
``` |

---

## MEDIUM Findings

### MED-001: `nest-cli.json` Missing `plugins` and `assets` for Non-TS Files

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **File** | `mitra-backend/nest-cli.json` |
| **Lines** | 1–8 |
| **Description** | The `nest-cli.json` only contains `collection`, `sourceRoot`, and `compilerOptions.deleteOutDir`. It lacks `plugins` (e.g., for Swagger CLI plugin) and `assets` (e.g., for `.hbs` templates, `.sql` seed files, or `.json` config files). Non-TS files in `src/` are not copied to `dist/` during build, which can cause runtime "file not found" errors if the application expects them. |
| **Current Config** | ```json
{ "collection": "@nestjs/schematics", "sourceRoot": "src", "compilerOptions": { "deleteOutDir": true } }
``` |
| **Suggested Fix** | ```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true },
  "plugins": ["@nestjs/swagger"],
  "assets": [
    { "include": "**/*.sql", "outDir": "dist/" },
    { "include": "**/*.json", "outDir": "dist/" },
    { "include": "**/*.hbs", "outDir": "dist/" }
  ]
}
``` |

---

### MED-002: `package.json` Missing `engines`, `os`, `cpu` Fields

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **File** | `mitra-backend/package.json` |
| **Description** | The `package.json` does not specify `engines` (Node.js version), `os`, or `cpu`. Without an `engines` field, developers may run `npm install` on Node 18 (which has different native module compatibility), and CI may not catch version mismatches. This is a major source of "works on my machine" issues. |
| **Current Config** | No `engines`, `os`, `cpu`, `bundleDependencies` fields. |
| **Suggested Fix** | ```json
"engines": { "node": ">=20.0.0 <21.0.0", "npm": ">=10.0.0" },
"os": ["linux", "darwin"],
"cpu": ["x64", "arm64"],
"bundleDependencies": false
``` |

---

### MED-003: `package.json` Missing `repository`, `license`, `author`, `bugs`, `homepage`, `keywords`, `funding`

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **File** | `mitra-backend/package.json` |
| **Description** | Missing standard metadata fields reduces discoverability, complicates license compliance, and prevents automated tools (Snyk, Dependabot, npm) from linking back to the source repository. The `license` field is especially important for legal and enterprise adoption. |
| **Current Config** | No `repository`, `license`, `author`, `bugs`, `homepage`, `keywords`, `funding`. |
| **Suggested Fix** | ```json
"repository": { "type": "git", "url": "https://github.com/your-org/mitra.git" },
"license": "MIT",
"author": "Your Org <dev@your-org.com>",
"bugs": { "url": "https://github.com/your-org/mitra/issues" },
"homepage": "https://github.com/your-org/mitra#readme",
"keywords": ["nestjs", "mold", "manufacturing", "plm", "api"],
"funding": { "type": "github", "url": "https://github.com/sponsors/your-org" }
``` |

---

### MED-004: Missing `docker-compose.override.yml` for Local Development

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **File** | `mitra-backend/` (root) |
| **Description** | There is no `docker-compose.override.yml` for local development overrides (e.g., bind mounts for hot-reload, debug ports, local volume paths). Developers must edit the main `docker-compose.yml`, risking accidental commits of local-only changes. |
| **Current Config** | Not present. |
| **Suggested Fix** | Create `docker-compose.override.yml`:  <br>```yaml
version: '3.9'
services:
  backend:
    volumes:
      - ./mitra-backend/src:/app/src:ro
    ports:
      - "9229:9229"  # Node debug
  frontend:
    volumes:
      - ./mitra-frontend/src:/app/src:ro
``` |

---

### MED-005: Missing `Makefile` or `justfile` for Common Operations

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **File** | `mitra-backend/` (root) |
| **Description** | No `Makefile` or `justfile` exists for common developer tasks (e.g., `make migrate`, `make seed`, `make test`, `make lint`). This increases onboarding friction and inconsistency across developer environments. |
| **Current Config** | Not present. |
| **Suggested Fix** | Create `Makefile` or `justfile` with targets for `build`, `test`, `lint`, `migrate`, `seed`, `up`, `down`, `logs`. |

---

### MED-006: Missing `webpack` Tree-Shaking Configuration

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **File** | `mitra-backend/nest-cli.json` |
| **Description** | The NestJS build uses the default compiler (tsc or webpack depending on CLI version). Without explicit `webpack` configuration for tree-shaking, unused NestJS modules, decorators, and third-party code may remain in the production bundle, increasing image size and attack surface. |
| **Current Config** | Default NestJS build — no custom webpack config. |
| **Suggested Fix** | Create `webpack.config.js` with `optimization: { usedExports: true, sideEffects: false }` and reference it in `nest-cli.json`:  <br>```json
"compilerOptions": { "webpack": true, "webpackConfigPath": "webpack.config.js" }
``` |

---

### MED-007: Missing PostgreSQL Backup Strategy and Data Retention Policy

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **File** | `docker-compose.yml` / `podman-compose.yml` |
| **Description** | There is no automated backup mechanism for the `postgres-data` volume. No `pg_dump` cron job, no WAL archiving, no `barman` or `pgbackrest` container, and no documented data retention policy. If the volume is corrupted or accidentally deleted, all production data is unrecoverable. |
| **Current Config** | `postgres-data` volume with no backup sidecar or scheduled task. |
| **Suggested Fix** | Add a `pg-backup` service or cron job:  <br>```yaml
  pg-backup:
    image: postgres:16-alpine
    volumes:
      - postgres-data:/data:ro
      - ./backups:/backups
    command: >
      sh -c "while true; do pg_dump -h postgres -U mitra_admin mitra_v2 > /backups/mitra_$(date +%Y%m%d_%H%M%S).sql; sleep 86400; done"
```  <br>Also implement WAL archiving with `pgbackrest` for point-in-time recovery. |

---

### MED-008: `effective_cache_size` Set to 1GB (Should Be ~75% of RAM)

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **File** | `docker-compose.yml` (line 73) <br>`podman-compose.yml` (line 80) |
| **Description** | `effective_cache_size=1GB` is a generic default. For a production PostgreSQL container, this should be approximately 75% of available system RAM so the query planner makes optimal cost-based decisions. A 1GB setting on a 16GB server causes the planner to prefer sequential scans over index scans for large tables, degrading query performance. |
| **Current Config** | `-c effective_cache_size=1GB` |
| **Suggested Fix** | Set dynamically based on host RAM, or document the tuning:  <br>```yaml
-c effective_cache_size=12GB  # for a 16GB host
```  <br>Or use a `.env` variable: `${DB_EFFECTIVE_CACHE_SIZE:-12GB}`. |

---

### MED-009: `work_mem` 4MB Too Low for Complex Queries (BOM Analysis, AI Embeddings)

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **File** | `docker-compose.yml` (line 71) <br>`podman-compose.yml` (line 78) |
| **Description** | `work_mem=4MB` is the PostgreSQL default. For MITRA's reported workloads (BOM analysis, CAD drawing search, AI embeddings with pgvector), complex joins and sorts will spill to disk, causing orders-of-magnitude slowdowns. A reasonable production value for analytical workloads is 16–64MB. |
| **Current Config** | `-c work_mem=4MB` |
| **Suggested Fix** | ```yaml
-c work_mem=32MB
-c maintenance_work_mem=256MB
``` |

---

### MED-010: `shared_preload_libraries` Not Explicitly Configured for pgvector

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **File** | `docker-compose.yml` / `podman-compose.yml` |
| **Description** | The `pgvector/pgvector:pg16` image likely has pgvector pre-installed, but `shared_preload_libraries` is not explicitly set to include `pgvector`. If the image is ever rebuilt or swapped to a custom PostgreSQL image, the pgvector extension may fail to load. Best practice is to be explicit. |
| **Current Config** | No `-c shared_preload_libraries=...` in command. |
| **Suggested Fix** | ```yaml
-c shared_preload_libraries='pgvector'
```  <br>Also add `CREATE EXTENSION IF NOT EXISTS vector;` to the migration/seed script. |

---

### MED-011: Missing `VOLUME` and `LABEL` Metadata in Backend Dockerfile

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **File** | `mitra-backend/Dockerfile` |
| **Description** | The backend Dockerfile lacks `VOLUME` directives (for `/tmp` or `/app/logs`) and `LABEL` metadata (version, maintainer, description, source). `LABEL` metadata is required by many enterprise container registries and scanning tools for SBOM generation and compliance. |
| **Current Config** | No `VOLUME` or `LABEL` instructions. |
| **Suggested Fix** | ```dockerfile
LABEL org.opencontainers.image.title="MITRA Backend"
LABEL org.opencontainers.image.version="3.2.0"
LABEL org.opencontainers.image.description="Mold Development Lifecycle Management Platform"
LABEL org.opencontainers.image.source="https://github.com/your-org/mitra"
LABEL org.opencontainers.image.licenses="MIT"

VOLUME ["/tmp", "/app/logs"]
``` |

---

## LOW Findings

### LOW-001: Missing `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`

| Field | Detail |
|-------|--------|
| **Severity** | LOW |
| **File** | `mitra-backend/` (root) |
| **Description** | Standard open-source/community governance files are missing. `CHANGELOG.md` exists as `CHANGELOG_v3.2.md` in the root, but `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md` are absent. `SECURITY.md` is especially important for a production platform to guide reporters on how to disclose vulnerabilities responsibly. |
| **Current Config** | `CHANGELOG_v3.2.md` present; others missing. |
| **Suggested Fix** | Create `SECURITY.md`:  <br>```markdown
# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 3.2.x   | ✅ Yes    |
| < 3.2   | ❌ No     |

## Reporting a Vulnerability

Please email security@your-org.com with details. Do not open public issues for security bugs.

## Response Time

We aim to acknowledge reports within 48 hours and release patches within 7 days for critical issues.
``` |

---

### LOW-002: Missing `.editorconfig` and `.prettierrc`

| Field | Detail |
|-------|--------|
| **Severity** | LOW |
| **File** | `mitra-backend/` (root) |
| **Description** | No `.editorconfig` or `.prettierrc` files exist. This leads to inconsistent code formatting (tabs vs. spaces, line endings, quote style) across contributors, increasing noise in diffs and making reviews harder. |
| **Current Config** | Not present. |
| **Suggested Fix** | Create `.editorconfig`:  <br>```ini
root = true
[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```  <br>Create `.prettierrc`:  <br>```json
{ "singleQuote": true, "trailingComma": "all", "semi": true, "printWidth": 100 }
``` |

---

### LOW-003: No `README.md` in Repository Root

| Field | Detail |
|-------|--------|
| **Severity** | LOW |
| **File** | `C:\Users\Srikanth\Desktop\Mitra3.0\README.md` |
| **Description** | The repository root does not contain a `README.md`. While `DEPLOYMENT.md` and `AGENT_SPEC.md` exist, a `README.md` is the first entry point for new developers, operators, and auditors. It should contain: quick-start, architecture overview, deployment instructions, API documentation link, and contribution guidelines. |
| **Current Config** | `README.md` does not exist. |
| **Suggested Fix** | Create `README.md` with: project description, tech stack, quick-start (docker compose), architecture diagram, API docs link, testing instructions, and links to DEPLOYMENT.md and CONTRIBUTING.md. |

---

### LOW-004: Missing `ARG` for Build-Time Secrets in Backend Dockerfile

| Field | Detail |
|-------|--------|
| **Severity** | LOW |
| **File** | `mitra-backend/Dockerfile` |
| **Description** | The Dockerfile does not use `ARG` for build-time secrets (e.g., private npm registry tokens, GitHub PATs for private packages). If private dependencies are ever added, there is no mechanism to pass secrets securely at build time without embedding them in layers. Note: `npm ci --ignore-scripts` already prevents postinstall scripts from running, which is a defense-in-depth measure, but it also prevents legitimate security patches that rely on postinstall (e.g., `patch-package`). |
| **Current Config** | No `ARG` instructions for build secrets. |
| **Suggested Fix** | ```dockerfile
# If private registry or build secrets needed:
ARG NPM_TOKEN
RUN npm config set //registry.npmjs.org/:_authToken=${NPM_TOKEN}
# Or use Docker BuildKit secrets:
RUN --mount=type=secret,id=npmrc,dst=/root/.npmrc npm ci
``` |

---

### LOW-005: `prepare: husky` Script Fails Because `.husky` Directory Does Not Exist

| Field | Detail |
|-------|--------|
| **Severity** | LOW |
| **File** | `mitra-backend/package.json` (line 24) |
| **Description** | The `prepare` script runs `husky`, but there is no `.husky` directory in `mitra-backend/`. This causes `npm install` to fail or print a warning during setup, and no pre-commit hooks are installed. Pre-commit hooks are valuable for running lint, formatting, and secrets-scanning (e.g., `detect-secrets`, `gitleaks`) before code reaches CI. |
| **Current Config** | `"prepare": "husky"` — but no `.husky/` directory. |
| **Suggested Fix** | ```bash
cd mitra-backend
npx husky init
npx husky add .husky/pre-commit "npx lint-staged"
npx husky add .husky/commit-msg "npx commitlint --edit"
```  <br>Add `lint-staged` and `detect-secrets` to the hooks. |

---

### LOW-006: `ci.yml` Workflow Name Still References `v2.1`

| Field | Detail |
|-------|--------|
| **Severity** | LOW |
| **File** | `.github/workflows/ci.yml` (line 1) |
| **Description** | The CI workflow name is `MITRA v2.1 CI`, but the project is at v3.2. This is a cosmetic inconsistency that can confuse operators reading logs and status checks. |
| **Current Config** | `name: MITRA v2.1 CI` |
| **Suggested Fix** | `name: MITRA v3.2 CI` |

---

### LOW-007: `npm ci --ignore-scripts` Prevents Postinstall Security Patches

| Field | Detail |
|-------|--------|
| **Severity** | LOW |
| **File** | `mitra-backend/Dockerfile` (line 11, 31) |
| **Description** | `npm ci --ignore-scripts` is used in both the builder and runner stages. While this is an excellent defense against supply-chain attacks (malicious postinstall scripts), it also prevents legitimate postinstall hooks such as `patch-package` (which applies security patches to nested dependencies) or `node-sass` rebuilds. This is a trade-off that should be documented. If the project ever needs postinstall patches, they will silently fail. |
| **Current Config** | `RUN npm ci --ignore-scripts` (builder)  <br>`RUN npm ci --omit=dev --ignore-scripts` (runner) |
| **Suggested Fix** | **Document the trade-off in `SECURITY.md`.**  <br>If postinstall patches are needed, switch to a multi-stage build where only trusted packages run postinstall:  <br>```dockerfile
RUN npm ci --omit=dev --ignore-scripts && \
    npm rebuild bcryptjs --build-from-source
``` |

---

## Items Already Addressed (Verified Correct)

The following items from the audit checklist are **already implemented correctly** and require no action:

| Item | Status | Evidence |
|------|--------|----------|
| Non-root container user | ✅ OK | `mitra-backend/Dockerfile` line 25: `adduser -u 1001 -S mitra` ; line 45: `USER mitra` |
| `HEALTHCHECK` present | ✅ OK | `mitra-backend/Dockerfile` lines 42–43; `docker-compose.yml` lines 153–157 |
| `EXPOSE` in backend Dockerfile | ✅ OK | `mitra-backend/Dockerfile` line 47: `EXPOSE 3001` |
| Custom `networks` isolation | ✅ OK | `docker-compose.yml` lines 31–36; `podman-compose.yml` lines 38–43 |
| `max_connections` tuning | ✅ OK | `docker-compose.yml` line 69: `-c max_connections=200` |
| `minio` package is v8+ | ✅ OK | `package.json` line 46: `"minio": "^8.0.2"` (resolved to `8.0.7` in lockfile) |
| `tsconfig.json` `paths` mapping | ✅ OK | `tsconfig.json` lines 22–35; `jest` `moduleNameMapper` mirrors these paths |
| `testRegex` for e2e tests | ✅ OK | `test/jest-e2e.json` line 9: `"testRegex": ".e2e-spec.ts$"` |
| `npm audit` in CI/CD | ✅ OK | `.github/workflows/ci.yml` lines 45–59 |
| `docker build` test in CI | ✅ OK | `.github/workflows/ci.yml` lines 96–124 |
| `postgres` not running as root | ✅ OK | `pgvector/pgvector:pg16` uses `postgres` user (UID 999) by default |

---

## Remediation Priority Matrix

| Priority | Finding IDs | Action |
|----------|-------------|--------|
| **P0 — Immediate** | CRIT-001, CRIT-002, CRIT-003, CRIT-004, CRIT-005, CRIT-006 | Patch CVEs, harden DB sync, enforce Redis auth, add container security contexts, enable TLS, integrate secret manager. |
| **P1 — This Sprint** | CRIT-007, HIGH-001, HIGH-002, HIGH-003, HIGH-004, HIGH-005, HIGH-006, HIGH-007, HIGH-008, HIGH-009, HIGH-012, HIGH-013, HIGH-014, HIGH-017, HIGH-018 | Fix helmet config, tighten rate limits, add `.dockerignore`, fix `COPY --chown`, enable `strict: true`, remove `passWithNoTests`, add coverage thresholds, add ESLint config, disable source maps, fix CI gates, add container scans. |
| **P2 — Next Sprint** | HIGH-010, HIGH-011, HIGH-015, HIGH-016, HIGH-019, MED-001, MED-002, MED-003, MED-004, MED-005, MED-007, MED-008, MED-009, MED-010, MED-011 | Metadata, coverage paths, CI smoke tests, fix e2e setup, NestJS config, package.json metadata, local dev overrides, PostgreSQL tuning, backup strategy. |
| **P3 — Backlog** | LOW-001, LOW-002, LOW-003, LOW-004, LOW-005, LOW-006, LOW-007 | Governance files, editor configs, README, build-time secrets, husky hooks, documentation. |

---

## Appendix: Docker Compose Security Context Template

Apply the following to **all** services in `docker-compose.yml` and `podman-compose.yml` as a starting point for hardening:

```yaml
services:
  backend:
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
      nproc:
        soft: 65536
        hard: 65536
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
      - /app/logs:noexec,nosuid,size=50m
    # Ensure USER mitra in Dockerfile + COPY --chown

  postgres:
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
```

---

*End of Report*
