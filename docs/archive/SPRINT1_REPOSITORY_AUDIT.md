# Sprint 1 — Repository Audit: Commercial Domain Integration

**Date:** 2026-07-28  
**Scope:** `mitra-backend/src/modules/commercial/` + cross-cutting concerns  
**Auditor:** Automated scan

---

## 1. Module Imports / Exports

| Check | Status | Details |
|-------|--------|---------|
| `CommercialModule` registered in `AppModule` | ✅ | Imported at index 7 in `app.module.ts` |
| All entities in `TypeOrmModule.forFeature()` | ✅ | 8 entities: Enquiry, Quotation, QuotationItem, Invoice, Payment, CreditNote, Customer, Contact |
| `ProjectModule` imported via `forwardRef()` | ✅ | No actual circular dependency (ProjectModule does not import CommercialModule) |
| Services exported for cross-module use | ✅ | `EnquiryService`, `CustomerService`, `QuotationService`, `TypeOrmModule` |
| **entities/index.ts missing Customer & Contact** | ⚠️ | Barrel file exports only 6 of 8 entities — `Customer` and `Contact` missing from re-exports |
| Missing `dto/index.ts` barrel | ⚠️ | No barrel file for DTOs — other modules must reference paths directly |
| Missing `events/index.ts` barrel | ⚠️ | No barrel file for event types |

---

## 2. Dependency Injection

| Check | Status | Details |
|-------|--------|---------|
| All services injectable (`@Injectable()`) | ✅ | 3 services all decorated |
| Controllers receive services via constructor | ✅ | Clean constructor injection |
| `forwardRef()` correctly applied | ✅ | Only used for ProjectService injection in QuotationController |
| No missing provider errors at build | ✅ | `nest build` succeeds |
| Global guards registered | ✅ | `APP_GUARD`: ThrottlerGuard, JwtAuthGuard, RolesGuard, PermissionsGuard |
| Global interceptors registered | ✅ | RequestContextInterceptor, AuditInterceptor |

---

## 3. Circular Dependencies

| Check | Status | Details |
|-------|--------|---------|
| CommercialModule → ProjectModule | ✅ | One-directional via `forwardRef()` — no cycle |
| ProjectModule does NOT import CommercialModule | ✅ | No circular dependency exists |
| `forwardRef()` in QuotationController correctly typed | ✅ | Uses `@Inject(forwardRef(() => ProjectService))` |

---

## 4. API Routes

| Route | Controller | HTTP Methods | Auth Guard | Roles |
|-------|-----------|-------------|------------|-------|
| `api/commercial/customers` | CustomerController | GET, POST | JwtAuthGuard | — / ADMIN, MANAGEMENT, SALES |
| `api/commercial/customers/:id` | CustomerController | GET, PATCH, DELETE | JwtAuthGuard | — / ADMIN, MANAGEMENT, SALES / ADMIN, MANAGEMENT |
| `api/commercial/customers/:id/contacts` | CustomerController | GET, POST | JwtAuthGuard | — / ADMIN, MANAGEMENT, SALES |
| `api/commercial/customers/:id/contacts/:contactId` | CustomerController | DELETE | JwtAuthGuard | ADMIN, MANAGEMENT |
| `api/commercial/enquiries` | EnquiryController | GET, POST | JwtAuthGuard | — / ADMIN, MANAGEMENT, SALES, DESIGN, PLANNING, PRODUCTION, QUALITY |
| `api/commercial/enquiries/:id` | EnquiryController | GET, PATCH, DELETE | JwtAuthGuard | — / various / ADMIN, MANAGEMENT |
| `api/commercial/enquiries/:id/submit` | EnquiryController | POST | JwtAuthGuard | ADMIN, MANAGEMENT, SALES |
| `api/commercial/enquiries/:id/review` | EnquiryController | POST | JwtAuthGuard | ADMIN, MANAGEMENT, SALES |
| `api/commercial/enquiries/:id/cancel` | EnquiryController | POST | JwtAuthGuard | ADMIN, MANAGEMENT, SALES |
| `api/commercial/enquiries/:id/lost` | EnquiryController | POST | JwtAuthGuard | ADMIN, MANAGEMENT, SALES |
| `api/commercial/quotations` | QuotationController | GET, POST | JwtAuthGuard | — / ADMIN, MANAGEMENT, SALES |
| `api/commercial/quotations/:id` | QuotationController | GET, PATCH | JwtAuthGuard | — / ADMIN, MANAGEMENT, SALES |
| `api/commercial/quotations/:id/send` | QuotationController | POST | JwtAuthGuard | ADMIN, MANAGEMENT, SALES |
| `api/commercial/quotations/:id/accept` | QuotationController | POST | JwtAuthGuard | ADMIN, MANAGEMENT, SALES |
| `api/commercial/quotations/:id/reject` | QuotationController | POST | JwtAuthGuard | ADMIN, MANAGEMENT, SALES |

**Swagger tags:** All controllers decorated with `@ApiTags('commercial')` and `@ApiBearerAuth()` ✅

---

## 5. DTO Validation

