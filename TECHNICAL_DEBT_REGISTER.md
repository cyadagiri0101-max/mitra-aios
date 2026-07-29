# MITRA Technical Debt Register — Sprint 1 Baseline

Date: 2026-07-29

Executive Summary
- Objective: capture code smells, missing tests, TODO/FIXME items, large services, duplicated logic, deprecated APIs, security and performance opportunities. This register does not change code — it records and prioritizes work for Sprint 2.

Findings (selected)
- Missing / weak tests
	- Several integration and e2e gaps: no automated E2E covering full Customer→Enquiry→Quotation→Project path prior to certification. Severity: High. Effort: 2–4d to implement robust e2e tests with seeded DB and CI pipeline.

- Large services / complexity
	- `EngineeringLibraryService` (observed in tests emitting 502s to external EKL) — has external integration surface; needs resilience (retry/backoff) and circuit breaker. Severity: Medium. Effort: 2–3d.

- Duplicated logic
	- Enquiry/Quotation customer/product propagation logic duplicated between services and controllers; minor consolidation possible. Severity: Low. Effort: 1–2d.

- TODO / FIXME items
	- 479 occurrences across docs and code. Recommend triage. Severity: Medium. Effort: variable — initial triage 1–2d.

- Deprecated / stale patterns
	- Hard-coded date strings and manual SQL snippets in scripts. Severity: Low. Effort: 1–2d to parameterize.

- Security
	- Missing permission seed data per `01_IMPLEMENTATION_STATUS.md` (roles/permissions mismatch). Severity: High. Effort: 2–3d to prepare migration seed and tests.
	- No structured domain-level logging beyond audit interceptor; improve logging for critical services. Severity: Medium. Effort: 2–3d.

- Performance
	- Some services return large JSON with unbounded fields (e.g., engineering index responses). Consider pagination and limits. Severity: Medium. Effort: 2–5d depending on scope.

Recommendations & Priorities
- Critical
	- Add E2E tests for the commercial workflow and wire into CI (2–4d).
	- Create permission seed migration to align with `PERMISSION_MODEL.md` and tests (2–3d).

- High
	- Improve `EngineeringLibraryService` resilience (2–3d).
	- Triage and create tickets for top 50 TODO/FIXME items (2–3d).

- Medium
	- Add structured logging scaffolding and critical service logging (2–3d).
	- Introduce basic pagination for large endpoints (2–5d).

- Low
	- Consolidate duplicated logic in small refactors after tests are in place (1–2d).

Next steps
- Create Sprint 2 backlog items from this register.
- Assign owners for the critical items before starting feature development.
# Technical Debt Register — Sprint 1

**Date:** 2026-07-28

---

## Priority Classification
- **P0:** Blocking — must fix before next release
- **P1:** High — should fix in Sprint 2
- **P2:** Medium — fix when convenient
- **P3:** Low — nice to have

---

## Items

| # | Area | Description | Priority | Effort | Status |
|---|------|-------------|----------|--------|--------|
| TD-01 | Commercial | Invoice/Payment/CreditNote entities have no services or controllers | P1 | 3-5 days | 📝 Backlog |
| TD-02 | Commercial | `AuditEvent` decorators not applied on commercial endpoints | P2 | 0.5 day | 📝 Backlog |
| TD-03 | Commercial | Domain event publisher not implemented | P1 | 2 days | 📝 Backlog |
| TD-04 | Commercial | Project `customerName` not populated on auto-creation | P1 | 0.5 day | 📝 Backlog |
| TD-05 | Commercial | Project `productName` not populated on auto-creation | P1 | 0.5 day | 📝 Backlog |
| TD-06 | Commercial | `Enquiry.enquiryNumber` lacks auto-generation logic | P1 | 0.5 day | 📝 Backlog |
| TD-07 | Commercial | `productDescription` column never written (DTO has `remarks` instead) | P2 | 0.25 day | 📝 Backlog |
| TD-08 | Commercial | No `QuotationResponseDto` alignment with entity field names (`rfqId` vs `enquiryId`) | P3 | 0.25 day | 📝 Backlog |
| TD-09 | Common | `TenantAwareService.spec` mock does not enforce tenant isolation (21 false failures) | P1 | 1 day | 📝 Backlog |
| TD-10 | AI | `AiService.spec` missing `AiUsageService` mock provider (15 false failures) | P1 | 0.5 day | 📝 Backlog |
| TD-11 | Structure | Missing DTO barrel files (`dto/index.ts`) across modules | P3 | 0.5 day | 📝 Backlog |
| TD-12 | Structure | Missing events barrel file (`events/index.ts`) | P3 | 0.25 day | 📝 Backlog |
| TD-13 | Frontend | Main JS chunk exceeds 1.5 MB — implement code-splitting | P2 | 1-2 days | 📝 Backlog |
| TD-14 | Frontend | Add `"type": "module"` to `package.json` for PostCSS | P3 | 0.1 day | 📝 Backlog |
| TD-15 | Security | Add `@Permissions()` decorators to commercial endpoints | P2 | 0.5 day | 📝 Backlog |
| TD-16 | Commercial | Enquiry should optionally link to `customerId` for better data integrity | P2 | 0.5 day | 📝 Backlog |
| TD-17 | Commercial | Quotation item CRUD endpoints (currently no endpoints for items) | P2 | 1 day | 📝 Backlog |

---

## Debt Summary

| Priority | Count | Total Effort |
|----------|-------|-------------|
| P0 | 0 | — |
| P1 | 7 | 8 days |
| P2 | 5 | 4-6 days |
| P3 | 5 | 1.5 days |
| **Total** | **17** | **~14 days** |
