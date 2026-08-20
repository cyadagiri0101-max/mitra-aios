# MITRA M6 — Mock / Fallback / Static Data Audit (Phase 2A)

**Milestone:** M6 (G11 BI Dashboard) · **Date:** 2026-08-20 · **Mode:** AUDIT ONLY — nothing removed in this phase.
**Authority:** M6_KPI_DATA_CONTRACT.md (Phase 1). Every record classified; replacement only after backend contract verified (Sprint 2).

---

## Classification Legend

| Class | Meaning |
|---|---|
| MOCK | Demo data rendered as if real |
| STATIC | Hardcoded constants presented as live values |
| FALLBACK | Used only when real source unavailable (incl. silent-fallback defects) |
| PLACEHOLDER | UI shell awaiting a feature |
| FABRICATED NARRATIVE | Trend/insight text with no data basis |
| REAL | Verifiable backend-driven |
| LEGACY / OUT OF SCOPE | Feature owned by another milestone (G12/G13/G14/G15) |

---

## A. DashboardPage.tsx (`mitra-frontend/src/pages/DashboardPage.tsx`)

| # | Line(s) | Class | Current behavior | Intended real source | Replace? | Blocker | M6 disposition |
|---|---|---|---|---|---|---|---|
| 1 | 8, 231-234 | MOCK | 4 KPI cards rendered from `KPI_MOCK` (machinesRunning 8/12, openProjects 34, pendingDispatches 7, overdueCAPAs 2); `/project/dashboard/stats` query runs but results unused | machinesRunning → none (MISSING); openProjects → `projectStats.active`; pendingDispatches → `byStage[DISPATCH]`; overdueCAPAs → CAPA aggregate (2C) | YES | CAPA aggregate not yet exposed (Phase 2C); machinesRunning has no backend | Sprint 2: wire 3 real; remove machinesRunning card or show "not available"; overdueCAPAs waits for 2C endpoint |
| 2 | 10-19 | STATIC | WORKFLOW_STAGES hardcoded counts (142/98/76/44/32/21/14/8) + fabricated "current" stage | `byStage` from `/project/dashboard/stats` | YES | none | Sprint 2: derive from byStage |
| 3 | 21-26 | STATIC | FACTORY_MACHINES: 4 hardcoded machines w/ live states (Idle/Running/Quality Hold) | none (no machine master) | YES | no backend machine state source (MISSING) | Sprint 2: remove or replace with machine module data if it exists; otherwise remove panel |
| 4 | 28-32 | MOCK | AI_RECOMMENDATIONS hardcoded (Rebalance CNC…, expedite material…, quality sweep…) | AI service (G13) | YES | AI_ENABLED=false; G13 not certified | DEFER G13 — remove from G11 scope; do not display as real |
| 5 | 34, 94-98, 107-112 | MOCK | AI_INSIGHTS + RECENT_ACTIVITIES from dashboardMockData.ts (fabricated PRJ-1250/1248/1246/1245, CAPA-0042 events) | domain_outbox event feed / real domain events | YES | no activity-feed endpoint | Sprint 2: remove or wire to outbox snapshot; until then remove panel |
| 6 | 177-182 | REAL | `/project/dashboard/stats` query (5 min refetch) | — | — | — | KEEP — becomes the KPI data source |
| 7 | 198-205, 218-220 | FABRICATED NARRATIVE | "Updated every 30 seconds" badge + 30 s `refreshTick` re-render of static activity feed | — | YES | cosmetic re-render only | Sprint 2: remove badge / real refresh semantics |
| 8 | 184-196, 246-274 | REAL | Knowledge repo widgets (Indexed Records, Documents & Articles, Search Engine) from `/knowledge/search` | — | — | — | KEEP |

## B. dashboardMockData.ts (`mitra-frontend/src/pages/dashboardMockData.ts`)

| # | Line(s) | Class | Current behavior | Intended real source | Replace? | Blocker | M6 disposition |
|---|---|---|---|---|---|---|---|
| 1 | 23-85 | MOCK | KPI_MOCK: fabricated sparklines, trends ("vs yesterday"), insights, updatedAt timestamps | KPI contract (Phase 1 §1-§8) | YES | see A1 | Sprint 2: delete file after DashboardPage rewired (or keep types only) |
| 2 | 94-98 | MOCK | AI_INSIGHTS: "2 Projects at risk", "CNC #3 idle 2h", "Demand forecast +12%" — all fabricated | — | YES | G13 | defer G13 / remove |
| 3 | 107-112 | MOCK | RECENT_ACTIVITIES fabricated audit trail | outbox / events | YES | no endpoint | Sprint 2 remove or outbox feed |

## C. AnalyticsPage.tsx (`mitra-frontend/src/pages/AnalyticsPage.tsx`)

