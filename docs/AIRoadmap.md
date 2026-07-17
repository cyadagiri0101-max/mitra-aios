# AI Implementation Roadmap (Phase 7)

**Date:** 2026-07-06
**Scope:** Documentation-only roadmap to enable an AI assistant that answers engineering questions using the existing architecture:

MITRA (frontend/backends) → FastAPI (EKL) → mekb.sqlite → AI Assistant

No code, database, model, or API implementations are performed by this document.

---

## 1 Executive Summary

This roadmap prioritizes early management demonstrations using the current EKL API and `mekb.sqlite`. It preserves the existing architecture and recommends a sequence of minimal API additions (Phase 1) and larger AI work (Phase 2–3) that enable progressively richer AI capabilities. Each step is evidence-backed by the repository `docs/` reports (API validation, schema inventory, readiness assessment).

Goals:
- Deliver quick, high-impact demos for management within days using existing endpoints.
- Add targeted, low-risk API endpoints to unlock common cross-project queries.
- Reserve advanced similarity and recommendation capabilities for a later AI phase.

---

## 2 AI Capabilities Available Today

These features can be implemented by an AI assistant that orchestrates calls to the existing EKL FastAPI endpoints and performs client-side aggregation (no API changes required):

- Show BM457 — `GET /api/v1/projects/{project_number}` (PROJECT DETAIL)
- Show BOM — `GET /api/v1/projects/{project_number}/part-list` (BOM)
- Show Process Planning — `GET /api/v1/projects/{project_number}/process-planning` (STEPS)
- Show Cycle Times — `GET /api/v1/projects/{project_number}/cycle-times` (CYCLE TIME HISTORY)
- Show Documents — `GET /api/v1/projects/{project_number}/documents` (PROJECT DOCUMENTS)
- Compare BM454 vs BM457 — client-side retrieval and diff using the endpoints above (no special API required)

Evidence: `docs/APIValidationReport.md`, `docs/ApiConnectivityReport.md`, `docs/DatabaseSchemaInventory.md`.

---

## 3 AI Capabilities After Phase 1 (Minor API Additions)

Phase 1 targets quick API additions that are low-to-medium implementation effort and unlock high-value, frequently requested queries for management demos.

Capabilities enabled after Phase 1 (minor API work):

- Show Technical Specification — new endpoint: `GET /api/v1/projects/{project_number}/technical-specifications`.
- Show Customer History — new endpoint: `GET /api/v1/customers/{customer_id}/projects` or `GET /api/v1/projects?customer={customer_id}`.
- Find HDPE projects — filter support or endpoint: `GET /api/v1/projects?material=HDPE`.
- Find 26 mm neck projects — filter support or endpoint: `GET /api/v1/projects?neck_type=26mm`.
- Show Lessons Learned — new endpoint: `GET /api/v1/projects/{project_number}/engineering-notes`.

These endpoints are small, focused additions that allow immediate business value (customer and attribute-driven queries) and make strong early demos possible.

Evidence: missing endpoints noted in `docs/EndpointCompatibilityMatrix.md` and `docs/AIReadinessAssessment.md`.

---

## 4 AI Capabilities After Phase 2 (Cross-Project Enrichment)

Phase 2 focuses on mid-sized changes (medium complexity) and engineering of cross-project APIs plus enabling richer AI analytics.

Capabilities after Phase 2:

- Project-level filtering and faceted search: `GET /api/v1/projects?material=&machine=&customer=&neck_type=&cavitation=` (support combinational filters).
- Document revision history: `GET /api/v1/projects/{project_number}/documents/{doc_id}/revisions` (requires revision metadata or a revisions table).
- Project comparison helper API (optional): `POST /api/v1/projects/compare` returns structured comparisons of multiple resources (BOM, cycle-times, process steps).

Phase 2 unlocks more polished demos showing multi-project lists, attribute filters, and document lineage. Complexity is medium (joins, indexes, possible schema additions for revision tracking).

Evidence: `docs/APIContractGapAnalysis.md`, `docs/AIReadinessAssessment.md`.

---

## 5 AI Capabilities After Phase 3 (Advanced AI: similarity & reuse)

Phase 3 introduces advanced AI features that compute similarity, recommend reuse, and produce design suggestions. These rely on the full dataset and a compute layer in the AI assistant (no mandatory new services; all work can be done by the AI component consuming EKL endpoints and `mekb.sqlite` data).

Capabilities after Phase 3:

- Show Similar Projects — semantic/signal-based similarity across BOM, process steps, cycle-times, technical-specs (ADVANCED AI)
- Recommend Similar Designs — propose reusable components or designs based on historical reuse patterns (ADVANCED AI)
- Find Engineering Reuse — locate components/BOM items used across multiple projects and surface reuse opportunities (ADVANCED AI)

Phase 3 requires heavy AI work: feature engineering, similarity metrics, evaluation; expected complexity HIGH.

Evidence: AI-readiness shows data exists but cross-project similarity endpoints and metadata are missing (`docs/AIReadinessAssessment.md`).

---

## 6 Required API Enhancements (catalog of missing capabilities)

Each entry lists the *required endpoint*, *DB tables* involved, *estimated implementation complexity*, and *expected AI improvement*.

1) Technical Specifications
- Required endpoint: `GET /api/v1/projects/{project_number}/technical-specifications`
- DB tables: `technical_specification`, `project_master`, `product_master`
- Complexity: LOW
- Expected AI improvement: Enables Q7 and improves comparison accuracy (phase-1 demo value)

