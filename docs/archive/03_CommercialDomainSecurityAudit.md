# Commercial Domain Security Audit

## Sprint 1 — Security Review

---

### Authentication

| Endpoint | Guard | Status | Notes |
|----------|-------|--------|-------|
| All endpoints | `@UseGuards(JwtAuthGuard)` | ✅ | JWT required for all access |
| Auth mechanism | Bearer token via `@ApiBearerAuth()` | ✅ | Swagger documents correctly |

### Authorization (RBAC)

| Endpoint | Roles | Status | Notes |
|----------|-------|--------|-------|
| GET /commercial/customers | None (JWT only) | ⚠️ | Authenticated users can list all customers. No role restriction. |
| GET /commercial/customers/:id | None (JWT only) | ⚠️ | Same — read access for any authenticated user |
| POST /commercial/customers | ADMIN, MANAGEMENT, SALES | ✅ | |
| PATCH /commercial/customers/:id | ADMIN, MANAGEMENT, SALES | ✅ | |
| DELETE /commercial/customers/:id | ADMIN, MANAGEMENT | ✅ | |
| GET /commercial/enquiries | None (JWT only) | ⚠️ | |
| GET /commercial/enquiries/:id | None (JWT only) | ⚠️ | |
| POST /commercial/enquiries | ADMIN, MANAGEMENT, SALES, DESIGN, PLANNING, PRODUCTION, QUALITY | ✅ | |
| PATCH /commercial/enquiries/:id | ADMIN, MANAGEMENT, SALES, DESIGN, PLANNING, PRODUCTION, QUALITY | ✅ | |
| DELETE /commercial/enquiries/:id | ADMIN, MANAGEMENT | ✅ | |
| Action endpoints (submit/review/cancel/lost) | ADMIN, MANAGEMENT, SALES | ✅ | |
| GET /commercial/quotations | None (JWT only) | ⚠️ | |
| GET /commercial/quotations/:id | None (JWT only) | ⚠️ | |
| POST /commercial/quotations | ADMIN, MANAGEMENT, SALES | ✅ | |
| PATCH /commercial/quotations/:id | ADMIN, MANAGEMENT, SALES | ✅ | |
| Action endpoints (send/accept/reject) | ADMIN, MANAGEMENT, SALES | ✅ | |

**Risk:** Read endpoints lack role restrictions. Any authenticated user (including DESIGN, PLANNING, PRODUCTION, QUALITY) can read all commercial data. If the requirement is that only SALES/MANAGEMENT/ADMIN should see commercial data, role guards should be added.

### Tenant Isolation

| Check | Status | Notes |
|-------|--------|-------|
| All queries filter by `tenantId` | ✅ | `TenantAwareService` adds tenant filter globally |
| Cross-tenant access returns 404 | ✅ | IDOR protection: returns NotFoundException (not 403) |
| Tenant ID from JWT | ✅ | `@CurrentUser() user: AuthUser` provides `user.tenantId` |
| No tenantId spoofing | ✅ | `tenantId` is never accepted from request body; always from JWT |

### Input Validation

| Check | Status | Notes |
|-------|--------|-------|
| UUID validation on path params | ✅ | `ParseUUIDPipe` on all `:id` params |
| DTO validation | ✅ | `class-validator` decorators on all DTOs |
| String length limits | ✅ | `@MinLength`, `@MaxLength` on string fields |
| Number bounds | ✅ | `@Min(0)` on amounts, `@IsInt()` on integers |
| Optional fields | ✅ | `@IsOptional()` on nullable fields |

### Mass Assignment Protection

| Check | Status | Notes |
|-------|--------|-------|
| `extractAllowedFields()` filters protected fields | ✅ | `TenantAwareService` strips `id`, `createdAt`, `updatedAt`, `deletedAt`, `createdBy`, `updatedBy`, `tenantId` |
| DTOs define exact allowed fields | ✅ | Each DTO explicitly lists fields |

### SQL Injection

| Check | Status | Notes |
|-------|--------|-------|
| TypeORM parameterized queries | ✅ | All queries use TypeORM's parameterized query builder |
| No raw SQL queries in services | ✅ | Raw SQL only in migration files |
| Migration SQL doesn't use user input | ✅ | Static SQL |

### Sensitive Data Exposure

| Check | Status | Notes |
|-------|--------|-------|
| No passwords exposed | ✅ | |
| No tokens in responses | ✅ | |
| No PII in error messages | ✅ | Exceptions return generic messages |
| Swagger docs don't leak secrets | ✅ | |

### Swagger Security

| Check | Status | Notes |
|-------|--------|-------|
| `@ApiBearerAuth()` on all controllers | ✅ | |
| `@ApiTags('commercial')` consistent | ✅ | |
| All endpoints documented | ✅ | `@ApiOperation()` on all endpoints |

### Audit Trail

| Check | Status | Notes |
|-------|--------|-------|
| `createdBy` / `updatedBy` on all entities | ✅ | From `IndustrialBaseEntity` |
| `AuditInterceptor` logs all requests | ✅ | Global interceptor |
| Soft delete preserves history | ✅ | `deletedAt` timestamp set, record not removed |

---

### Recommendations

1. **Add role guards to read endpoints** if commercial data should be restricted to SALES/MANAGEMENT/ADMIN roles.
2. **Consider rate limiting** on mutation endpoints (create, update, delete).
3. **Add payload size limits** for POST/PATCH endpoints.

---

### Security Score: 85/100

Deducted points for unprotected read endpoints and missing EventBus (P0-1).
