# Commercial Domain Technical Debt

## Sprint 1 — Technical Debt Register

---

### Critical Debt

| ID | Description | Location | Impact | Effort to Fix |
|----|-------------|----------|--------|--------------|
| TD-01 | No EventBus (P0-1) | Architecture | Domain events cannot be published. Events stubbed to audit_log. | HIGH |
| TD-02 | Missing `/api/v1/` route prefix | All controllers | Route inconsistency. All routes use `/commercial/...` instead of `/api/v1/commercial/...`. | LOW |

### High Debt

| ID | Description | Location | Impact | Effort to Fix |
|----|-------------|----------|--------|--------------|
| TD-03 | No database transactions in `createWithContacts` | `customer.service.ts` | Partial contact creation on failure. Data inconsistency risk. | LOW |
| TD-04 | No controller-level tests | `controllers/` | Controllers untested. Security and integration logic not verified. | MEDIUM |
| TD-05 | `PaginationDto.search` not implemented | All services | Search field defined but not used for filtering. | LOW |

### Medium Debt

| ID | Description | Location | Impact | Effort to Fix |
|----|-------------|----------|--------|--------------|
| TD-06 | `quotationNumber` generation not retry-safe | `quotation.service.ts` | No retry logic for unique constraint violations on concurrent creation. | LOW |
| TD-07 | Missing foreign key constraints (before migration #9) | Database | Referential integrity not enforced at DB level until FK migration runs. | LOW |
| TD-08 | No structured logging in domain services | All services | Debugging requires AuditInterceptor only. No domain-specific logging. | LOW |
| TD-09 | No rate limiting on mutation endpoints | All controllers | No protection against rapid creation/deletion. | MEDIUM |

### Low Debt

| ID | Description | Location | Impact |
|----|-------------|----------|--------|
| TD-10 | Read endpoints lack role guards | All controllers | Any authenticated user can read commercial data. |
| TD-11 | No cursor-based pagination | All services | Offset pagination becomes inefficient at high offsets. |
| TD-12 | No ESLint configuration | Project | No automated code style enforcement. |
| TD-13 | No API versioning | Controllers | Routes not versioned. Breaking changes affect all clients. |
| TD-14 | No OpenAPI/Swagger response schemas | DTOs | Response DTOs defined but not wired to Swagger `@ApiResponse()`. |

### Resolved Debt

| ID | Description | Resolution |
|----|-------------|------------|
| TD-R1 | `eager: true` on Customer.contacts | Removed eager loading. Now loaded on demand. |
| TD-R2 | `generateQuotationNumber` broken WHERE clause | Fixed from `IsNull()` to `Like()` pattern. |
| TD-R3 | `markLost` allowed from DRAFT state | Fixed to restrict to SUBMITTED/UNDER_REVIEW only. |
| TD-R4 | Missing `@HttpCode(201)` on POST creates | Added to all create endpoints. |
| TD-R5 | Frontend form fields don't match backend DTO | Restructured form to correctly map to `CreateCustomerDto`. |

---

### Technical Debt Ratio

| Metric | Value |
|--------|-------|
| Total debt items | 14 (open) / 5 (resolved) |
| Estimated remediation effort | 5-8 story points |
| Debt ratio (est.) | ~12% of Sprint 1 scope |
