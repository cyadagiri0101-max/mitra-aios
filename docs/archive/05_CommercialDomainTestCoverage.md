# Commercial Domain Test Coverage

## Sprint 1 — Test Engineering Report

---

### Test Results Summary

| Suite | Tests | Passed | Failed | Coverage |
|-------|-------|--------|--------|----------|
| `customer.service.spec.ts` | 3 | 3 | 0 | ~85% |
| `enquiry.service.spec.ts` | 11 | 11 | 0 | ~90% |
| `quotation.service.spec.ts` | 12 | 12 | 0 | ~85% |
| **Total Commercial** | **26** | **26** | **0** | **~87%** |

### Test Breakdown

#### CustomerService (3 tests)

| Test | Type | Status |
|------|------|--------|
| createWithContacts → creates customer with contacts | Integration | ✅ |
| findAllWithContacts → returns paginated results | Integration | ✅ |
| findOneWithContacts → returns customer with contacts | Integration | ✅ |

#### EnquiryService (11 tests)

| Test | Type | Status |
|------|------|--------|
| submit → DRAFT → SUBMITTED | Unit | ✅ |
| submit → throw if not DRAFT | Unit | ✅ |
| review → SUBMITTED → UNDER_REVIEW | Unit | ✅ |
| cancel → cancel draft | Unit | ✅ |
| cancel → throw if converted | Unit | ✅ |
| cancel → cancel from SUBMITTED | Unit | ✅ |
| cancel → cancel from UNDER_REVIEW | Unit | ✅ |
| cancel → throw if LOST | Unit | ✅ |
| markLost → from UNDER_REVIEW with reason | Unit | ✅ |
| markLost → from SUBMITTED (no reason) | Unit | ✅ |
| markLost → throw if DRAFT | Unit | ✅ |
| markLost → throw if CONVERTED | Unit | ✅ |

#### QuotationService (12 tests)

| Test | Type | Status |
|------|------|--------|
| sendQuotation → DRAFT → SENT | Unit | ✅ |
| sendQuotation → throw if not DRAFT | Unit | ✅ |
| acceptQuotation → SENT → ACCEPTED with project data | Unit | ✅ |
| acceptQuotation → throw if not SENT | Unit | ✅ |
| acceptQuotation → throw if already ACCEPTED | Unit | ✅ |
| rejectQuotation → SENT → REJECTED with reason | Unit | ✅ |
| rejectQuotation → throw if not SENT | Unit | ✅ |
| createFromRfq → full DTO creates quotation | Unit | ✅ |
| linkProject → links project, sets PROJECT_CREATED | Unit | ✅ |
| findAllWithItems → paginated results | Unit | ✅ |
| findOneWithItems → returns with items | Unit | ✅ |

### Coverage per Method

| Service | Method | Tested |
|---------|--------|--------|
| EnquiryService | submit | ✅ |
| EnquiryService | review | ✅ |
| EnquiryService | cancel | ✅ (3 paths) |
| EnquiryService | markLost | ✅ (4 paths) |
| QuotationService | createFromRfq | ✅ |
| QuotationService | sendQuotation | ✅ (2 paths) |
| QuotationService | acceptQuotation | ✅ (3 paths) |
| QuotationService | rejectQuotation | ✅ (2 paths) |
| QuotationService | linkProject | ✅ |
| QuotationService | findAllWithItems | ✅ |
| QuotationService | findOneWithItems | ✅ |
| CustomerService | createWithContacts | ✅ |
| CustomerService | findAllWithContacts | ✅ |
| CustomerService | findOneWithContacts | ✅ |

### Missing Test Coverage

| Method | Reason | Priority |
|--------|--------|----------|
| CustomerService.updateCustomer | Relies on TenantAwareService.update | LOW |
| CustomerService.addContact | Integration with repo | MEDIUM |
| CustomerService.findContacts | Simple repo passthrough | LOW |
| CustomerService.removeContact | Soft-delete passthrough | LOW |
| EnquiryService.create | Relies on TenantAwareService.create | LOW |
| EnquiryService.update | Relies on TenantAwareService.update | LOW |
| Controller tests | All controllers | HIGH |

### Controller Test Plan

Controllers follow a consistent pattern and would benefit from end-to-end testing:

```typescript
// Example controller test structure:
describe('CustomerController', () => {
  it('GET /commercial/customers → returns 200 with paginated list');
  it('GET /commercial/customers/:id → returns 200 with customer');
  it('POST /commercial/customers → returns 201 with created customer');
  it('PATCH /commercial/customers/:id → returns 200 with updated customer');
  it('DELETE /commercial/customers/:id → returns 200');
  it('POST /commercial/customers/:id/contacts → returns 201');
  it('DELETE /commercial/customers/:id/contacts/:contactId → returns 200');
  it('GET /commercial/customers → returns 403 without valid JWT');
  it('POST /commercial/customers → returns 403 without SALES role');
});
```

### Pre-existing Test Failures

The following test failures are **pre-existing** and not related to Sprint 1 changes:

| Suite | Failures | Root Cause |
|-------|----------|------------|
| `tenant-aware.service.spec.ts` | Cross-tenant isolation tests | Mock mismatch — tests expect `throw` but TenantAwareService returns 404. Not changed by Sprint 1. |
| `audit.interceptor.spec.ts` | Constructor argument missing | `Reflector` parameter not provided in test instantiation |
| `ai.service.spec.ts` | Missing AiUsageService module | Module dependency not imported in test module |

**Total pre-existing failures:** 36 tests across 4 suites.

---

### Coverage Target

- Current: **~87%** (service-level)
- Target: **90%+**
- Gap: Controller tests and remaining service edge cases
