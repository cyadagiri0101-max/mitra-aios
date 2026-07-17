# Engineering Knowledge Map

Source: Built exclusively from verified repository documentation (see ArchitectureEvidence.md, DatabaseSchemaInventory.md, APIRouteInventory.md, ServiceDependencyInventory.md, ImporterInventory.md, EngineeringImportPipelineDiscovery.md, EngineeringDatabaseOrigin.md, ValidatorVerificationReport.md, ValidationQueryAudit.md, AIReadinessAssessment.md).

For each knowledge domain the fields below are populated only with repository-backed evidence.

Format per domain:
- Knowledge Domain:
  - Repository: D:\MitraEngineeringLibrary (files listed below)
  - Database Table: <table name> (from DatabaseSchemaInventory.md)
  - ORM Entity: <class name> (from models/entities.py with line ref)
  - API Endpoint: <endpoint and file/line> or NOT FOUND
  - Service: <service class/file/line> or NOT FOUND
  - Importer: <importer file/function/line> or NOT FOUND/NOT VERIFIABLE
  - Validator: <validator file/line> or NOT FOUND
  - Documentation: list of docs referencing this domain
  - Repository File (evidence): file path(s)
  - Function/Class: function or class name in repository evidence
  - Line Number: line(s) from evidence docs (as cited below)
  - Confidence: VERIFIED / NOT FOUND / NOT VERIFIABLE

---

- Knowledge Domain: Projects
  - Repository: D:\MitraEngineeringLibrary
  - Database Table: `project_master` (DatabaseSchemaInventory.md)
  - ORM Entity: `ProjectMaster` — models/entities.py (lines 47-48)
  - API Endpoint: `GET /api/v1/projects` and `GET /api/v1/projects/{project_number}` — D:\MitraEngineeringLibrary\api\main.py (lines 63, 103) and TypeScript `GET /api/projects` — D:\MitraEngineeringLibrary\src\controllers\api.controller.ts (line 12)
  - Service: `ProjectService` — src/services/project-service.ts (class at line 11) [handles project creation/lookup]
  - Importer: NOT FOUND for explicit Excel→mekb.sqlite importer; `improve_ekl_data.py` contains `INSERT` statements affecting `project_master` (EngineeringImportPipelineDiscovery.md evidence)
  - Validator: `acceptance_evidence.py` queries reference `project_master` (ValidatorVerificationReport.md — multiple queries)
  - Documentation: DatabaseSchemaInventory.md; APIRouteInventory.md; AIReadinessAssessment.md; ValidatorVerificationReport.md
  - Repository File: D:\MitraEngineeringLibrary\models\entities.py (ProjectMaster lines 47-48); D:\MitraEngineeringLibrary\api\main.py (routes lines 63,103);
  - Function/Class: `ProjectMaster` class (models/entities.py); `ProjectService` class (src/services/project-service.ts)
  - Line Number: entities.py lines 47-48; api/main.py lines 63,103; project-service.ts line 11
  - Confidence: VERIFIED

- Knowledge Domain: Products
  - Repository: D:\MitraEngineeringLibrary
  - Database Table: `product_master` (DatabaseSchemaInventory.md)
  - ORM Entity: `ProductMaster` — models/entities.py (lines 66-67)
  - API Endpoint: `GET /api/v1/products` — D:\MitraEngineeringLibrary\api\main.py (line 504)
  - Service: `ProjectService` methods reference `ProductMaster` (src/services/project-service.ts — findOrCreateProduct at line 36)
  - Importer: NOT FOUND (no explicit importer to `product_master`); `improve_ekl_data.py` contains insert/update statements referencing `product_master` (EngineeringImportPipelineDiscovery.md)
  - Validator: acceptance_evidence.py queries reference `product_master` (ValidatorVerificationReport.md)
  - Documentation: DatabaseSchemaInventory.md; APIRouteInventory.md; AIReadinessAssessment.md; ImporterInventory.md
  - Repository File: models/entities.py lines 66-67; api/main.py line 504; src/services/project-service.ts line 36
  - Function/Class: `ProductMaster` class; `findOrCreateProduct()` (project-service.ts)
  - Line Number: entities.py 66-67; api/main.py 504; project-service.ts 36
  - Confidence: VERIFIED

