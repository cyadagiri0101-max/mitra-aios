# Security Architecture

## Purpose

This document defines the security architecture for MITRA — covering authentication, authorization, encryption, secrets management, file protection, and operational security.

---

## Security Principles

1. **Defense in depth.** Multiple layers of security controls — network, application, data, storage.
2. **Least privilege.** Every identity gets only the permissions it needs, nothing more.
3. **Secure by default.** Default configurations are secure; insecure configurations require explicit choice.
4. **Zero trust.** Every request is authenticated and authorized, regardless of origin.
5. **Audit everything.** Every security-relevant event is logged and immutable.

---

## Authentication

### JWT-Based Authentication

```
Login ──► Validate credentials ──► Issue JWT ──► Client stores token
  ▲                                                  │
  │                                                  ▼
  └────────── Refresh token ◄──── Expiry ◄───── API requests with Bearer token
```

### Token Structure

```json
{
  "sub": "u_abc123",
  "email": "user@mitra.local",
  "roles": ["engineer", "project_lead"],
  "iat": 1722071400,
  "exp": 1722075000,
  "iss": "mitra-auth",
  "jti": "jti_def456"
}
```

### Token Lifetimes

| Token | Lifetime | Storage |
|-------|----------|---------|
| Access Token | 15 minutes | Memory (HTTP-only cookie or Authorization header) |
| Refresh Token | 7 days | HTTP-only Secure cookie or secure storage |
| Session Token | Configurable (1-24 hours) | Redis |

### Authentication Flow

1. User submits credentials to `POST /api/v1/auth/login`.
2. Server validates against `security.users` (bcrypt hash comparison).
3. Server generates access token (JWT) + refresh token.
4. Client stores access token in memory; refresh token in HTTP-only cookie.
5. On expiry (401), client uses refresh token to get a new access token.
6. On refresh token expiry, user must re-authenticate.

### Password Policy

- Minimum 12 characters.
- Must contain uppercase, lowercase, digit, and special character.
- Hash algorithm: bcrypt with cost factor 12.
- Passwords are never logged, stored in plaintext, or transmitted in URLs.
- Rate limiting: 5 attempts per minute per user.

---

## Authorization

Authorization is handled at three levels:

| Level | Enforcement | Mechanism |
|-------|-------------|-----------|
| API Gateway | Request-level | JWT validation, rate limiting |
| Controller | Resource-level | NestJS Guards (role/permission check) |
| Service | Data-level | Entity ownership and project scope checks |

See PERMISSION_MODEL.md for the full RBAC definition.

---

## Audit Logging

### What Gets Logged

| Event Type | Examples |
|------------|----------|
| Authentication | Login, logout, token refresh, failed login |
| Authorization | Denied access (403), permission escalation |
| CRUD Operations | Create, update, delete of any entity |
| State Transitions | Approve, reject, submit, cancel |
| Engineering Changes | Design changes, BOM modifications |
| Configuration Changes | Role assignments, system settings |
| Data Exports | Report generation, bulk exports |

### Audit Record Schema

```sql
audit_log (
  id            UUID PRIMARY KEY,
  event_id      UUID,
  project_id    UUID,
  domain        VARCHAR(50),
  entity_type   VARCHAR(50),
  entity_id     UUID,
  action        VARCHAR(30),
  actor_id      UUID,
  timestamp     TIMESTAMP DEFAULT NOW(),
  ip_address    INET,
  user_agent    TEXT,
  previous_state JSONB,
  new_state     JSONB,
  metadata      JSONB
);
```

### Audit Log Properties

- **Append-only.** No UPDATE or DELETE operations on audit_log.
- **Immutable.** Once written, records cannot be modified.
- **Retained.** Minimum 1 year (configurable per deployment).
- **Searchable.** Indexed by project_id, actor_id, domain, timestamp.

---

## Encryption

### Data in Transit

| Layer | Protocol | Details |
|-------|----------|---------|
| External | TLS 1.3 | All external API traffic HTTPS |
| Internal | TLS 1.2+ | Inter-service communication over mTLS |
| Database | TLS | PostgreSQL connections encrypted |
| Redis | TLS | Redis connections encrypted (when configured) |

### Data at Rest

| Storage | Encryption | Details |
|---------|------------|---------|
| PostgreSQL | AES-256 | Transparent Data Encryption (TDE) or filesystem-level |
| MinIO (files) | AES-256 | Server-side encryption with customer-managed keys |
| Redis | - | No sensitive data stored in Redis |
| Backups | AES-256 | Backup files encrypted before storage |

