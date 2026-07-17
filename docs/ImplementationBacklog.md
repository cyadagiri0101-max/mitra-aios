# Implementation Backlog (Verified Missing Components Only)

Source evidence: docs/ImporterInventory.md, docs/EngineeringImportPipelineDiscovery.md, docs/DatabaseSchemaInventory.md, docs/APIRouteInventory.md, docs/AIReadinessAssessment.md, docs/KnowledgeGapInventory.md

Format: Backlog ID | Capability | Blocking Component | Repository Object | Repository File | Current Status | Impact | Priority | Repository Evidence | Confidence

- Backlog ID: B001
  - Capability: Excel→`mekb.sqlite` importers for engineering workbooks (cycle times, process planning, part lists, component details, document index)
  - Blocking Component: Importer scripts/functions missing
  - Repository Object: NOT FOUND
  - Repository File: ImporterInventory.md; EngineeringImportPipelineDiscovery.md
  - Current Status: NOT FOUND
  - Impact: Ingest/source traceability for engineering domains is incomplete
  - Priority: Critical
  - Repository Evidence: ImporterInventory.md listings; EngineeringImportPipelineDiscovery.md statements
  - Confidence: VERIFIED

- Backlog ID: B002
  - Capability: API endpoints for project relationships and customer-project queries
  - Blocking Component: Controller endpoints missing for `project_customer_link`, `project_product_link`, `project_relationships`
  - Repository Object: NOT FOUND
  - Repository File: APIRouteInventory.md; DatabaseSchemaInventory.md
  - Current Status: NOT FOUND
  - Impact: Cross-project queries and customer-history queries unavailable
  - Priority: High
  - Repository Evidence: DatabaseSchemaInventory.md (tables exist); APIRouteInventory.md (no endpoints)
  - Confidence: VERIFIED

- Backlog ID: B003
  - Capability: API endpoint exposing `technical_specification`
  - Blocking Component: API controller endpoint missing
  - Repository Object: NOT FOUND
  - Repository File: DatabaseSchemaInventory.md; APIRouteInventory.md
  - Current Status: NOT FOUND
  - Impact: Technical specification retrieval via API unavailable
  - Priority: High
  - Repository Evidence: DatabaseSchemaInventory.md; APIRouteInventory.md
  - Confidence: VERIFIED

- Backlog ID: B004
  - Capability: API endpoint exposing `engineering_notes`
  - Blocking Component: API controller endpoint missing
  - Repository Object: NOT FOUND
  - Repository File: DatabaseSchemaInventory.md; APIRouteInventory.md
  - Current Status: NOT FOUND
  - Impact: Engineering notes / lessons-learned not retrievable via API
  - Priority: High
  - Repository Evidence: DatabaseSchemaInventory.md; APIRouteInventory.md
  - Confidence: VERIFIED

- Backlog ID: B005
  - Capability: Document revision history exposure
  - Blocking Component: API/controller and revision-exposure missing
  - Repository Object: NOT VERIFIABLE (revision table exists but no API)
  - Repository File: DatabaseSchemaInventory.md; APIRouteInventory.md
  - Current Status: NOT VERIFIABLE / Unavailable
  - Impact: Cannot present document version timelines
  - Priority: Medium
  - Repository Evidence: models/entities.py `RevisionHistory`; APIRouteInventory.md
  - Confidence: VERIFIED

- Backlog ID: B006
  - Capability: Global cross-attribute search (material/machine/neck/project filters)
  - Blocking Component: Search endpoint/service with cross-attribute filters missing or partial
  - Repository Object: PARTIAL (Python `GET /api/v1/search` exists but limited; APIRouteInventory.md notes search present but AIReadinessAssessment.md marks global search limited)
  - Repository File: APIRouteInventory.md; AIReadinessAssessment.md
  - Current Status: Partial
  - Impact: Limits cross-project AI queries and discovery
  - Priority: Medium
  - Repository Evidence: APIRouteInventory.md; AIReadinessAssessment.md
  - Confidence: VERIFIED

- Backlog ID: B007
  - Capability: Provenance chain for PMM→mekb mappings
  - Blocking Component: Missing mappings and DDL cross-checks (NOT VERIFIABLE)
  - Repository Object: NOT VERIFIABLE
  - Repository File: ImporterInventory.md; EngineeringImportPipelineDiscovery.md
  - Current Status: NOT VERIFIABLE
  - Impact: Cannot confirm mapping between PMM worksheets and mekb.sqlite
  - Priority: Low
  - Repository Evidence: ImporterInventory.md cross-check table (NOT VERIFIABLE)
  - Confidence: VERIFIED

End of Implementation Backlog