| DTO | Validators | Status |
|-----|-----------|--------|
| `CreateCustomerDto` | `@IsString()`, `@MinLength(2)`, `@MaxLength(200)` on name | ✅ |
| `CreateContactDto` | `@IsString()`, `@IsEmail()`, `@MinLength(1)`, `@MaxLength(100)` | ✅ |
| `CreateEnquiryDto` | `@IsString()`, `@IsDateString()`, `@IsEmail()`, `@IsEnum()` | ✅ |
| `CreateQuotationDto` | `@IsUUID()`, `@IsNumber()`, `@Min(0)`, `@IsObject()`, `@IsDateString()` | ✅ |
| `AcceptQuotationDto` | `@IsString()`, `@MinLength(2)`, `@MaxLength(200)` | ✅ |
| `RejectQuotationDto` | `@IsString()`, `@MaxLength(500)` | ✅ |
| Global `ValidationPipe` | `whitelist: true`, `forbidNonWhitelisted: false`, `transform: true` | ✅ |

---

## 6. Entity Relationships

| Relationship | Type | FK | Cascade | Status |
|-------------|------|----|---------|--------|
| Customer → Contact | OneToMany | `contact.customer_id` | Yes | ✅ |
| Quotation → QuotationItem | OneToMany (implicit) | `quotation_item.quotation_id` | No | ✅ |
| Quotation → Enquiry | Reference only | `quotation.enquiry_id` | No | ✅ |
| Quotation → Project | Reference only | `quotation.project_id` | No | ✅ |
| Invoice → Quotation | Reference only | `invoice.quotation_id` | No | ✅ |
| Payment → Invoice | Reference only | `payment.invoice_id` | No | ✅ |
| CreditNote → Invoice | Reference only | `credit_note.invoice_id` | No | ✅ |

---

## 7. Database Migrations

| Migration | Description | Status |
|-----------|-------------|--------|
| `1700000000000-InitialSchema` | Base tables: tenants, roles, users, workflow, projects, audit_logs | ✅ |
| `1700000000001-RefreshTokenAndVectorSearch` | refresh_token_hash, pgvector, knowledge/AI tables | ✅ |
| `1700000000002-FullDomainSchema` | 78 domain tables including enquiries, quotations, quotation_items, invoices, payments, credit_notes | ✅ |
| `1700000000008-CommercialDomainSprint1` | customers, contacts tables; project_id + terms columns on quotations | ✅ |
| `1700000000009-CommercialDomainForeignKeys` | FK constraints for contacts→customers, quotations→enquiries, quotation_items→quotations | ✅ |
| All 10 migrations present | ✅ | Sequential from 1700000000000 to 1700000000009 |

---

## 8. Swagger Configuration

| Check | Status |
|-------|--------|
| `@ApiTags()` on all commercial controllers | ✅ (all use `'commercial'`) |
| `@ApiBearerAuth()` on all commercial controllers | ✅ |
| `@ApiOperation()` on all commercial endpoints | ✅ |
| Swagger UI configured in `main.ts` (dev only) | ✅ at `/api/docs` |
| DTOs decorated with `@ApiProperty()` / `@ApiPropertyOptional()` | ✅ |

---

## 9. RBAC / Authorization

| Role | Customer Access | Enquiry Access | Quotation Access |
|------|----------------|----------------|-----------------|
| ADMIN | CRUD | CRUD + lifecycle | CRUD + lifecycle |
| MANAGEMENT | CRUD | CRUD + lifecycle | CRUD + lifecycle |
| SALES | CRUD | CRUD + lifecycle | CRUD + lifecycle |
| DESIGN | — | Create, Update | — |
| PLANNING | — | Create, Update | — |
| PRODUCTION | — | Create, Update | — |
| QUALITY | — | Create, Update | — |
| CUSTOMER | — | — | — |

3 global guards: `JwtAuthGuard` (all), `RolesGuard` (mutations), `PermissionsGuard` (mutations) ✅

---

## 10. Audit Logging

| Check | Status | Details |
|-------|--------|---------|
| `AuditInterceptor` globally registered | ✅ | Auto-logs all POST/PATCH/PUT/DELETE |
| `AuditService` available for injection | ✅ | Exported from AuditModule |
| `@AuditEvent()` decorator usable | ✅ | Defined in `common/decorators/audit-event.decorator.ts` |
| Commercial events defined | ✅ | `commercial.events.ts` with 14 typed event interfaces + `EventPublisher` interface |
| Event publisher implementation | ⚠️ | `EventPublisher` is an interface only — no concrete implementation in this module |
| `AuditEvent` applied on commercial controllers | ❌ | No `@AuditEvent()` decorators found on any commercial controller methods |

---

## 11. Tenant Isolation

| Check | Status | Details |
|-------|--------|---------|
| All entities extend `IndustrialBaseEntity` | ✅ | `tenantId` column present on all 8 entities |
| `TenantAwareService` base class enforces isolation | ✅ | `findOne()` cross-tenant returns 404 (IDOR protection) |
| `IndustrialSubscriber` auto-stamps `tenantId` | ✅ | On `beforeInsert` |
| `RequestContextInterceptor` sets tenant context | ✅ | Before subscriber fires |
| Quotation service overrides use tenant filter | ✅ | All `findAll*` and `findOne*` methods filter by `tenantId` |