| # | Line(s) | Class | Current behavior | Intended real source | Replace? | Blocker | M6 disposition |
|---|---|---|---|---|---|---|---|
| 1 | 7-10 | FALLBACK (silent) | `fallbackProjectData` static 6-month array; `/analytics/dashboard` has NO `projectTrends` key → fallback renders on EVERY load, even on success | Project time series (2C: `/analytics/trends`) | YES | endpoint in 2C | Sprint 2: wire `/analytics/trends` |
| 2 | 12-16 | FALLBACK (silent) | `fallbackQualityData` static (ncrs/capas) — same silent-fallback defect | Quality time series (2C) | YES | endpoint in 2C | Sprint 2: wire `/analytics/trends` |
| 3 | 26-27 | FALLBACK | `stats?.projectTrends ?? fallback…` — nullish pattern masks missing backend keys | — | YES | — | Sprint 2: remove fallback entirely (error state instead) |
| 4 | 50-57 | FALLBACK | Error banner "Showing fallback data" | — | — | — | Sprint 2: real error state, no fallback data |
| 5 | 77, 100 | FABRICATED NARRATIVE | "Production demand is tracking above historical baseline…" / "CAPAs trending flat" | — | YES | no data basis | Sprint 2: remove or derive from real series |
| 6 | 106-115 | PLACEHOLDER | "Embedded Metabase dashboards will appear here" card | none — Metabase not deployed | YES | out of architecture | Sprint 2: replace with real analytics panels |
| 7 | 44-47 | FABRICATED NARRATIVE | "Live analytics updates" badge | — | YES | cosmetic | Sprint 2: remove |
| 8 | 19-24 | REAL | `/analytics/dashboard` query | — | — | — | KEEP — extend usage to full payload |

## D. BomAnalysisPage.tsx (`mitra-frontend/src/pages/BomAnalysisPage.tsx`)

| # | Line(s) | Class | Current behavior | Intended real source | Replace? | Blocker | M6 disposition |
|---|---|---|---|---|---|---|---|
| 1 | 24-31 | MOCK | SIMULATED_BOM_ITEMS (6 fabricated parts: ThyssenKrupp, Kaiser, PRT-001-A…) | BOM analysis API (G13 AI) | YES | no `/bom-analysis/analyze` backend — call commented out at :96 | OUT OF SCOPE (G13). Remove from G11 certification. Document, do not touch in M6 |
| 2 | 33-37 | MOCK | SIMULATED_RISK_AREAS (P20 Mold Steel 6-week lead, PRJ-1248 references) | real BOM risk engine | YES | G13 | OUT OF SCOPE (G13) |
| 3 | 90-102 | FALLBACK | `handleAnalyze`: 2 s `setTimeout` then renders simulated results; real API call commented out | G13 AI endpoint | YES | G13 | OUT OF SCOPE (G13) |
| 4 | 237-239 | FABRICATED NARRATIVE | "47 parts \| 12 critical", "High" complexity — hardcoded summary | analysis result | YES | G13 | OUT OF SCOPE (G13) |
| 5 | 45-88 | REAL | Upload/paste UI (drag-drop, FileReader) | — | — | — | KEEP (UI works; only analysis is simulated) |

## E. AIWorkspaceContext.tsx (`mitra-frontend/src/context/AIWorkspaceContext.tsx`)

| # | Line(s) | Class | Current behavior | Intended real source | Replace? | Blocker | M6 disposition |
|---|---|---|---|---|---|---|---|
| 1 | 60-79 | FALLBACK + FABRICATED NARRATIVE | `fallback(prompt)` returns canned hardcoded answers incl. fabricated specifics: "PRJ-1248 is the highest priority", "DPT-0441, DPT-0449, DPT-0451", "Machine M-07 … 48 hours" | AI service (G13) | YES | AI_ENABLED=false; G13 | OUT OF SCOPE (G13). Do not display fabricated specifics as data |
| 2 | 330-331 | FALLBACK | `askAI(text, history)` → `response.answer || fallback(text)` — fallback on empty AI answer | — | YES | G13 | OUT OF SCOPE (G13) |
| 3 | 385 | FALLBACK | failure path returns `fallback(text)` | — | YES | G13 | OUT OF SCOPE (G13) |

## F. Backend fixture paths (out of G11 scope, recorded for governance)

| # | File:line | Class | Current behavior | Disposition |
|---|---|---|---|---|
| 1 | `mitra-backend/src/modules/knowledge/services/knowledge-search.service.ts:182-192` | LEGACY / OUT OF SCOPE | hardcoded demo source links (PRJ-2026-0002, WO-MSWQGIF0-78) on empty index | G12 governance track; not G11 |

---

## Summary by classification

| Class | Count | Sprint 2 action |
|---|---|---|
| MOCK | 8 (A1, A4, A5, B1, B2, B3, D1, D2) | 4 removable (A1 part, A5, B*, D*) |
| STATIC | 2 (A2, A3) | 2 removable |
| FALLBACK | 5 (C1, C2, C3, D3, E1-E3) | C1/C2/C3 removable after 2C endpoints; D/E = G13 |
| PLACEHOLDER | 1 (C6) | 1 removable |
| FABRICATED NARRATIVE | 4 (A7, C5, C7, D4 + E1) | 4 removable |
| REAL | 3 (A6, A8, C8, D5) | keep |
| LEGACY / OUT OF SCOPE | 1 (F1) | governance track |

**Blocker ledger for Sprint 2 (updated after M6 Sprint 1):**
- overdueCAPAs card → ✅ BLOCKER RESOLVED — `capaOpenCount`/`capaByStatus` now on `/analytics/dashboard` (Sprint 1)
- machinesRunning + factory machines → no backend machine master — card/panel must be removed in Sprint 2
- AI panels + BOM analysis → G13 boundary — removed from G11 certification
- activity feed → no endpoint — remove panel (or wire outbox snapshot later)
- trend charts → ✅ BLOCKER RESOLVED — `/analytics/trends` (projectTrends + qualityTrends) live (Sprint 1)
- KPI labels ("Revenue"/"Defect Rate"/"SLA") → ✅ backend relabeled in Sprint 1 (`quotationValue`, `openRatioPct`, `closureRatePct`); frontend labels must follow in Sprint 2