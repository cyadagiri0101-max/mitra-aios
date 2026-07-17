# Data Lineage Map

This map traces verified data flow only, using repository-backed evidence from ImporterInventory.md, EngineeringImportPipelineDiscovery.md, DatabaseSchemaInventory.md, ServiceDependencyInventory.md, APIRouteInventory.md, and ArchitectureEvidence.md.

Format: Source → Importer → Database Table → ORM Entity → Service → API Endpoint → Consumer → Repository Evidence

---

- Source: PMM Master Excel (`pmm_data_library/PMM_Master_Data_Library.xlsx`)
  → Importer: `pmm_data_library/setup_db.py` (`build_database` writes via `df.to_sql`)  
  → Database Table(s): PMM-target tables (e.g., `blow_molds`, `injection_molds`, `job_works`) — NOT VERIFIABLE against mekb.sqlite schema (DatabaseSchemaInventory.md)  
  → ORM Entity: NOT VERIFIABLE for mekb.sqlite (these PMM tables target `pmm_database.db`)  
  → Service: NOT APPLICABLE (PMM importer writes separate DB)  
  → API Endpoint: NOT FOUND  
  → Consumer: External PMM consumers or scripts (pmm tools)  
  → Repository Evidence: pmm_data_library/setup_db.py (ImporterInventory.md; EngineeringImportPipelineDiscovery.md)

- Source: Engineering workbooks in `temp data/` (e.g., `Blow Molds Data for Internal Study.xlsx`, `029_Blow Molds Cycle Times.xlsx`, `BM*_Process planning sheet.xlsx`)  
  → Importer: NO IMPLEMENTATION FOUND in repository (ImporterInventory.md)  
  → Database Table(s): Candidate targets such as `cycle_time_history`, `process_planning`, `part_list`, `component_detail`, `document_index` — tables exist in mekb.sqlite (DatabaseSchemaInventory.md)  
  → ORM Entity: `CycleTimeHistory`, `ProcessPlanning`, `PartList`, `ComponentDetail`, `DocumentIndex` — models/entities.py (lines cited in DatabaseSchemaInventory.md)  
  → Service: NOT FOUND (no dedicated importer services documented for these tables)  
  → API Endpoint: Project-scoped endpoints expose these tables where applicable — e.g., `GET /api/v1/projects/{project_number}/cycle-times` (api/main.py line 121), `GET /api/v1/projects/{project_number}/process-planning` (api/main.py line 148), `GET /api/v1/projects/{project_number}/part-list` (api/main.py line 176), `GET /api/v1/projects/{project_number}/documents` (api/main.py line 214)  
  → Consumer: MITRA sync consumers and API clients (AI consumers per AIReadinessAssessment.md)  
  → Repository Evidence: ImporterInventory.md (workbook files present but no importer); DatabaseSchemaInventory.md (tables exist); APIRouteInventory.md (endpoints exist)

- Source: Unknown/original external ETL (origin of `mekb.sqlite`)  
  → Importer: NOT FOUND  
  → Database Table(s): `project_master`, `product_master`, `customer_master`, etc. (DatabaseSchemaInventory.md)  
  → ORM Entity: models/entities.py classes (evidence lines)  
  → Service: `ProjectService` covers master data operations for project/product/customer (src/services/project-service.ts)  
  → API Endpoint: `GET /api/v1/projects`, `GET /api/v1/products`, etc. (APIRouteInventory.md)  
  → Consumer: Validation scripts, API clients, AI tooling (ValidatorVerificationReport.md; AIReadinessAssessment.md)  
  → Repository Evidence: EngineeringDatabaseOrigin.md (notes `mekb.sqlite` origin NOT VERIFIABLE), DatabaseSchemaInventory.md, ServiceDependencyInventory.md, APIRouteInventory.md

- Source: Text file importer usage (TypeScript `ImporterService.importEngineeringTextFile`)  
  → Importer: `src/services/importer.service.ts` (importEngineeringTextFile method lines 31)  
  → Database Table(s): `engineering_document` repository (TypeORM entity) / `document_index` in SQLite evidence (DatabaseSchemaInventory.md)  
  → ORM Entity: `EngineeringDocument` (TypeORM entity listed in AppDataSourceOptions)  
  → Service: `ImporterService` (src/services/importer.service.ts)  
  → API Endpoint: Not directly exposed; import activity recorded in `import_log` and visible via `GET /api/v1/import-logs` (api/main.py line 690)  
  → Consumer: Import monitoring via dashboard widgets (`GET /api/v1/dashboard/widgets` uses ImportLog)  
  → Repository Evidence: src/services/importer.service.ts (ServiceDependencyInventory.md); api/main.py dashboard endpoint (APIRouteInventory.md); DatabaseSchemaInventory.md

- Source: improve_ekl_data.py transformations (script)  
  → Importer: `improve_ekl_data.py` (script performing INSERT/UPDATE to mekb.sqlite)  
  → Database Table(s): multiple engineering tables (e.g., `bottle_family`, `customer_master`, `project_customer_link`, `neck_type_master`, `project_relationships`, `ai_search_tags`, `product_master`, `project_master`, `cycle_time_history`) per EngineeringImportPipelineDiscovery.md  
  → ORM Entity: corresponding SQLAlchemy classes in models/entities.py (lines cited)  
  → Service: NOT APPLICABLE (standalone script)  
  → API Endpoint: Tables updated by script are exposed via various GET endpoints (APIRouteInventory.md)  
  → Consumer: Validation and documentation scripts; AI consumers (ValidatorVerificationReport.md; AIReadinessAssessment.md)  
  → Repository Evidence: improve_ekl_data.py code (EngineeringImportPipelineDiscovery.md); DatabaseSchemaInventory.md; APIRouteInventory.md

---

If any stage is absent in the repository evidence it is marked above as NOT FOUND or NOT VERIFIABLE. All lineage entries are strictly supported by the cited repository documents listed at the top.
