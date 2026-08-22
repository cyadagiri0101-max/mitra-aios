# Mitra Engineering Knowledge Base (MEKB)

**Standalone Engineering Data Library for MITRA**

> **Location:** `D:\MitraEngineeringLibrary`  
> **Completely independent from** `D:\Mitra3.0`  
> **Date:** 2026-07-03

---

## What is MEKB?

The **Mitra Engineering Knowledge Base** is the single source of truth for all engineering data that MITRA will consume. It is built as a completely separate, standalone project so that raw engineering data is never built directly inside MITRA's operational tables.

```
Engineering Files + Excel + Folder Structure
                │
                ▼
    Mitra Engineering Knowledge Base (MEKB)
                │
                ▼
        MITRA Import Service
                │
                ▼
        MITRA Database
```

---

## Architecture

```
D:\MitraEngineeringLibrary
├── database/              → SQLite database (mekb.sqlite)
├── models/                → SQLAlchemy ORM models + database engine
├── parsers/               → Modular Excel/text parsers
├── importers/             → Import pipeline + validation reports
├── api/                   → FastAPI REST endpoints for MITRA sync
├── config/                → Settings (DB URL, paths, prefixes)
├── scripts/               → CLI scripts (run_import.py)
├── exports/               → Validation reports (HTML)
├── logs/                  → Import logs
├── tests/                 → Unit tests
└── docs/                  → Data dictionary, reports
```

---

## Database Schema (24 Tables)

### Master Tables
- `project_master` — All projects (BM, IM, IBM, PD, E, O, CMB, F, S)
- `product_master` — Products / bottles
- `bottle_family` — Bottle families (one bottle → multiple implementations)
- `customer_master` — Customers
- `machine_master` — Blow / Injection molding machines
- `material_master` — Resins / materials
- `neck_type_master` — Neck finish types
- `folder_template_master` — Standard folder structures per prefix
- `document_type_master` — Document classification

### Transactional Tables
- `cycle_time_history` — Cycle time records per machine
- `process_planning` — Process planning steps per project
- `part_list` — Bill of materials per project
- `component_detail` — Component details from Excel
- `document_index` — BM index sheets
- `engineering_notes` — Text-based notes

### Metadata & Audit
- `data_sources` — Source file tracking
- `provenance` — Every record → source file, sheet, row
- `revision_history` — Change audit trail
- `import_log` — Import run summaries
- `ai_search_tags` — AI-generated search tags

### Link Tables
- `project_product_link` — Many-to-many
- `project_customer_link` — Many-to-many
- `project_relationships` — Parent/child (E → PD → BM)

---

## Imported Data Summary

| File | Parser | Records Imported |
|------|--------|-----------------|
| 029_Blow Molds Cycle Times.xlsx | cycle_times | 49 |
| Blow Molds Data for Internal Study.xlsx | blow_mold_internal_study | 378 |
| Blow Molds Data for Internal Study_RevA.xlsx | blow_mold_internal_study | 630 |
| BM-454 INDEX SHEET(1).xlsx | index_sheet | 58 |
| BM-454 INDEX SHEET.xlsx | index_sheet | 115 |
| BM-474 INDEX SHEET.xlsx | index_sheet | 145 |
| BM377 Process planning sheet.xlsx | process_planning | 53 |
| BM454 Veedol…Partlist_RevA(1).xlsx | part_list | 115 |
| BM454 Veedol…Partlist_RevA.xlsx | part_list | 230 |
| BM454_Process planning sheet(1).xlsx | process_planning | 113 |
| BM454_Process planning sheet.xlsx | process_planning | 173 |
| BM471_Process planning sheet.xlsx | process_planning | 224 |
| BM476_Process planning sheet.xlsx | process_planning | 290 |
| component Details.xlsx | component_details | 516 |

**Total:** 3,089 records imported, 1,729 provenance links, 131 unique projects, 81 products, 25 machines, 287 process planning steps, 230 parts, 516 components, 143 document index entries.

---

## How to Run

### 1. Run the Import Pipeline
```bash
cd D:\MitraEngineeringLibrary
python scripts\run_import.py
```

This will:
- Read all Excel files from `D:\Mitra3.0\temp data`
- Normalize into relational tables
- Remove duplicates (project level)
- Track every record back to source file + sheet + row
- Generate an HTML validation report in `exports/`

### 2. Start the REST API
```bash
cd D:\MitraEngineeringLibrary
python api\start_server.py
```

API runs on `http://localhost:8001`

### 3. API Endpoints for MITRA

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check + DB status |
| `GET /api/v1/projects` | List projects (filter by prefix, search) |
| `GET /api/v1/projects/{number}` | Get project details |
| `GET /api/v1/projects/{number}/cycle-times` | Cycle times for project |
| `GET /api/v1/projects/{number}/process-planning` | Process planning for project |
| `GET /api/v1/projects/{number}/part-list` | Part list (BOM) for project |
| `GET /api/v1/projects/{number}/documents` | Document index for project |
| `GET /api/v1/products` | Product catalog |
| `GET /api/v1/machines` | Machine directory |
| `GET /api/v1/materials` | Material directory |
| `GET /api/v1/cycle-times` | All cycle times (filter by project/machine) |
| `GET /api/v1/components` | Component details (filter by tool_no, material, shape) |
| `GET /api/v1/import-logs` | Import history |
| `GET /api/v1/sync/projects` | MITRA sync: projects changed since timestamp |
| `GET /api/v1/sync/all` | MITRA sync: table count summary |

Auto-generated docs: `http://localhost:8001/docs`

---

## Key Design Principles

1. **Never modify MITRA** — MEKB is standalone
2. **Every record is traceable** — source file, sheet, row number, import timestamp
3. **Idempotent imports** — safe to re-run; projects deduplicated, details appended with new batch_id
4. **Revision history** — every change is tracked (old vs new values)
5. **Modular parsers** — each file type has its own parser; easy to add new formats
6. **REST API for sync** — MITRA pulls data, never pushes raw engineering data

---

## Project Prefixes Supported

| Prefix | Meaning |
|--------|---------|
| BM | Blow Mold |
| IM | Injection Mold |
| IBM | Injection Blow Mold |
| PD | Product Design |
| E | Enquiry |
| O | Order / Other Clients |
| CMB | Combined Mold |
| F | Fixture |
| S | Sample |

---

## Next Steps for MITRA Integration

1. **MITRA Import Service** — Build a scheduled job that calls `GET /api/v1/sync/all` to check for changes, then pulls updated projects via `GET /api/v1/sync/projects?since=...`
2. **AI Search Tags** — Populate `ai_search_tags` table with NLP-extracted keywords from descriptions, mold names, and customer data
3. **Folder Scanner** — Add a parser that reads `FolderList.txt` to populate `folder_template_master` and detect project completeness
4. **Parent-Child Linking** — Build logic in `project_relationships` (e.g., E → PD → BM)
5. **Bottle Family** — Group products by family name and link to `technical_specification`

---

## Dependencies

- Python 3.12+
- SQLAlchemy 2.0+
- FastAPI + Uvicorn
- Pandas + OpenPyXL
- Jinja2 (for validation reports)
- SQLite (dev) / PostgreSQL (production)

---

*Built for Prathiraj Metal Masters Pvt. Ltd.*  
*Mitra Engineering Knowledge Base v1.0.0*
