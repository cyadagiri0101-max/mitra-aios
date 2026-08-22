# Mitra Engineering Knowledge Base (MEKB) — Plan

## Date: 2026-07-03
## Objective: Build a standalone Engineering Data Library for MITRA
## Location: D:\MitraEngineeringLibrary
## Constraint: NEVER modify D:\Mitra3.0

---

## Stage 1: Data Exploration & Analysis
- Load all Excel files and understand their schema, headers, and data types
- Parse engineering text files for structure and content patterns
- Analyze folder structure from FolderList.txt
- Document findings in `docs/data_dictionary.md`

**Sub-agents:**
- Explorer_BlowMolds → Excel blow mold files (cycle times, internal study)
- Explorer_ProcessPlanning → Process planning sheets (BM454, BM471, BM476, BM377)
- Explorer_IndexPartList → Index sheets and part lists
- Explorer_TextFiles → Pasted text files and engineering notes
- Explorer_FolderStructure → FolderList.txt parsing

**Output:** `docs/data_dictionary.md`

---

## Stage 2: Database Schema Design
- Design normalized relational schema
- Master tables: Project, Product, BottleFamily, Customer, Machine, Material, NeckType
- Transactional tables: CycleTime, PartList, ProcessPlanning, DocumentIndex, EngineeringNotes
- Metadata tables: ImportLog, RevisionHistory, DataSource, AI_SearchTags
- Link tables: ProjectRelationships, BottleFamily_TechnicalSpec

**Output:** `database/schema.sql`, `models/entities.py`

---

## Stage 3: Importer Architecture
- Modular parser framework (base parser + specific parsers)
- Config-driven mapping (YAML/JSON)
- SQLite for dev, PostgreSQL for production
- SQLAlchemy ORM models
- Alembic migrations

**Output:** `importers/base.py`, `importers/config.yaml`, `models/__init__.py`

---

## Stage 4: Parser Implementation (Parallel)
- `parsers/blow_mold_parser.py` — Cycle times, internal study
- `parsers/process_planning_parser.py` — Process planning sheets
- `parsers/index_parser.py` — Index sheets
- `parsers/partlist_parser.py` — Part lists
- `parsers/component_parser.py` — Component details
- `parsers/text_parser.py` — Engineering notes, folder structure

**Output:** All parser modules + unit tests

---

## Stage 5: Data Import Pipeline
- Orchestrator that reads source config
- Calls correct parser per file type
- Validates, deduplicates, version-checks
- Writes to database with full provenance
- Generates validation report

**Output:** `importers/pipeline.py`, `importers/validator.py`

---

## Stage 6: REST API
- FastAPI app with auto-generated docs
- Endpoints for all master tables
- Sync endpoints for MITRA
- Pagination, filtering, search
- Health check

**Output:** `api/main.py`, `api/routers/`

---

## Stage 7: Validation & Reporting
- Import log with counts, errors, warnings
- Validation report (duplicates, unmapped values, schema mismatches)
- Revision audit trail
- Export clean data to CSV/JSON for MITRA

**Output:** `exports/validation_report.html`, `logs/import_YYYY-MM-DD.log`

---

## Stage 8: Final Integration & Delivery
- Requirements.txt / pyproject.toml
- README.md with setup instructions
- Configuration template
- Run full import against all source files
- Verify REST API

**Output:** Production-ready MEKB project at `D:\MitraEngineeringLibrary`

---

## Skills Used
- None explicitly required (custom architecture)
- Python 3.12 + SQLAlchemy + FastAPI + Pandas + OpenPyXL

## File Propagation (A2A)
- Stage 1 → Stage 2: data_dictionary.md
- Stage 2 → Stage 3: schema.sql, entities.py
- Stage 3 → Stage 4: base.py, config.yaml
- Stage 4 → Stage 5: all parser modules
- Stage 5 → Stage 6: clean database + models
- Stage 6 → Stage 7: API for validation queries
- Stage 7 → Stage 8: reports + docs

## Phase 1 Completion Rule
Phase 1 is COMPLETE only when ALL of the following exist:
- ✓ EngineeringAssetInventory.xlsx
- ✓ EngineeringAssetInventory.json
- ✓ WorkbookAnalysis.md
- ✓ WorkbookAnalysis.xlsx
- ✓ EngineeringDataDictionary.md
- ✓ EngineeringDataDictionary.xlsx
- ✓ ImportSpecification_<Workbook>.md (for every workbook)
- ✓ FolderStructureAnalysis.md
- ✓ EngineeringNamingConvention.md
- ✓ BusinessRules.md
- ✓ ValidationRules.md

Until then, DO NOT advance to Phase 2.
