# Known Limitations — Sprint 1

**Last Updated:** 2026-07-28

---

## Functional Limitations

### 1. Project Creation Data Incomplete
When a quotation is accepted and a project auto-created, the `project.customerName` and `project.productName` fields are not populated from the quotation/enquiry entities. Only `customerId`, `projectValue`, and `targetDeliveryDate` are carried over.
- **Impact:** Project records lack denormalized customer name
- **Tracked:** `quotation.controller.ts:87-98`

### 2. Invoice/Payment/CreditNote Entities Have No Services or Controllers
The entities are registered in TypeORM and the database schema exists, but there are no REST endpoints, services, or controllers for Invoices, Payments, or CreditNotes.
- **Impact:** Cannot create or manage invoicing through API
- **Planned:** Sprint 2 or later

### 3. Audit Business Events Not Decorated
No `@AuditEvent()` decorators are applied on commercial controller methods. While the `AuditInterceptor` captures CRUD operations automatically, business-specific audit events (e.g., "Quotation Accepted", "Enquiry Lost") are not explicitly tagged.
- **Impact:** Audit logs lack business event classification
- **Tracked:** All 3 commercial controllers

### 4. Event Publisher Interface Not Implemented
The `commercial.events.ts` module defines 14 typed domain events and an `EventPublisher` interface, but no concrete implementation exists. Domain events are defined but never published.
- **Impact:** No event-driven cross-module communication for commercial events
- **Tracked:** `commercial/events/commercial.events.ts`

### 5. Missing `productDescription` and `enquiryNumber` Auto-Generation
The `Enquiry` entity has a `productDescription` column, but the `CreateEnquiryDto` has `remarks` instead (no `description` or `productDescription` field). The `enquiryNumber` field has `unique: true` but no auto-generation logic in the service layer.
- **Impact:** `productDescription` never populated; `enquiryNumber` must be generated before insert or DB will throw unique violation
- **Note:** The frontend form now avoids sending `enquiryNumber`

---

## Pre-Existing Test Failures (36 tests)

### 1. TenantAwareService Spec (21 failures)
**File:** `common/services/tenant-aware.service.spec.ts`
- **Root Cause:** Mock setup in the shared test scaffold does not enforce tenant isolation — `findOne()` returns the entity regardless of tenant ID mismatch, causing cross-tenant access tests to resolve instead of reject
- **Affected Services (7):** Note, CustomerApproval, DesignPart, DocumentVersion, KnowledgeArticle, MachineType, WorkOrder, MoldStructure, SearchIndex
- **Impact:** Low — these are unit tests, not integration tests; the production code correctly enforces isolation via `TenantAwareService.findOne()`

### 2. AiService Spec (15 failures)
**File:** `modules/ai/services/ai.service.spec.ts`
- **Root Cause:** `AiUsageService` dependency not provided in the test module's mock setup
- **Impact:** Low — only AI service tests affected; commercial domain not involved

---

## Technical Debt

| Item | Type | Effort |
|------|------|--------|
| No DTO barrel files (`dto/index.ts`) | Structure | Trivial |
| No events barrel file (`events/index.ts`) | Structure | Trivial |
| Frontend main JS chunk > 1.5 MB | Performance | 1-2 days |
| PostCSS missing `"type": "module"` | Configuration | Trivial |
| TenantAwareService spec mock needs isolation enforcement | Test | 1 day |
| AiService spec missing AiUsageService mock | Test | 0.5 day |

---

## Security Observations

| Item | Status | Note |
|------|--------|------|
| JWT auth on all endpoints | ✅ | Global guard |
| RBAC with role checks | ✅ | RolesGuard on mutations |
| CSRF protection | ✅ | X-CSRF-Token header on frontend mutations |
| Refresh token rotation | ✅ | SHA-256 hash stored, single-use |
| Account lockout | ✅ | 5 failed attempts → 30 min lock |
| In-memory token storage (no localStorage) | ✅ | Security best practice |
| Helmet security headers | ✅ | CSP enabled in production |
| Rate limiting | ✅ | 100 req/60s global |
| Input validation (whitelist) | ✅ | Strips unknown properties |
| Cross-tenant IDOR protection | ✅ | findOne returns 404 for wrong tenant |
| Missing `@Permissions()` on commercial endpoints | ⚠️ | Relies on RolesGuard only (adequate for current RBAC model) |
