# Management Demo Matrix

Source evidence: docs/APIRouteInventory.md, docs/DatabaseSchemaInventory.md, docs/AIReadinessAssessment.md, docs/ServiceDependencyInventory.md

Format: Demo Scenario | Knowledge Domain | Database Used | API Used | Service Used | Current Status | Repository Evidence | Confidence

- Demo Scenario: Open Project
  - Knowledge Domain: Projects
  - Database Used: `project_master` (DatabaseSchemaInventory.md)
  - API Used: `GET /api/v1/projects/{project_number}` (APIRouteInventory.md)
  - Service Used: `ProjectService` (src/services/project-service.ts) — lookup methods used in TypeScript stack (ServiceDependencyInventory.md)
  - Current Status: Ready
  - Repository Evidence: APIRouteInventory.md; DatabaseSchemaInventory.md; ServiceDependencyInventory.md
  - Confidence: VERIFIED

- Demo Scenario: Show BOM
  - Knowledge Domain: Part Lists
  - Database Used: `part_list` (DatabaseSchemaInventory.md)
  - API Used: `GET /api/v1/projects/{project_number}/part-list` (APIRouteInventory.md)
  - Service Used: NOT FOUND
  - Current Status: Ready
  - Repository Evidence: APIRouteInventory.md; DatabaseSchemaInventory.md
  - Confidence: VERIFIED

- Demo Scenario: Show Process Planning
  - Knowledge Domain: Process Planning
  - Database Used: `process_planning` (DatabaseSchemaInventory.md)
  - API Used: `GET /api/v1/projects/{project_number}/process-planning` (APIRouteInventory.md)
  - Service Used: NOT FOUND
  - Current Status: Ready
  - Repository Evidence: APIRouteInventory.md; DatabaseSchemaInventory.md
  - Confidence: VERIFIED

- Demo Scenario: Show Documents
  - Knowledge Domain: Document Index
  - Database Used: `document_index` (DatabaseSchemaInventory.md)
  - API Used: `GET /api/v1/projects/{project_number}/documents` (APIRouteInventory.md)
  - Service Used: NOT FOUND
  - Current Status: Ready
  - Repository Evidence: APIRouteInventory.md; DatabaseSchemaInventory.md
  - Confidence: VERIFIED

- Demo Scenario: Show Cycle Times
  - Knowledge Domain: Cycle Time History
  - Database Used: `cycle_time_history` (DatabaseSchemaInventory.md)
  - API Used: `GET /api/v1/projects/{project_number}/cycle-times`, `GET /api/v1/cycle-times` (APIRouteInventory.md)
  - Service Used: NOT FOUND
  - Current Status: Ready
  - Repository Evidence: APIRouteInventory.md; DatabaseSchemaInventory.md
  - Confidence: VERIFIED

- Demo Scenario: Compare Projects
  - Knowledge Domain: Project comparison across resources
  - Database Used: `project_master`, related tables
  - API Used: Multiple project-scoped endpoints (APIRouteInventory.md)
  - Service Used: NOT FOUND
  - Current Status: Partial (no dedicated comparison endpoint)  
  - Repository Evidence: APIRouteInventory.md; AIReadinessAssessment.md
  - Confidence: VERIFIED

- Demo Scenario: Find Similar Projects
  - Knowledge Domain: Similarity by material/machine/cavitation
  - Database Used: `product_master`, `cycle_time_history`, `machine_master` (DatabaseSchemaInventory.md)
  - API Used: `GET /api/v1/products`, `GET /api/v1/cycle-times`, `GET /api/v1/machines` (APIRouteInventory.md)
  - Service Used: NOT FOUND
  - Current Status: Partial (no dedicated similarity/search endpoint)
  - Repository Evidence: APIRouteInventory.md; AIReadinessAssessment.md
  - Confidence: VERIFIED

- Demo Scenario: Engineering Search
  - Knowledge Domain: Cross-project search
  - Database Used: multiple tables
  - API Used: `GET /api/v1/search` (APIRouteInventory.md) — documented but limited
  - Service Used: NOT FOUND
  - Current Status: Partial
  - Repository Evidence: APIRouteInventory.md; AIReadinessAssessment.md
  - Confidence: VERIFIED

- Demo Scenario: Customer History
  - Knowledge Domain: Customer→Projects
  - Database Used: `customer_master`, `project_customer_link` (DatabaseSchemaInventory.md)
  - API Used: NOT FOUND
  - Service Used: NOT FOUND
  - Current Status: Unavailable
  - Repository Evidence: DatabaseSchemaInventory.md; APIRouteInventory.md
  - Confidence: VERIFIED

- Demo Scenario: Material Search
  - Knowledge Domain: Materials
  - Database Used: `material_master` (DatabaseSchemaInventory.md)
  - API Used: `GET /api/v1/materials` (APIRouteInventory.md)
  - Service Used: NOT FOUND
  - Current Status: Partial (list exists; no direct project filter)
  - Repository Evidence: APIRouteInventory.md; AIReadinessAssessment.md
  - Confidence: VERIFIED

End of Management Demo Matrix
