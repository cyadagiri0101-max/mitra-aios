# M7 — Engineering Knowledge Library Discovery Report
## Prathiraj Metal Masters (PMM) Engineering Library & MEKB Vault
**Date:** 2026-08-20  
**Baseline Version:** `v4.6.0` (M6 Certified)  
**Vault Path:** `D:\Mitra3.0\MitraEngineeringLibrary`  
**Status:** PHASE 0 DISCOVERY COMPLETE — AUDIT ONLY

---

## 1. Executive Summary

A comprehensive, non-destructive audit of `D:\Mitra3.0\MitraEngineeringLibrary` was conducted. The library contains a total of **19,402 files** across **2,338 directories** occupying **268.38 MB** (0.26 GB).

### Key Architectural Discovery
The vault contains two distinct layers:
1. **The MEKB Engine & Runtime Infrastructure:** 19,256 files residing within `.venv` (Python 3.12/3.14 virtualenv with SQLAlchemy, Pandas, OpenPyXL, Pydantic, NumPy) and `node_modules` (TypeScript/Jest toolchain).
2. **The Authoritative Engineering Data Core:** 146 structured files comprising:
   - **`database/mekb.sqlite` (24 relational tables, 3,089+ records)** tracking projects, machines, materials, cycle times, component details, process planning steps, and full data provenance links.
   - **33 Master Engineering Documentation & Analysis Reports** in `docs/` (e.g. `EngineeringDataDictionary.md`, `FolderStructureAnalysis.md`, `excel_files_structure_report.md`).
   - **Modular Engineering Parsers** in `parsers/` (Blow Mold, Part List, Process Planning, Cycle Time, Component Details, Index Sheets).
   - **Master Inventories & Workbooks** (`EngineeringAssetInventory.json`, `EngineeringAssetInventory.xlsx`, `PL.xlsx`).

---

## 2. Quantitative Vault Breakdown

```
D:\Mitra3.0\MitraEngineeringLibrary
├── database/                   → SQLite relational vault (mekb.sqlite: 24 tables, 3,089+ rows)
├── docs/                       → 33 engineering documentation & analysis specifications (3.0 MB)
├── parsers/                    → 7 modular extraction parsers (Python)
├── models/                     → SQLAlchemy & TypeORM entity models
├── importers/                  → Pipeline validator & batch import runner
├── api/                        → FastAPI service layer for MITRA data bridge
├── scripts/                    → CLI validation & audit tools
├── exports/                    → HTML batch validation reports
├── .venv/ & node_modules/      → Execution environment for local extraction
└── Master Workbooks            → PL.xlsx, EngineeringAssetInventory.xlsx/json
```

| Component | Files | Size | Role in Engineering Knowledge |
| :--- | :--- | :--- | :--- |
| **Relational Database (`database/`)** | 3 | 0.9 MB | Structured project master, BOM parts, process plans, cycle times, 985 provenance links |
| **Documentation & Dictionaries (`docs/`)** | 33 | 3.0 MB | Deep engineering taxonomies, folder structure mappings, material/machine validation rules |
| **Extraction Parsers (`parsers/`)** | 10 | 0.1 MB | Field extractors for Excel BOMs, cycle times, components, and process planning |
| **Pipeline & Models (`models/`, `importers/`)** | 14 | 0.1 MB | Relational schemas, validation constraints, and batch import processors |
| **Engineering Workbooks (`.xlsx`, `.json`)** | 4 | 0.5 MB | Master asset inventories, project listings, and raw process sheets |
| **Runtime Dependencies (`.venv`, `node_modules`)** | 19,256 | 263.8 MB | Python/Node execution runtime for air-gapped local parser execution |
| **Total** | **19,402** | **268.38 MB** | **Complete Engineering Knowledge Vault** |

---

## 3. Supported Engineering Domains

The discovered engineering library contains verified domain knowledge across:
1. **Blow Mold Engineering (BM):** 131+ projects, cycle time benchmarks (18.0s for 4+4 / 6+6 cavitation), parison lengths, pinch widths, neck/base scrap chamber depths (D, Z, F).
2. **Injection Mold Engineering (IM & IBM):** Tool construction, mold base standard parts, cavity/core insert dimensions, cooling block specifications.
3. **Materials & Heat Treatment:** Tool steels (`1.2085`, `1.2311`, `1.2344`, `P20`, `EN8`), high-conductivity alloys (`HOKOTOL`, `ALUMOLD 500`, `Beryllium Copper`), resin behaviors (HDPE, PP, PET, LDPE).
4. **Standard Part Suppliers:** Catalog specifications from `MISUMI`, `Hasco`, `DME`, `Fibro`, `Punch`.
5. **Customer Packaging Families:** Design specifications for `ALPLA`, `CREATIVE`, `WEENER`, `ALTERNICQ`, `Dabur`, `Amruthanjan`, `Veedol`, `Reckitt/Mortein`.