2) Customer History / Customer → Projects
- Required endpoint: `GET /api/v1/customers/{customer_id}/projects` or `GET /api/v1/projects?customer={id}`
- DB tables: `project_customer_link`, `customer_master`, `project_master`
- Complexity: LOW
- Expected AI improvement: Enables Q3 and Q13; critical for customer-focused demos

3) Material-based Project Filter
- Required endpoint: `GET /api/v1/projects?material={material}` (or add `material` filter param)
- DB tables: `material_master`, `product_master`, `project_master`, `part_list` (if BOM-driven)
- Complexity: MEDIUM (requires joins/indexes)
- Expected AI improvement: Enables Q11 and many cross-project discovery use-cases

4) Neck-type Project Filter
- Required endpoint: `GET /api/v1/projects?neck_type={neck_code}`
- DB tables: `neck_type_master`, `product_master`, `project_master`
- Complexity: MEDIUM
- Expected AI improvement: Enables Q12 and attribute-driven search

5) Engineering Notes (Lessons Learned)
- Required endpoint: `GET /api/v1/projects/{project_number}/engineering-notes`
- DB tables: `engineering_notes`, `project_master`
- Complexity: LOW
- Expected AI improvement: Enables Q19 and qualitative knowledge extraction

6) Cross-project filtering / faceted search
- Required endpoint: `GET /api/v1/projects` with query params for `material`, `machine`, `customer`, `neck_type`, `cavitation`
- DB tables: multiple joins across `product_master`, `cycle_time_history`, `part_list`, `project_customer_link`
- Complexity: MEDIUM-HIGH (indexing, pagination, parameter validation)
- Expected AI improvement: Broadly enables many cross-project queries and demo scenarios

7) Document revision history
- Required endpoint: `GET /api/v1/projects/{project_number}/documents/{doc_id}/revisions`
- DB tables: `document_index`, plus a revisions/audit table (may require schema addition if revisions not captured)
- Complexity: HIGH (may require schema change or external provenance store)
- Expected AI improvement: Supports Q18; enables traceability in demos

8) Comparison API (optional)
- Required endpoint: `POST /api/v1/projects/compare` (accepts project ids) returning structured diffs
- DB tables: `project_master`, `product_master`, `part_list`, `cycle_time_history`, `process_planning`, `technical_specification`
- Complexity: MEDIUM (server-side orchestration), LOW if implemented client-side in AI assistant
- Expected AI improvement: Polished management demo for side-by-side comparisons

Notes: All endpoints use the existing FastAPI boundary and `mekb.sqlite` as data source. None require architecture redesign.

---

## 7 Management Demonstration Scenarios (early, high-impact)

Phase 1 demo (quick, high-visibility):
- Show BM454 (project detail), BOM, process planning and documents in a single dashboard view. Live AI assistant answers: "Show BM454 BOM" and "Show BM454 process steps." (Uses existing endpoints.)

Phase 2 demo (after minor API additions):
- Customer drill-down: "Show all projects for customer X and highlight those using HDPE." (Requires customer→projects endpoint and material filter.)

Phase 3 demo (post-advanced AI):
- Recommendations: "Show similar projects to BM454 and suggest reusable components." (Requires similarity scoring trained by AI using project data)

---

## 8 Recommended Development Order (prioritizes management demos)

1. Phase 0 (Immediate): Build the management demo using only existing endpoints (Project detail + BOM + Process + Docs + simple compare). Time: 1–3 days.
2. Phase 1 (Minor API Additions): Implement quick, low-risk endpoints: technical specs, customer→projects, engineering notes, and material/neck filters. Time: 1–2 sprints.
3. Phase 2 (Cross-Project Enrichment): Add faceted search, optional comparison API, and document revision tracking (if required). Time: 2–3 sprints.
4. Phase 3 (Advanced AI): Implement similarity/recommendation models, evaluation, and production-grade QA. Time: 2–4 sprints depending on evaluation depth.

Rationale: delivering Phase 0 and Phase 1 demos quickly proves value and unlocks many business queries while keeping implementation effort low.

---

## 9 Final Recommendation

- Start with a management demo that uses the existing API (no changes) to showcase immediate AI value.
- Parallelize Phase 1 small API tasks to enable customer- and attribute-driven queries within the next sprint.
- Reserve advanced similarity and recommendation features for a focused AI phase after collecting usage telemetry and validating early demos.

All recommendations preserve the current architecture and rely on targeted FastAPI endpoint additions and AI assistant orchestration.

---

# Appendix: Quick mapping (question → availability)

- Show BM457: AVAILABLE TODAY
- Show BOM: AVAILABLE TODAY
- Show Process Planning: AVAILABLE TODAY
- Show Cycle Times: AVAILABLE TODAY
- Show Documents: AVAILABLE TODAY
- Show Technical Specification: AVAILABLE AFTER MINOR API ADDITION
- Compare BM454 vs BM457: AVAILABLE TODAY (client-side compare)
- Show Similar Projects: AVAILABLE AFTER ADVANCED AI
- Show Customer History: AVAILABLE AFTER MINOR API ADDITION
- Find HDPE projects: AVAILABLE AFTER MINOR API ADDITION
- Find 26 mm neck projects: AVAILABLE AFTER MINOR API ADDITION
- Show Lessons Learned: AVAILABLE AFTER MINOR API ADDITION
- Recommend Similar Designs: AVAILABLE AFTER ADVANCED AI
- Find Engineering Reuse: AVAILABLE AFTER ADVANCED AI