- Knowledge Domain: Customers
  - Repository: D:\MitraEngineeringLibrary
  - Database Table: `customer_master` (DatabaseSchemaInventory.md)
  - ORM Entity: `CustomerMaster` — models/entities.py (lines 117-118)
  - API Endpoint: `GET /api/customers` — D:\MitraEngineeringLibrary\src\controllers\api.controller.ts (line 17); no Python endpoint exposing customers documented (APIRouteInventory.md)
  - Service: `ProjectService.findOrCreateCustomer` — src/services/project-service.ts (line 26)
  - Importer: `improve_ekl_data.py` contains INSERT statements for `customer_master` (EngineeringImportPipelineDiscovery.md); no Excel→mekb.sqlite importer found (ImporterInventory.md)
  - Validator: acceptance_evidence.py includes counts and orphan checks for `customer_master` (ValidatorVerificationReport.md)
  - Documentation: DatabaseSchemaInventory.md; ImporterInventory.md; EngineeringImportPipelineDiscovery.md; ValidatorVerificationReport.md
  - Repository File: models/entities.py lines 117-118; src/controllers/api.controller.ts line 17; src/services/project-service.ts line 26; improve_ekl_data.py (insertion evidence recorded in EngineeringImportPipelineDiscovery.md)
  - Function/Class: `CustomerMaster` class; `findOrCreateCustomer()`
  - Line Number: entities.py 117-118; api.controller.ts 17; project-service.ts 26
  - Confidence: VERIFIED

- Knowledge Domain: Machines
  - Repository: D:\MitraEngineeringLibrary
  - Database Table: `machine_master` (DatabaseSchemaInventory.md)
  - ORM Entity: `MachineMaster` — models/entities.py (lines 129-130)
  - API Endpoint: `GET /api/v1/machines` — D:\MitraEngineeringLibrary\api\main.py (line 542) and TypeScript `GET /api/machines` — src/controllers/api.controller.ts (line 22)
  - Service: NOT FOUND (no dedicated machine service class documented)
  - Importer: NOT FOUND (no explicit importer found); `improve_ekl_data.py` references `machine_master` in SQL strings (EngineeringImportPipelineDiscovery.md)
  - Validator: acceptance_evidence.py queries reference `machine_master` (ValidatorVerificationReport.md)
  - Documentation: DatabaseSchemaInventory.md; APIRouteInventory.md; AIReadinessAssessment.md
  - Repository File: models/entities.py 129-130; api/main.py 542; src/controllers/api.controller.ts 22
  - Function/Class: `MachineMaster` class
  - Line Number: entities.py 129-130; api/main.py 542; api.controller.ts 22
  - Confidence: VERIFIED

- Knowledge Domain: Materials
  - Repository: D:\MitraEngineeringLibrary
  - Database Table: `material_master` (DatabaseSchemaInventory.md)
  - ORM Entity: `MaterialMaster` — models/entities.py (lines 143-144)
  - API Endpoint: `GET /api/v1/materials` — D:\MitraEngineeringLibrary\api\main.py (line 574) and TypeScript `GET /api/materials` — src/controllers/api.controller.ts (line 27)
  - Service: NOT FOUND (no dedicated material service class documented)
  - Importer: NOT FOUND; improve_ekl_data.py does not explicitly show material_master inserts in ImporterInventory (NOT FOUND for Excel importer)
  - Validator: referenced in acceptance_evidence.py (ValidatorVerificationReport.md)
  - Documentation: DatabaseSchemaInventory.md; APIRouteInventory.md; AIReadinessAssessment.md
  - Repository File: entities.py 143-144; api/main.py 574; api.controller.ts 27
  - Line Number: entities.py 143-144; api/main.py 574; api.controller.ts 27
  - Confidence: VERIFIED

- Knowledge Domain: Cycle Times
  - Repository: D:\MitraEngineeringLibrary
  - Database Table: `cycle_time_history` (DatabaseSchemaInventory.md)
  - ORM Entity: `CycleTimeHistory` — models/entities.py (lines 232-233)
  - API Endpoint: `GET /api/v1/projects/{project_number}/cycle-times` (api/main.py line 121) and `GET /api/v1/cycle-times` (api/main.py line 600)
  - Service: NOT FOUND
  - Importer: NOT FOUND (ImporterInventory marks cycle-time importer NO IMPLEMENTATION FOUND; workbook exists under `temp data`) — ImporterInventory.md
  - Validator: acceptance_evidence.py runs orphan and duplicate checks for `cycle_time_history` (ValidatorVerificationReport.md)
  - Documentation: DatabaseSchemaInventory.md; APIRouteInventory.md; ImporterInventory.md; EngineeringImportPipelineDiscovery.md
  - Repository File: entities.py 232-233; api/main.py 121,600; import workbook evidence in `temp data/` referenced by ImporterInventory.md
  - Line Number: entities.py 232-233; api/main.py 121,600
  - Confidence: VERIFIED (table and endpoints verified); Importer: NOT FOUND

