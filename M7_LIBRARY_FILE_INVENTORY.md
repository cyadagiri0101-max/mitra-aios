# M7 — Library File Inventory & Distribution Analysis
## Full Quantitative Vault File Audit
**Vault:** `D:\Mitra3.0\MitraEngineeringLibrary`  
**Total File Count:** 19,402  
**Total Directory Count:** 2,338  
**Total Physical Size:** 281,419,582 bytes (268.38 MB)  
**Maximum Directory Depth:** 10 levels

---

## 1. File Extension Breakdown

| Extension | Category | Count | % of Total Files | Size (MB) | Candidate Handling in MITRA M7 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `.js` | Runtime Code | 5,051 | 26.03% | 47.60 MB | Exclude from RAG; execute parsers only |
| `.py` | Extraction Parsers / Tools | 3,225 | 16.62% | 48.25 MB | Parser source scripts; execute in sandbox |
| `.pyc` | Bytecode Cache | 3,221 | 16.60% | 64.93 MB | Exclude from knowledge indexing |
| `.ts` | TypeScript Definitions | 2,300 | 11.85% | 11.48 MB | MEKB API models; maintain for schema typing |
| `.map` | Source Maps | 1,706 | 8.79% | 21.89 MB | Exclude from knowledge indexing |
| `<no_ext>` | Metadata / Tooling | 1,375 | 7.09% | 2.15 MB | Exclude runtime configs; inspect docs |
| `.md` | Engineering Docs / Dictionaries | 669 | 3.45% | 6.84 MB | **Primary Knowledge Ingestion Source** |
| `.json` | Structured Asset Manifests | 646 | 3.33% | 6.57 MB | **Primary Knowledge Ingestion Source** |
| `.xlsx` / `.xls` | Engineering BOMs & Cycle Times | 4 | 0.02% | 0.56 MB | **Primary Extraction Target (Table Chunks)** |
| `.sqlite` | Relational MEKB Database | 1 | 0.01% | 0.90 MB | **Primary Structured Knowledge Vault** |
| `.csv` | Tabular Data | 30 | 0.15% | 1.33 MB | Tabular extraction & normalization |
| `.txt` | Process Logs / Folder Lists | 81 | 0.42% | 0.26 MB | Text extraction & entity linking |
| `.html` | Validation Reports | 12 | 0.06% | 0.16 MB | Export audit logs; index summaries |
| Other | C/C++ Binaries, Headers, Libs | 1,082 | 5.58% | 55.42 MB | Runtime libraries for NumPy/Pandas C-extensions |

---

## 2. Directory Hierarchy and Depth

- **Depth 1–2:** Root config, SQLite database (`database/`), master workbooks (`PL.xlsx`), documentation index (`docs/`).
- **Depth 3–5:** Extraction parsers (`parsers/`), importers (`importers/`), entity models (`models/`, `src/entities/`), HTML export logs (`exports/`).
- **Depth 6–10:** Virtualenv packages (`.venv/Lib/site-packages/...`) and Node modules (`node_modules/...`).

---

## 3. Notable High-Value Domain Assets

1. `database/mekb.sqlite` (921,600 bytes) — 24 normalized tables containing 3,089 records.
2. `docs/EngineeringDataDictionary.md` (81,732 bytes) — Comprehensive mapping of engineering attributes (dimensions, hardness, tolerances).
3. `docs/FolderStructureAnalysis.md` (1,407,178 bytes) — Complete analysis of shared network drive project repositories.
4. `docs/GapAnalysis.md` (1,438,412 bytes) — Analysis of historical tool data completeness.
5. `docs/excel_files_structure_report.md` (65,228 bytes) — Detailed column-by-column breakdown of 14 key engineering spreadsheets.
6. `EngineeringAssetInventory.json` (162,063 bytes) — Pre-parsed manifest of 21 core Excel files and sheet definitions.
7. `PL.xlsx` (222,851 bytes) — Active project planning matrix covering projects BM461 through BM473.
