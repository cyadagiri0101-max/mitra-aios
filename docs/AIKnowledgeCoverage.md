# AI Knowledge Coverage

This document records, for each engineering question class, whether the repository provides verified data, APIs, services, and validators to support answering the question. All assessments are based only on repository-backed documentation (AIReadinessAssessment.md, APIRouteInventory.md, DatabaseSchemaInventory.md, ServiceDependencyInventory.md, ValidatorVerificationReport.md).

Fields: Engineering Question | Knowledge Domain | Required Tables | Required API | Required Service | Current Status | Supported / Partial / Not Supported | Repository Evidence | Blocking Component | Confidence

---

- Engineering Question: Show BM457 (project lookup)
  - Knowledge Domain: Projects
  - Required Tables: `project_master`
  - Required API: `GET /api/v1/projects/{project_number}`
  - Required Service: `ProjectService` (lookup) — present in TypeScript stack
  - Current Status: Supported
  - Supported / Partial / Not Supported: Supported
  - Repository Evidence: APIRouteInventory.md (api/main.py line 103), DatabaseSchemaInventory.md (`project_master`), ServiceDependencyInventory.md (project-service.ts line 11), ValidatorVerificationReport.md (queries)
  - Blocking Component: NONE
  - Confidence: VERIFIED

- Engineering Question: Show project history
  - Knowledge Domain: Projects (history)
  - Required Tables: revision_history or timestamped audit tables
  - Required API: NOT FOUND
  - Required Service: NOT FOUND
  - Current Status: Not Supported
  - Supported / Partial / Not Supported: Not Supported
  - Repository Evidence: DatabaseSchemaInventory.md (revision_history exists but API endpoints absent — models/entities.py lines 33-34), APIRouteInventory.md (no history endpoints)
  - Blocking Component: Missing API endpoint and service
  - Confidence: VERIFIED (Not Supported)

- Engineering Question: Show customer history / list projects for a customer
  - Knowledge Domain: Customers, Project-Customer Link
  - Required Tables: `project_customer_link`, `customer_master`
  - Required API: NOT FOUND (`/api/projects?customer=` or similar)
  - Required Service: NOT FOUND
  - Current Status: Not Supported
  - Supported / Partial / Not Supported: Not Supported
  - Repository Evidence: DatabaseSchemaInventory.md (`project_customer_link` exists), APIRouteInventory.md (no customer→projects endpoint), ServiceDependencyInventory.md (no service exposing this)
  - Blocking Component: Missing API/service
  - Confidence: VERIFIED

- Engineering Question: Show process planning for a project
  - Knowledge Domain: Process Planning
  - Required Tables: `process_planning`
  - Required API: `GET /api/v1/projects/{project_number}/process-planning`
  - Required Service: NOT FOUND (endpoint implemented in Python directly)
  - Current Status: Supported
  - Supported / Partial / Not Supported: Supported
  - Repository Evidence: APIRouteInventory.md (api/main.py line 148), DatabaseSchemaInventory.md (`process_planning`), ValidatorVerificationReport.md
  - Blocking Component: NONE
  - Confidence: VERIFIED

- Engineering Question: Show BOM for a project
  - Knowledge Domain: Part Lists
  - Required Tables: `part_list`
  - Required API: `GET /api/v1/projects/{project_number}/part-list`
  - Required Service: NOT FOUND
  - Current Status: Supported
  - Supported / Partial / Not Supported: Supported
  - Repository Evidence: APIRouteInventory.md (api/main.py line 176), DatabaseSchemaInventory.md (`part_list`)
  - Blocking Component: NONE
  - Confidence: VERIFIED

- Engineering Question: Show technical specifications
  - Knowledge Domain: Technical Specifications
  - Required Tables: `technical_specification`
  - Required API: NOT FOUND
  - Required Service: NOT FOUND
  - Current Status: Not Supported
  - Supported / Partial / Not Supported: Not Supported
  - Repository Evidence: DatabaseSchemaInventory.md (technical_specification exists), APIRouteInventory.md (no endpoint), ValidatorVerificationReport.md (query uses table)
  - Blocking Component: Missing API/service
  - Confidence: VERIFIED

- Engineering Question: Show engineering notes
  - Knowledge Domain: Engineering Notes
  - Required Tables: `engineering_notes`
  - Required API: NOT FOUND
  - Required Service: NOT FOUND
  - Current Status: Not Supported
  - Supported / Partial / Not Supported: Not Supported
  - Repository Evidence: DatabaseSchemaInventory.md (table exists), APIRouteInventory.md (no endpoint)
  - Blocking Component: Missing API/service
  - Confidence: VERIFIED

- Engineering Question: Cross-project searches (materials, machines, neck types)
  - Knowledge Domain: Materials, Machines, Neck Types, Project relationships
  - Required Tables: `material_master`, `machine_master`, `neck_type_master`, `project_master`, `project_product_link`
  - Required API: NOT FOUND (no cross-attribute filtering endpoints)
  - Required Service: NOT FOUND
  - Current Status: Partial
  - Supported / Partial / Not Supported: Partial (base endpoints exist for listing masters; no filtered project search)
  - Repository Evidence: APIRouteInventory.md (`GET /api/v1/materials`, `GET /api/v1/machines`), DatabaseSchemaInventory.md (tables exist), AIReadinessAssessment.md (marked partial)
  - Blocking Component: Missing cross-project filter endpoints or services
  - Confidence: VERIFIED

- Engineering Question: Document revision history
  - Knowledge Domain: Documents / RevisionHistory
  - Required Tables: `revision_history` or document-versioning tables
  - Required API: NOT FOUND
  - Required Service: NOT FOUND
  - Current Status: Not Supported
  - Supported / Partial / Not Supported: Not Supported
  - Repository Evidence: models/entities.py defines `RevisionHistory` (lines 33-34) but APIRouteInventory.md contains no document revision endpoints; DatabaseSchemaInventory.md documents `document_index` only
  - Blocking Component: Missing API/service and explicit revision exposure
  - Confidence: VERIFIED

- Engineering Question: Any other AI questions documented in AIReadinessAssessment.md — use that doc as evidence for per-question status.

---

Summary counts (derived from AIReadinessAssessment.md): per that file, Supported: 5, Partial: 6, Not Supported: 9 (see AIReadinessAssessment.md for listing and evidence). All entries above map to those counts and are backed by repository documentation.