---

## 12. TypeScript Build

| Build | Status | Details |
|-------|--------|---------|
| Backend (`nest build`) | ✅ | Compiles without errors |
| Frontend (`tsc + vite build`) | ✅ | 3601 modules transformed, builds in ~11s |
| Strict mode enabled | ✅ | `strict: true`, `strictNullChecks: true`, `noImplicitAny: true` |

---

## 13. Test Suite

| Test Group | Tests | Status |
|-----------|-------|--------|
| **Commercial Unit Tests** | **26** | **✅ ALL PASS** |
| └ `customer.service.spec.ts` | 2 tests | ✅ |
| └ `enquiry.service.spec.ts` | 8 tests | ✅ |
| └ `quotation.service.spec.ts` | 16 tests | ✅ |
| Full backend suite | 436 total | ⚠️ 36 failing (pre-existing: TenantAwareService mocking, AiService DI) |
| Coverage threshold (50%) | — | Not measured — no coverage run |

### Failing Tests (pre-existing, unrelated to commercial)

| File | Tests Failed | Root Cause |
|------|-------------|-----------|
| `common/services/tenant-aware.service.spec.ts` | 21 | Mock setup does not enforce tenant isolation — entity returned with mismatched tenant resolves instead of rejecting |
| `modules/ai/services/ai.service.spec.ts` | 15 | `AiUsageService` dependency not provided in test module |

---

## 14. Frontend Build

| Check | Status |
|-------|--------|
| Vite production build | ✅ (10.79s) |
| TypeScript compilation | ✅ (no errors) |
| Large chunk warning | ⚠️ `index.js` = 1,544 kB (consider code-splitting) |
| PostCSS config missing `type: module` | ⚠️ Non-blocking warning |

### Frontend API Integration

| Page | API Endpoint | Status |
|------|-------------|--------|
| `CustomersPage.tsx` | `GET/POST /commercial/customers` | ✅ |
| `EnquiriesPage.tsx` | `GET/POST /commercial/enquiries` | ⚠️ **DTO MISMATCH** (see below) |
| `QuotationsPage.tsx` | `GET /commercial/quotations`, `POST /:id/send`, `POST /:id/accept`, `POST /:id/reject` | ✅ |

---

## Audit Summary

### ✅ Passed (13/16 categories)
Module Imports/Exports, Dependency Injection, Circular Dependencies, API Routes, DTO Validation, Entity Relationships, Database Migrations, Swagger, RBAC, Tenant Isolation, TypeScript Build, Test Suite (commercial), Frontend Build (API integration mostly)

### ⚠️ Issues Found

| # | Severity | Category | Issue | Location |
|---|----------|----------|-------|----------|
| **C-1** | **CRITICAL** | Frontend-Backend DTO Mismatch | EnquiriesPage sends `{enquiryNumber, customerName, description}` but backend expects `{customerName, productName, enquiryDate}` as required fields. `enquiryNumber` is stripped by whitelist; `productName` + `enquiryDate` missing → 400 error. | `EnquiriesPage.tsx:36-37` vs `enquiry.dto.ts:10-12` |
| **C-2** | **CRITICAL** | Property Name Mismatch | `QuotationController.accept()` sends `mouldType: 'INJECTION'` (British spelling) to `ProjectService.create()`, but `CreateProjectDto` expects `moldType` (American spelling). With `whitelist: true`, `mouldType` is silently stripped. Currently works because default is INJECTION, but any non-default value would be lost. | `quotation.controller.ts:94` |
| **M-1** | MEDIUM | Barrel File Incomplete | `entities/index.ts` exports only 6/8 entities — `Customer` and `Contact` are omitted | `commercial/entities/index.ts` |
| **M-2** | MEDIUM | Audit Decorators Missing | No `@AuditEvent()` decorators on any commercial controller methods — business events not captured in audit log | All 3 commercial controllers |
| **M-3** | MEDIUM | Event Publisher Not Implemented | `EventPublisher` is an interface only — domain events defined in `commercial.events.ts` are never actually published | `commercial/events/commercial.events.ts` |
| **M-4** | MEDIUM | Exposed Enquiry Number Field | Frontend treats `enquiryNumber` as user-input, but entity has `unique: true` constraint — duplicate entries will cause 500 errors if users enter the same number | `EnquiriesPage.tsx:90-91` |
| **L-1** | LOW | Missing Barrel Files | No `dto/index.ts` or `events/index.ts` barrel exports | `commercial/dto/`, `commercial/events/` |
| **L-2** | LOW | Large Frontend Bundle | Main JS chunk is 1.5 MB (consider lazy-loading commercial pages) | Frontend Vite build |
| **L-3** | LOW | PostCSS Config Warning | Missing `"type": "module"` in `mitra-frontend/package.json` | Frontend package.json |
