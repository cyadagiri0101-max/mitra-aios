# Engineering Capability Matrix

Source evidence: docs/APIReadinessAssessment.md, docs/AIReadinessAssessment.md, docs/APIRouteInventory.md, docs/DatabaseSchemaInventory.md, docs/ServiceDependencyInventory.md, docs/ValidatorVerificationReport.md, docs/EngineeringKnowledgeMap.md

Format: Capability | Knowledge Domain | Database | ORM | API | Service | Importer | Validator | Current Status | Repository Evidence | Confidence

- Capability: Project Lookup
  - Knowledge Domain: Projects
  - Database: `project_master` (DatabaseSchemaInventory.md)
  - ORM: `ProjectMaster` (models/entities.py lines cited in DatabaseSchemaInventory.md)
  - API: `GET /api/v1/projects`, `GET /api/v1/projects/{project_number}` (APIRouteInventory.md)
  - Service: `ProjectService` (src/services/project-service.ts) (ServiceDependencyInventory.md)
  - Importer: NOT FOUND (ImporterInventory.md; EngineeringImportPipelineDiscovery.md)
  - Validator: acceptance_evidence.py queries reference `project_master` (ValidatorVerificationReport.md)
  - Current Status: Available
  - Repository Evidence: APIRouteInventory.md; DatabaseSchemaInventory.md; ServiceDependencyInventory.md; ValidatorVerificationReport.md
  - Confidence: VERIFIED

- Capability: BOM Retrieval
  - Knowledge Domain: Part Lists
  - Database: `part_list` (DatabaseSchemaInventory.md)
  - ORM: `PartList` (models/entities.py)
  - API: `GET /api/v1/projects/{project_number}/part-list` (APIRouteInventory.md)
  - Service: NOT FOUND
  - Importer: NOT FOUND (ImporterInventory.md)
  - Validator: referenced in acceptance_evidence.py (ValidatorVerificationReport.md)
  - Current Status: Available
  - Repository Evidence: APIRouteInventory.md; DatabaseSchemaInventory.md; ValidatorVerificationReport.md
  - Confidence: VERIFIED

- Capability: Process Planning
  - Knowledge Domain: Process Planning
  - Database: `process_planning` (DatabaseSchemaInventory.md)
  - ORM: `ProcessPlanning` (models/entities.py)
  - API: `GET /api/v1/projects/{project_number}/process-planning` (APIRouteInventory.md)
  - Service: NOT FOUND
  - Importer: NOT FOUND (ImporterInventory.md)
  - Validator: referenced in acceptance_evidence.py (ValidatorVerificationReport.md)
  - Current Status: Available
  - Repository Evidence: APIRouteInventory.md; DatabaseSchemaInventory.md
  - Confidence: VERIFIED

- Capability: Cycle Times
  - Knowledge Domain: Cycle Time History
  - Database: `cycle_time_history` (DatabaseSchemaInventory.md)
  - ORM: `CycleTimeHistory` (models/entities.py)
  - API: `GET /api/v1/projects/{project_number}/cycle-times`, `GET /api/v1/cycle-times` (APIRouteInventory.md)
  - Service: NOT FOUND
  - Importer: NOT FOUND for engineering cycle-time workbooks (ImporterInventory.md)
  - Validator: referenced in acceptance_evidence.py (ValidatorVerificationReport.md)
  - Current Status: Available
  - Repository Evidence: APIRouteInventory.md; DatabaseSchemaInventory.md; ImporterInventory.md
  - Confidence: VERIFIED

- Capability: Documents (project-scoped)
  - Knowledge Domain: Documents / Document Index
  - Database: `document_index` (DatabaseSchemaInventory.md)
  - ORM: `DocumentIndex` (models/entities.py)
  - API: `GET /api/v1/projects/{project_number}/documents`, `GET /api/v1/documents`, `GET /api/v1/documents/{document_id}` (APIRouteInventory.md)
  - Service: NOT FOUND
  - Importer: NOT FOUND (ImporterInventory.md)
  - Validator: referenced in acceptance_evidence.py (ValidatorVerificationReport.md)
  - Current Status: Available
  - Repository Evidence: APIRouteInventory.md; DatabaseSchemaInventory.md
  - Confidence: VERIFIED

- Capability: Products List
  - Knowledge Domain: Products
  - Database: `product_master` (DatabaseSchemaInventory.md)
  - ORM: `ProductMaster` (models/entities.py)
  - API: `GET /api/v1/products` (APIRouteInventory.md)
  - Service: `ProjectService.findOrCreateProduct` (ServiceDependencyInventory.md)
  - Importer: NOT FOUND (ImporterInventory.md)
  - Validator: referenced in ValidatorVerificationReport.md
  - Current Status: Available
  - Repository Evidence: APIRouteInventory.md; DatabaseSchemaInventory.md; ServiceDependencyInventory.md
  - Confidence: VERIFIED

