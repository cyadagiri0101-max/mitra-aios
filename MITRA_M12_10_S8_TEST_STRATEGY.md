# MITRA M12.10 S8 TEST STRATEGY

**TEST FRAMEWORK:** Unit, Integration, Module Regression & Build Verification
**DATE:** 2026-08-25

---

## 1. Test Layers

1. **Focused S8 Unit Tests:** `engineering-workflow-intelligence.spec.ts`.
2. **Engineering Module:** Complete test suite in `src/modules/engineering/` (42 test suites).
3. **Engineering Library Module:** Complete test suite in `src/modules/engineering-library/` (26 test suites).
4. **Platform-Wide Backend Regression:** `npm test` across all 216 suites.
5. **Frontend Regression:** `vitest run --run` across all 10 test files.
6. **Production Build Validation:** `nest build` and `tsc && vite build`.