- Knowledge Domain: Process Planning
  - Repository: D:\MitraEngineeringLibrary
  - Database Table: `process_planning` (DatabaseSchemaInventory.md)
  - ORM Entity: `ProcessPlanning` — models/entities.py (lines 251-252)
  - API Endpoint: `GET /api/v1/projects/{project_number}/process-planning` — api/main.py (line 148)
  - Service: NOT FOUND
  - Importer: NO IMPLEMENTATION FOUND (ImporterInventory.md lists process-planning workbooks but no importer)
  - Validator: acceptance_evidence.py includes checks referencing `process_planning` (ValidatorVerificationReport.md)
  - Documentation: DatabaseSchemaInventory.md; APIRouteInventory.md; ImporterInventory.md
  - Repository File: entities.py 251-252; api/main.py 148
  - Line Number: entities.py 251-252; api/main.py 148
  - Confidence: VERIFIED (table + endpoint); Importer: NOT FOUND

- Knowledge Domain: Technical Specifications
  - Repository: D:\MitraEngineeringLibrary
  - Database Table: `technical_specification` (DatabaseSchemaInventory.md)
  - ORM Entity: `TechnicalSpecification` — models/entities.py (lines 103-104)
  - API Endpoint: NOT FOUND (no endpoint exposing technical specifications documented in APIRouteInventory.md)
  - Service: NOT FOUND
  - Importer: NOT FOUND
  - Validator: acceptance_evidence.py contains a joined query involving `technical_specification` (ValidatorVerificationReport.md, query 8)
  - Documentation: DatabaseSchemaInventory.md; ValidatorVerificationReport.md; AIReadinessAssessment.md (noted as not exposed)
  - Repository File: entities.py 103-104
  - Line Number: entities.py 103-104
  - Confidence: VERIFIED (table/entity exists); API/Importer/Service: NOT FOUND

- Knowledge Domain: Part Lists
  - Repository: D:\MitraEngineeringLibrary
  - Database Table: `part_list` (DatabaseSchemaInventory.md)
  - ORM Entity: `PartList` — models/entities.py (lines 273-274)
  - API Endpoint: `GET /api/v1/projects/{project_number}/part-list` — api/main.py (line 176)
  - Service: NOT FOUND
  - Importer: NO IMPLEMENTATION FOUND (ImporterInventory.md lists partlist workbooks; no importer found)
  - Validator: referenced in acceptance_evidence.py (ValidatorVerificationReport.md)
  - Documentation: DatabaseSchemaInventory.md; APIRouteInventory.md; ImporterInventory.md
  - Repository File: entities.py 273-274; api/main.py 176
  - Line Number: entities.py 273-274; api/main.py 176
  - Confidence: VERIFIED (table + endpoint); Importer: NOT FOUND

- Knowledge Domain: Component Details
  - Repository: D:\MitraEngineeringLibrary
  - Database Table: `component_detail` (DatabaseSchemaInventory.md)
  - ORM Entity: `ComponentDetail` — models/entities.py (lines 301-302)
  - API Endpoint: `GET /api/v1/components` — api/main.py (line 644)
  - Service: NOT FOUND
  - Importer: NO IMPLEMENTATION FOUND (ImporterInventory.md notes component workbook but no importer)
  - Validator: acceptance_evidence.py includes checks for `component_detail` (ValidatorVerificationReport.md)
  - Documentation: DatabaseSchemaInventory.md; APIRouteInventory.md; ImporterInventory.md
  - Repository File: entities.py 301-302; api/main.py 644
  - Line Number: entities.py 301-302; api/main.py 644
  - Confidence: VERIFIED

- Knowledge Domain: Engineering Notes
  - Repository: D:\MitraEngineeringLibrary
  - Database Table: `engineering_notes` (DatabaseSchemaInventory.md)
  - ORM Entity: `EngineeringNote` — models/entities.py (lines 322-323)
  - API Endpoint: NOT FOUND
  - Service: NOT FOUND
  - Importer: NOT FOUND
  - Validator: acceptance_evidence.py includes orphan checks for `engineering_notes` (ValidatorVerificationReport.md)
  - Documentation: DatabaseSchemaInventory.md; ValidatorVerificationReport.md; AIReadinessAssessment.md (noted as not exposed)
  - Repository File: entities.py 322-323
  - Line Number: entities.py 322-323
  - Confidence: VERIFIED (table/entity); API/Importer/Service: NOT FOUND