### Field-Level Encryption

Certain sensitive fields are encrypted at the application level before storage:

```typescript
// Example: pricing in quotations
@Entity()
export class Quotation {
  @Column({ type: 'text', transformer: encryptTransformer })
  pricingDetails: string;  // encrypted in database, plaintext in application
}
```

Fields requiring encryption:
- Customer pricing and discount information.
- Supplier contact details.
- Internal cost breakdowns.

---

## Secrets Management

### Secret Storage

- **Never in code** or configuration files.
- **Environment variables** for Docker Compose deployments (secrets passed via `SECRETS` env or `.secrets` file).
- **Docker secrets** for production deployments (mounted at `/run/secrets/`).
- **Hashicorp Vault** for enterprise deployments (optional, when configured).

### Secrets Inventory

| Secret | Source | Rotation |
|--------|--------|----------|
| JWT Secret | Environment / Vault | Every 90 days |
| Database Password | Environment / Docker secrets | Every 90 days |
| MinIO Access Key | Environment / Docker secrets | Every 90 days |
| Redis Password | Environment / Docker secrets | Every 90 days |
| Encryption Keys | Vault / Key file | Annually |
| API Keys (integrations) | Vault / Environment | On revocation |

### Secret Access

- Secrets are loaded at application startup.
- Secrets are never logged, printed, or exposed in error messages.
- Secrets are never included in responses or serialized in DTOs.

---

## File Storage Security (CAD Protection)

### MinIO Access Control

- Each project has an isolated bucket or path prefix in MinIO.
- Access is enforced at the application layer — no direct MinIO URL access.
- Presigned URLs with short TTL (5 minutes) for file download.
- CAD files are scanned for embedded metadata before storage.

### File Upload Validation

```typescript
// All file uploads are validated against:
{
  allowedExtensions: ['.step', '.stp', '.igs', '.iges', '.dwg', '.dxf', '.pdf', '.jpg', '.png'],
  maxFileSize: 500 * 1024 * 1024,  // 500 MB
  virusScan: true,                  // ClamAV integration (when available)
  metadataStrip: true               // Strip EXIF/metadata on upload
}
```

### Access Logging

Every file access is logged:

```sql
file_access_log (
  id            UUID PRIMARY KEY,
  file_ref      TEXT,
  project_id    UUID,
  accessed_by   UUID,
  access_type   VARCHAR(20),  -- download, preview, upload
  accessed_at   TIMESTAMP,
  ip_address    INET
);
```

---

## Network Security

### Docker Compose Deployment

```
Internet ──► Nginx (reverse proxy, TLS termination)
                │
                ├──► Frontend (port 80/443 internal)
                │
                └──► Backend API (port 3000 internal, no external exposure)
                        │
                        ├──► PostgreSQL (port 5432 internal only)
                        ├──► Redis (port 6379 internal only)
                        └──► MinIO (port 9000 internal only)
```

- Only ports 80/443 are exposed to the host network.
- Internal services listen on Docker internal network only.
- Database access is restricted to the backend service.
- Redis is password-protected, no external access.

### Production Hardening

- Fail2ban for brute-force protection on login endpoints.
- IP whitelisting for admin endpoints (optional).
- Rate limiting at Nginx level (100 req/sec per IP).
- WAF rules for SQL injection and XSS prevention.

---

## Backup and Recovery Security

See also: BACKUP_AND_RECOVERY.md

- Backups are encrypted with AES-256 before leaving the server.
- Backup encryption key is stored separately from the backup data.
- Backup transfer uses TLS.
- Backup retention: 30 daily, 12 monthly, 3 yearly.
- Recovery requires the backup file + encryption key (two-person rule).

---

## Incident Response

### Security Event Severity

| Severity | Examples | Response Time |
|----------|----------|---------------|
| Critical | Data breach, unauthorized admin access | 15 minutes |
| High | Multiple failed logins, malware detected | 1 hour |
| Medium | Suspicious API pattern, permission misuse | 4 hours |
| Low | Configuration drift, expired certificates | 24 hours |

### Response Workflow

1. **Detect** — Automated alert from audit log monitoring.
2. **Contain** — Revoke tokens, disable user, isolate affected services.
3. **Investigate** — Review audit logs, identify scope.
4. **Remediate** — Patch vulnerability, rotate secrets.
5. **Recover** — Restore from clean backup if needed.
6. **Report** — Document incident, update security procedures.