- Capability: Machines List
  - Knowledge Domain: Machines
  - Database: `machine_master` (DatabaseSchemaInventory.md)
  - ORM: `MachineMaster` (models/entities.py)
  - API: `GET /api/v1/machines` and `GET /api/machines` (APIRouteInventory.md)
  - Service: NOT FOUND
  - Importer: NOT FOUND
  - Validator: referenced in ValidatorVerificationReport.md
  - Current Status: Available
  - Repository Evidence: APIRouteInventory.md; DatabaseSchemaInventory.md
  - Confidence: VERIFIED

- Capability: Materials List
  - Knowledge Domain: Materials
  - Database: `material_master` (DatabaseSchemaInventory.md)
  - ORM: `MaterialMaster` (models/entities.py)
  - API: `GET /api/v1/materials` and `GET /api/materials` (APIRouteInventory.md)
  - Service: NOT FOUND
  - Importer: NOT FOUND
  - Validator: referenced in ValidatorVerificationReport.md
  - Current Status: Available
  - Repository Evidence: APIRouteInventory.md; DatabaseSchemaInventory.md
  - Confidence: VERIFIED

- Capability: Component Details
  - Knowledge Domain: Component Detail
  - Database: `component_detail` (DatabaseSchemaInventory.md)
  - ORM: `ComponentDetail` (models/entities.py)
  - API: `GET /api/v1/components` (APIRouteInventory.md)
  - Service: NOT FOUND
  - Importer: NOT FOUND
  - Validator: referenced in ValidatorVerificationReport.md
  - Current Status: Available
  - Repository Evidence: APIRouteInventory.md; DatabaseSchemaInventory.md
  - Confidence: VERIFIED

- Capability: Import Log Visibility
  - Knowledge Domain: Import Log
  - Database: `import_log` (DatabaseSchemaInventory.md)
  - ORM: `ImportLog` (models/entities.py)
  - API: `GET /api/v1/import-logs` (APIRouteInventory.md)
  - Service: `ImporterService` (src/services/importer.service.ts) for TypeScript stack (ServiceDependencyInventory.md)
  - Importer: `pmm_data_library/setup_db.py` writes to `pmm_database.db`; TypeScript importer exists for engineering text files (ImporterInventory.md; ServiceDependencyInventory.md)
  - Validator: Dashboard widget uses ImportLog (api/main.py dashboard endpoint — ArchitectureEvidence.md)
  - Current Status: Partial (import log exists and endpoint exists; upstream engineering importers to mekb.sqlite NOT FOUND)
  - Repository Evidence: APIRouteInventory.md; DatabaseSchemaInventory.md; ServiceDependencyInventory.md; ImporterInventory.md
  - Confidence: VERIFIED

- Capability: Technical Specifications retrieval
  - Knowledge Domain: Technical Specification
  - Database: `technical_specification` (DatabaseSchemaInventory.md)
  - ORM: `TechnicalSpecification` (models/entities.py)
  - API: NOT FOUND
  - Service: NOT FOUND
  - Importer: NOT FOUND
  - Validator: referenced in ValidatorVerificationReport.md
  - Current Status: Unavailable
  - Repository Evidence: DatabaseSchemaInventory.md; APIRouteInventory.md
  - Confidence: VERIFIED

- Capability: Engineering Notes retrieval
  - Knowledge Domain: Engineering Notes
  - Database: `engineering_notes` (DatabaseSchemaInventory.md)
  - ORM: `EngineeringNote` (models/entities.py)
  - API: NOT FOUND
  - Service: NOT FOUND
  - Importer: NOT FOUND
  - Validator: referenced in ValidatorVerificationReport.md
  - Current Status: Unavailable
  - Repository Evidence: DatabaseSchemaInventory.md; APIRouteInventory.md
  - Confidence: VERIFIED

- Capability: Project History / Revision
  - Knowledge Domain: Revision History
  - Database: `revision_history` (DatabaseSchemaInventory.md)
  - ORM: `RevisionHistory` (models/entities.py)
  - API: NOT FOUND
  - Service: NOT FOUND
  - Importer: NOT FOUND
  - Validator: NOT FOUND
  - Current Status: Unavailable / NOT VERIFIABLE for API exposure
  - Repository Evidence: models/entities.py; APIRouteInventory.md
  - Confidence: VERIFIED


End of Engineering Capability Matrix
