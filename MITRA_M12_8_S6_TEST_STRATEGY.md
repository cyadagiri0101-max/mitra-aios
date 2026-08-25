# MITRA M12.8 S6 TEST STRATEGY & VERIFICATION MATRIX

**TEST FRAMEWORK:** Automated Unit, Integration, Grounding & Full Regression Testing
**DATE:** 2026-08-25

---

## 1. Test Layers & Verification Plan

1. **Focused S6 Unit Tests:** Services including `cad-feature-knowledge.spec.ts`, `graphrag-fusion.spec.ts`, `tolerance-intelligence.spec.ts`, `cross-project-intelligence.spec.ts`, `native-mekb.spec.ts`, `engineering-synonym.service.spec.ts`.
2. **Empirical Grounding Benchmark:** 10-category benchmark harness in `engineering-grounding-benchmark.spec.ts` evaluating Precision, Recall, Groundedness, and Refusal Veracity.
3. **Engineering Modules:** `src/modules/engineering-library/` (24 suites) and `src/modules/engineering/` (41 suites).
4. **Platform-Wide Full Regression:** Backend regression (`npm test` — 213 suites) and frontend regression (`vitest run --run` — 10 files).
5. **Production Build Validation:** `nest build` and `tsc && vite build`.
