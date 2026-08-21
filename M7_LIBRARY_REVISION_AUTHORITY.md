# M7 — Revision & Authority Resolution Model
## Document Authority Hierarchy for MEKB Ingestion
**Vault:** `D:\Mitra3.0\MitraEngineeringLibrary`  
**Core Requirement:** Prevent outdated or superseded engineering revisions from corrupting AI RAG context.

---

## 1. Document Authority States

| Authority Level | State | Description | RAG Retrieval Behavior |
| :--- | :--- | :--- | :--- |
| **Level 1** | `AUTHORITATIVE_RELEASE` | Officially released production revision (e.g. `Rev C` after formal ECO) | Highest ranking boost (Score multiplier: $1.0\times$); Cited as primary reference |
| **Level 2** | `CURRENT_WORKING` | Active in-progress engineering sheet for current active project | Standard ranking ($0.8\times$); Explicitly tagged as `[CURRENT]` in context |
| **Level 3** | `HISTORICAL_REFERENCE` | Prior baseline or reference study (e.g. `Blow Molds Data for Internal Study`) | Secondary ranking ($0.5\times$); Useful for empirical comparison |
| **Level 4** | `SUPERSEDED` | Replaced revision (e.g. `Rev A` when `Rev B` exists) | Filtered out of default search; accessible only with explicit `includeSuperseded=true` query |
| **Level 5** | `DRAFT_UNAPPROVED` | Incomplete working copy or unreleased scratch calculation | Excluded from AI Copilot generation |

---

## 2. Discovered Revision Patterns in Library

1. **Suffix Revisions:**
   - Example: `Blow Molds Data for Internal Study.xlsx` vs `Blow Molds Data for Internal Study_RevA.xlsx`.
   - Resolution Rule: `RevA` supersedes base version; base version marked `HISTORICAL_SUPERSEDED`.
2. **Duplicate Iteration Suffixes:**
   - Example: `BM-454 INDEX SHEET(1).xlsx` vs `BM-454 INDEX SHEET.xlsx`.
   - Example: `BM454_Process planning sheet(1).xlsx` vs `BM454_Process planning sheet.xlsx`.
   - Resolution Rule: Compare timestamp and row count. In MEKB parser, `(1)` files represent revision snapshots; parser logs provenance batch ID for audit disambiguation.
3. **Multi-cavity Sub-projects:**
   - Example: `BM461` (Vancouver 100ml 12-Cavity M02) vs `BM462` (Vancouver 100ml 12-Cavity M03).
   - Resolution Rule: Distinct sibling project masters linked via `project_relationships` table (Parent bottle design `PD-Vancouver`).
