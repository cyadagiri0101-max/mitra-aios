# Sprint 1 Release Notes — Commercial Domain

**Version:** 3.2.0-sprint1  
**Release Date:** 2026-07-28  
**Status:** ✅ Ready for Release

---

## Completed Features

### Customer Management
- Full CRUD for customer records with name, industry, flexible attributes
- Contact management (add, list, remove) with primary flag handling
- Soft-delete support
- Tenant-scoped isolation

### Enquiry / RFQ Management
- Enquiry creation with customer details, product info, mold type, volumes
- Status state machine: DRAFT → SUBMITTED → UNDER_REVIEW → CONVERTED / LOST / CANCELLED
- Status transition endpoints with validation

### Quotation Management
- Quotation creation from RFQ with auto-numbering (QTN-YYYY-NNNN)
- Line item support via QuotationItem entity
- Status state machine: DRAFT → SENT → ACCEPTED → PROJECT_CREATED / REJECTED
- Send, accept, and reject workflow

### Automatic Project Creation
- Quotation acceptance triggers `ProjectService.create()`
- Auto-generates project number (PRJ-YYYY-NNNN)
- Links project back to quotation
- Auto-creates workflow instance for mold_project lifecycle

### Cross-Cutting
- JWT authentication on all endpoints
- Role-based access control (ADMIN, MANAGEMENT, SALES, DESIGN, PLANNING, PRODUCTION, QUALITY)
- Tenant isolation via IndustrialBaseEntity + TenantAwareService
- Audit logging via global AuditInterceptor
- Soft-delete on all entities
- Global validation with class-validator + whitelist
- Swagger documentation at `/api/docs`

### Frontend Pages
- `/customers` — Customer CRUD with inline contact creation
- `/enquiries` — Enquiry listing and creation
- `/quotations` — Quotation lifecycle management (send, accept, reject, view project)

---

## Fixed Issues (This Sprint)

| ID | Description | Severity | Resolution |
|----|------------|----------|------------|
| C-1 | EnquiriesPage frontend sends wrong DTO fields (`enquiryNumber`, `description`) — backend expects `productName`, `enquiryDate` | Critical | ✅ Updated form schema, fields, and submission payload |
| C-2 | `QuotationController` sends `mouldType` (British) but `CreateProjectDto` expects `moldType` (American) — silently stripped by whitelist | Critical | ✅ Fixed to `moldType: 'INJECTION'` |
| M-1 | `entities/index.ts` missing `Customer` and `Contact` re-exports | Medium | ✅ Added missing exports |
| M-4 | Enquiry number exposed as user-editable field despite `unique` DB constraint | Medium | ✅ Changed to auto-generated (removed from form) |

---

## Build Artifacts

| Artifact | Status |
|----------|--------|
| Backend `nest build` | ✅ Passes |
| Frontend `tsc + vite build` | ✅ Passes (3601 modules, ~11s) |
| Commercial unit tests (26 tests) | ✅ All pass |
| Full test suite (436 tests) | ⚠️ 36 pre-existing failures (see KNOWN_LIMITATIONS.md) |

---

## API Surface

### Customer Endpoints
| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/commercial/customers` | Authenticated |
| GET | `/api/commercial/customers/:id` | Authenticated |
| POST | `/api/commercial/customers` | ADMIN, MANAGEMENT, SALES |
| PATCH | `/api/commercial/customers/:id` | ADMIN, MANAGEMENT, SALES |
| DELETE | `/api/commercial/customers/:id` | ADMIN, MANAGEMENT |
| GET | `/api/commercial/customers/:id/contacts` | Authenticated |
| POST | `/api/commercial/customers/:id/contacts` | ADMIN, MANAGEMENT, SALES |
| DELETE | `/api/commercial/customers/:id/contacts/:contactId` | ADMIN, MANAGEMENT |

### Enquiry Endpoints
| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/commercial/enquiries` | Authenticated |
| GET | `/api/commercial/enquiries/:id` | Authenticated |
| POST | `/api/commercial/enquiries` | ADMIN, MANAGEMENT, SALES, DESIGN, PLANNING, PRODUCTION, QUALITY |
| PATCH | `/api/commercial/enquiries/:id` | ADMIN, MANAGEMENT, SALES, DESIGN, PLANNING, PRODUCTION, QUALITY |
| DELETE | `/api/commercial/enquiries/:id` | ADMIN, MANAGEMENT |
| POST | `/api/commercial/enquiries/:id/submit` | ADMIN, MANAGEMENT, SALES |
| POST | `/api/commercial/enquiries/:id/review` | ADMIN, MANAGEMENT, SALES |
| POST | `/api/commercial/enquiries/:id/cancel` | ADMIN, MANAGEMENT, SALES |
| POST | `/api/commercial/enquiries/:id/lost` | ADMIN, MANAGEMENT, SALES |

### Quotation Endpoints
| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/commercial/quotations` | Authenticated |
| GET | `/api/commercial/quotations/:id` | Authenticated |
| POST | `/api/commercial/quotations` | ADMIN, MANAGEMENT, SALES |
| PATCH | `/api/commercial/quotations/:id` | ADMIN, MANAGEMENT, SALES |
| POST | `/api/commercial/quotations/:id/send` | ADMIN, MANAGEMENT, SALES |
| POST | `/api/commercial/quotations/:id/accept` | ADMIN, MANAGEMENT, SALES |
| POST | `/api/commercial/quotations/:id/reject` | ADMIN, MANAGEMENT, SALES |

---

## Database Schema (10 Migrations)

| Migration | Tables |
|-----------|--------|
| `1700000000000` | tenants, roles, permissions, role_permissions, users, workflow, projects, audit_logs |
| `1700000000001` | refresh tokens, knowledge embeddings, AI conversations |
| `1700000000002` | enquiries, quotations, quotation_items, invoices, payments, credit_notes + 70+ domain tables |
| `1700000000008` | customers, contacts (Sprint 1 additions) |
| `1700000000009` | FK constraints (contacts→customers, quotations→enquiries, quotation_items→quotations) |
