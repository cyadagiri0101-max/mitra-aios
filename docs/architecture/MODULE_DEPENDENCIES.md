# Module Dependencies (v3.2.1)

## Backend (NestJS) — mitra-backend/src

### Module graph
```text
AppModule
├── PlatformModule
├── AuditModule
├── WorkflowModule
├── CommercialModule
├── ProjectModule
├── EngineeringModule
├── ManufacturingModule
├── QualityModule
├── ServiceModule
├── KnowledgeModule
└── SearchModule
```

### Commercial module internal wiring
```text
CommercialModule
├── CustomerService (facade)
├── CustomerContactService
├── CustomerAddressService
├── CustomerNoteService
├── CustomerActivityService
├── CustomerImportService
├── QuotationService (facade)
├── QuotationPricingService
├── QuotationItemService
├── QuotationMarginService
├── QuotationApprovalService
├── QuotationRevisionService
├── QuotationAcceptanceService
├── RfqService
├── EnquiryService
└── CommercialAiService
```

### Dependency rules in the current implementation
1. The backend uses a modular monolith rather than a service mesh; modules depend on exported providers rather than on private implementation details.
2. Commercial facade services orchestrate downstream leaf services for customers and quotations.
3. The workflow and audit modules are imported by the commercial module so state transitions can remain transactional.
4. The project module is imported by the commercial module for quotation-to-project handoff.
5. No forward-reference dependency pattern is used in the current backend source tree.

## Frontend (React) — mitra-frontend/src

### Layer structure
```text
pages/        route-level lazily loaded pages
components/   shared UI shell and reusable components
context/      memoized providers for auth and AI state
services/     API clients and domain service wrappers
store/        Zustand stores for local UI state
hooks/        feature-level hooks and reusable behavior
```

### Dependency rules
1. Pages depend on components, services, and stores.
2. Route-level code splitting is implemented in the application router.
3. The frontend build emits route-specific chunks and shared vendor chunks.
4. The production build completed successfully with no import-resolution failures.

## Verification status
- Backend build and TypeScript compilation succeeded.
- Frontend production build completed successfully and emitted lazy-loaded assets.
- A full circular-dependency scan was not run in this environment, but the current implementation is aligned with the documented dependency structure.