- Knowledge Domain: Documents
  - Repository: D:\MitraEngineeringLibrary
  - Database Table: `document_index` (DatabaseSchemaInventory.md)
  - ORM Entity: `DocumentIndex` — models/entities.py (lines 336-337)
  - API Endpoint: `GET /api/v1/projects/{project_number}/documents` — api/main.py (line 214); `GET /api/v1/documents` and `GET /api/v1/documents/{document_id}` exist (api/main.py lines 411, 437)
  - Service: NOT FOUND
  - Importer: NO IMPLEMENTATION FOUND (ImporterInventory.md reports document index importers not found)
  - Validator: acceptance_evidence.py references `document_index` in multiple queries (ValidatorVerificationReport.md)
  - Documentation: DatabaseSchemaInventory.md; APIRouteInventory.md; ImporterInventory.md
  - Repository File: entities.py 336-337; api/main.py 214,411,437
  - Line Number: entities.py 336-337; api/main.py 214,411,437
  - Confidence: VERIFIED

- Knowledge Domain: Bottle Families
  - Repository: D:\MitraEngineeringLibrary
  - Database Table: `bottle_family` (DatabaseSchemaInventory.md)
  - ORM Entity: `BottleFamily` — models/entities.py (lines 90-91)
  - API Endpoint: `GET /api/v1/search` may return bottle family results (api/main.py line 241) but no dedicated bottle-family endpoint documented
  - Service: referenced indirectly by `ProjectService.findOrCreateProduct` which may create `BottleFamily` (project-service.ts line 36)
  - Importer: `improve_ekl_data.py` contains INSERT statements for `bottle_family` (EngineeringImportPipelineDiscovery.md)
  - Validator: acceptance_evidence.py references `bottle_family` in queries (ValidatorVerificationReport.md)
  - Documentation: DatabaseSchemaInventory.md; ImporterInventory.md; EngineeringImportPipelineDiscovery.md
  - Repository File: entities.py 90-91; project-service.ts 36; improve_ekl_data.py (insertion evidence)
  - Line Number: entities.py 90-91; project-service.ts 36
  - Confidence: VERIFIED

- Knowledge Domain: Neck Types
  - Repository: D:\MitraEngineeringLibrary
  - Database Table: `neck_type_master` (DatabaseSchemaInventory.md)
  - ORM Entity: `NeckTypeMaster` — models/entities.py (lines 156-157)
  - API Endpoint: NOT FOUND (no dedicated neck-type endpoint)
  - Service: `findOrCreateNeckType` in project-service.ts (line 74)
  - Importer: `improve_ekl_data.py` contains INSERTs for `neck_type_master` (EngineeringImportPipelineDiscovery.md)
  - Validator: acceptance_evidence.py includes checks joining `neck_type_master` (ValidatorVerificationReport.md)
  - Documentation: DatabaseSchemaInventory.md; ServiceDependencyInventory.md; ImporterInventory.md
  - Repository File: entities.py 156-157; project-service.ts 74
  - Line Number: entities.py 156-157; project-service.ts 74
  - Confidence: VERIFIED

- Knowledge Domain: Project-Product Link
  - Repository: D:\MitraEngineeringLibrary
  - Database Table: `project_product_link` (DatabaseSchemaInventory.md)
  - ORM Entity: `ProjectProductLink` — models/entities.py (lines 205-206)
  - API Endpoint: NOT FOUND
  - Service: NOT FOUND
  - Importer: NOT FOUND
  - Validator: referenced in acceptance_evidence.py orphan/relationship checks (ValidatorVerificationReport.md)
  - Documentation: DatabaseSchemaInventory.md; ValidatorVerificationReport.md
  - Repository File: entities.py 205-206
  - Line Number: entities.py 205-206
  - Confidence: VERIFIED (table/entity); API/Service/Importer: NOT FOUND

- Knowledge Domain: Project-Customer Link
  - Repository: D:\MitraEngineeringLibrary
  - Database Table: `project_customer_link` (DatabaseSchemaInventory.md)
  - ORM Entity: `ProjectCustomerLink` — models/entities.py (lines 214-215)
  - API Endpoint: NOT FOUND
  - Service: NOT FOUND
  - Importer: `improve_ekl_data.py` performs inserts to `project_customer_link` (EngineeringImportPipelineDiscovery.md)
  - Validator: acceptance_evidence.py references `project_customer_link` (ValidatorVerificationReport.md)
  - Documentation: DatabaseSchemaInventory.md; EngineeringImportPipelineDiscovery.md; ImporterInventory.md
  - Repository File: entities.py 214-215; improve_ekl_data.py (insertion evidence)
  - Line Number: entities.py 214-215
  - Confidence: VERIFIED (table/entity); API/Service: NOT FOUND

