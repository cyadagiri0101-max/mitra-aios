# Commercial Domain Architecture Review

## Sprint 1 — Architecture Compliance

---

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                       CommercialModule                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Enquiry      │  │ Customer     │  │ Quotation              │ │
│  │ Controller   │  │ Controller   │  │ Controller             │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬────────────┘ │
│         │                 │                      │              │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌───────────▼────────────┐ │
│  │ Enquiry      │  │ Customer     │  │ Quotation              │ │
│  │ Service      │  │ Service      │  │ Service                │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬────────────┘ │
│         │                 │                      │              │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌───────────▼────────────┐ │
│  │ Enquiry      │  │ Customer     │  │ Quotation              │ │
│  │ Entity       │  │ Entity       │  │ Entity + Items         │ │
│  └──────────────┘  └──────┬───────┘  └────────────────────────┘ │
│                           │                                      │
│                    ┌──────▼───────┐                              │
│                    │ Contact      │                              │
│                    │ Entity       │                              │
│                    └──────────────┘                              │
│                                                                  │
│  forwardRef ───────────────────────────────────────── ProjectModule
└──────────────────────────────────────────────────────────────────┘
```

---

### Layer Compliance

| Layer | Pattern | Compliance | Notes |
|-------|---------|------------|-------|
| Controller | REST Controller | ✅ | Decorators correct, consistent path prefix `/commercial/` |
| Service | Domain Service | ✅ | All extend `TenantAwareService` for base CRUD + tenant isolation |
| Repository | TypeORM Repository | ✅ | Injected via `@InjectRepository()` |
| Entity | TypeORM Entity | ✅ | Extend `IndustrialBaseEntity` for UUID PK, timestamps, soft-delete, tenant |
| DTO | Validation Object | ✅ | `class-validator` + `@nestjs/swagger` decorators |
| Module | NestJS Module | ✅ | Registers entities, providers, controllers, exports |

---

### Dependency Graph

```
CommercialModule
  ├── TypeOrmModule.forFeature([Enquiry, Quotation, QuotationItem, Invoice, Payment, CreditNote, Customer, Contact])
  ├── forwardRef(ProjectModule)
  ├── EnquiryController → EnquiryService
  ├── CustomerController → CustomerService
  ├── QuotationController → QuotationService → ProjectService (via forwardRef)
  └── Exports: [EnquiryService, CustomerService, QuotationService, TypeOrmModule]

ProjectModule
  ├── TypeOrmModule.forFeature([Project, ProjectMilestone, ProjectBudget, ProjectResource])
  └── WorkflowModule
```

---

### Circular Dependency Analysis

| Cycle | Resolution | Status |
|-------|-----------|--------|
| CommercialModule ↔ ProjectModule | `forwardRef(() => ProjectModule)` in CommercialModule | ✅ |
| QuotationController → ProjectService | `@Inject(forwardRef(() => ProjectService))` | ✅ |

No other circular dependencies detected.

---

### Design Patterns Used

| Pattern | Location | Purpose |
|---------|----------|---------|
| Template Method | `TenantAwareService` | Base CRUD with tenant isolation |
| Strategy | DTO validation | Per-operation validation rules |
| Aggregate Root | Customer → Contact | Customer owns Contact lifecycle |
| Repository | TypeORM Repository | Data access abstraction |
| Forward Reference | Module/Service | Circular dependency resolution |

---

### Violations

| Violation | SeverITY | Description |
|-----------|----------|-------------|
| Route prefix missing `/api/v1/` | MEDIUM | All commercial routes use `/commercial/...` instead of `/api/v1/commercial/...` |
| No EventBus (P0-1) | HIGH | Domain events cannot be published |
| `contactPerson` field mismatch Frontend→Backend | FIXED | Frontend `CustomersPage` form now maps correctly to backend DTO |
