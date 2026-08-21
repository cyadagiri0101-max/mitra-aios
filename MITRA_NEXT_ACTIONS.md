# MITRA — Next Actions & Priority Matrix
## Post-v4.6.0 Master Action Plan
**Baseline:** `v4.6.0` (M6 Certified)

---

## 1. Priority Matrix by Action Category

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 1. DO NOW (Pre-M7 Ingestion & Setup)                                       │
│    • Complete M7 Engineering Library Discovery Audit                       │
│    • Provision local Ollama instance with `phi3:mini` & embedding models   │
│    • Design chunking & metadata schema for 19.4k engineering files         │
├────────────────────────────────────────────────────────────────────────────┤
│ 2. DO BEFORE G13 CERTIFICATION (Milestone M7)                              │
│    • Implement batch ingestion parser worker for MitraEngineeringLibrary   │
│    • Verify tenant-aware hybrid retrieval (Vector + BM25)                  │
│    • Execute real-model Phi-3 Q&A test with grounded citations ([REF-x])  │
│    • Resolve environmental failure in `p0-production-proof.e2e-spec.ts`    │
│    • Record formal G13 certification evidence                              │
├────────────────────────────────────────────────────────────────────────────┤
│ 3. DO AFTER M7 (Milestone M8)                                              │
│    • Implement KnowledgeArticle lifecycle (DRAFT → REVIEW → PUBLISH)       │
│    • Add article supersession, revision tracking & expiry marking          │
│    • Reconcile historical G12 documentation claims in golden scenarios     │
│    • Certify Golden Scenario G12                                           │
├────────────────────────────────────────────────────────────────────────────┤
│ 4. DO BEFORE G14 (Milestone M9)                                            │
│    • Train statistical delay & capacity prediction models on actual data   │
│    • Implement model registry & confidence evaluation                      │
│    • Replace NOT_CONFIGURED stubs in `ai-projection.service.ts`            │
│    • Certify Golden Scenario G14                                           │
├────────────────────────────────────────────────────────────────────────────┤
│ 5. DO BEFORE G15 (Milestone M10)                                           │
│    • Build unified 15-hop Digital Thread lineage API                       │
│    • Implement interactive Graph UI visualizer in frontend                 │
│    • Add full-chain E2E traceability verification test                     │
│    • Certify Golden Scenario G15                                           │
├────────────────────────────────────────────────────────────────────────────┤
│ 6. FUTURE (Milestone M11 — Enterprise Hardening)                           │
│    • Fix BOM creation preconditions in `tenant-isolation.e2e-spec.ts`      │
│    • Drop dead schema columns in `engineering_boms` / `project_folders`    │
│    • Execute high-concurrency multi-tenant stress benchmarks               │
│    • Package air-gapped production deployment bundle                       │
├────────────────────────────────────────────────────────────────────────────┤
│ 7. DO NOT FIX (Strict Architectural Guardrails)                            │
│    • DO NOT rewrite or alter certified M1–M6 business logic                │
│    • DO NOT change test assertions merely to achieve green results         │
│    • DO NOT fabricate AI answers when local Ollama is offline             │
│    • DO NOT modify raw files inside `MitraEngineeringLibrary`              │
│    • DO NOT claim G13/G14/G15 certification without real evidence          │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Explicit Resolution Ledger for Key Items

| Item / Finding | Action Bucket | Resolution Strategy |
| :--- | :--- | :--- |
| **`tenant-isolation.e2e-spec.ts` (6 fails)** | FUTURE (M11) | Fix test setup fixture so project has approved design stage before BOM creation. Do NOT weaken backend validation. |
| **`p0-production-proof.e2e-spec.ts` (3 fails)** | DO BEFORE G13 (M7) | Run against live local Ollama host (`phi3:mini`) as part of G13 real-model certification. |
| **G13 Verification Gap** | DO BEFORE G13 (M7) | Implement automated test verifying Question → Context → Phi-3 → Citations → Audit. |
| **G12 Contradiction** | DO AFTER M7 (M8) | Implement KnowledgeArticle lifecycle service and update docs to match verified code state. |
| **G14 Missing ML** | DO BEFORE G14 (M9) | Implement ML delay/capacity forecast models with confidence bounds. Keep deterministic analytics separate. |
| **G15 Graph Gap** | DO BEFORE G15 (M10) | Create unified Digital Thread API and UI graph explorer. |
| **Engineering Library Integration** | DO NOW / M7 | Ingest 19,402 engineering files via batch worker without mutating source vault. |

---

## 3. Immediate Next Step

**Milestone M7 (M7.0–M7.5) Status:** **COMPLETED & CERTIFIED (G13 Certified)**  
**Recommended Next Milestone:** Proceed to **Milestone M8: G12 Lifecycle & Decision Intelligence** (Knowledge Article state machine, decision corpus linking, and supersession workflow) upon explicit user authorization.