- Knowledge Domain: Project Relationships
  - Repository: D:\MitraEngineeringLibrary
  - Database Table: `project_relationships` (DatabaseSchemaInventory.md)
  - ORM Entity: `ProjectRelationship` — models/entities.py (lines 223-224)
  - API Endpoint: NOT FOUND
  - Service: NOT FOUND
  - Importer: `improve_ekl_data.py` contains INSERTs referencing `project_relationships` (EngineeringImportPipelineDiscovery.md)
  - Validator: referenced in EngineeringImportPipelineDiscovery.md and DatabaseSchemaInventory.md
  - Documentation: DatabaseSchemaInventory.md; EngineeringImportPipelineDiscovery.md
  - Repository File: entities.py 223-224; improve_ekl_data.py
  - Line Number: entities.py 223-224
  - Confidence: VERIFIED

- Knowledge Domain: AI Search Tags / AITag
  - Repository: D:\MitraEngineeringLibrary
  - Database Table: `ai_search_tags` (DatabaseSchemaInventory.md)
  - ORM Entity: `AISearchTag` — models/entities.py (lines 192-193) / TypeORM `AITag` entity present in src/data-source entities list
  - API Endpoint: NOT FOUND
  - Service: NOT FOUND
  - Importer: `improve_ekl_data.py` inserts into `ai_search_tags` (EngineeringImportPipelineDiscovery.md)
  - Validator: acceptance_evidence.py references `ai_search_tags` in queries (EngineeringImportPipelineDiscovery.md)
  - Documentation: DatabaseSchemaInventory.md; EngineeringImportPipelineDiscovery.md; ServiceDependencyInventory.md
  - Repository File: entities.py 192-193; src/database/data-source.ts entities list includes `AITag` (line references in DataSource file)
  - Line Number: entities.py 192-193; src/database/data-source.ts (entity registration lines)
  - Confidence: VERIFIED

- Knowledge Domain: Import Log
  - Repository: D:\MitraEngineeringLibrary
  - Database Table: `import_log` (DatabaseSchemaInventory.md)
  - ORM Entity: `ImportLog` — models/entities.py (lines 352-353)
  - API Endpoint: `GET /api/v1/import-logs` — api/main.py (line 690)
  - Service: ImporterService (src/services/importer.service.ts — class at line 7; methods importWorkbook line 10, importEngineeringTextFile line 31)
  - Importer: `pmm_data_library/setup_db.py` writes to pmm_database.db; `importer.service.ts` in TypeScript implements workbook/text imports for EngineeringDocument repository (src/services/importer.service.ts)
  - Validator: referenced in Dashboard endpoints and import log queries (api/main.py dashboard widget uses ImportLog)
  - Documentation: DatabaseSchemaInventory.md; APIRouteInventory.md; ServiceDependencyInventory.md; ImporterInventory.md
  - Repository File: entities.py 352-353; api/main.py 690; src/services/importer.service.ts lines 7-31
  - Line Number: entities.py 352-353; api/main.py 690; importer.service.ts 7,10,31
  - Confidence: VERIFIED

- Knowledge Domain: Data Sources / Provenance / Revision History
  - Repository: D:\MitraEngineeringLibrary
  - Database Tables: `data_sources` (DataSource class lines 11-12), `provenance` (Provenance lines 23-24), `revision_history` (lines 33-34) — models/entities.py
  - ORM Entities: `DataSource`, `Provenance`, `RevisionHistory` — models/entities.py lines 11-34
  - API Endpoint: NOT FOUND (no dedicated provenance API endpoints documented)
  - Service: NOT FOUND
  - Importer: Import pipeline (pmm_data_library/setup_db.py) records source worksheets into PMM tables; `ImporterService.importWorkbook` creates `ImportContext` records (src/services/importer.service.ts) as evidence of provenance capture in TypeScript stack
  - Validator: Validation scripts reference `data_sources` and `provenance` in inventories and audits (DatabaseSchemaInventory.md; EngineeringImportPipelineDiscovery.md)
  - Documentation: DatabaseSchemaInventory.md; ArchitectureEvidence.md; EngineeringImportPipelineDiscovery.md
  - Repository File: entities.py lines 11-34; src/services/importer.service.ts; pmm_data_library/setup_db.py
  - Line Number: entities.py 11-34; importer.service.ts lines 7-31; setup_db.py (documented in ImporterInventory.md)
  - Confidence: VERIFIED

---

End of Engineering Knowledge Map (all entries derived from repository documentation only).