# Knowledge Gap Inventory (Verified Gaps Only)

This inventory lists only repository-backed gaps (where the repository documents a missing implementation or absence of evidence). Each gap below is supported by evidence from ImporterInventory.md, EngineeringImportPipelineDiscovery.md, DatabaseSchemaInventory.md, APIRouteInventory.md, and ValidatorVerificationReport.md.

Format per gap:
- Gap ID
- Knowledge Area
- Missing Repository Object
- Object Type
- Referenced By (doc/file)
- Repository Search Result / Evidence
- Impact
- Confidence
- Verified / NOT FOUND / NOT VERIFIABLE

---

- Gap ID: G001
  - Knowledge Area: Engineering Importers for project-scoped workbooks
  - Missing Repository Object: Excel-to-`mekb.sqlite` importer implementations for engineering workbooks (cycle times, process planning, part lists, component details, document index)
  - Object Type: Importer scripts / functions
  - Referenced By: ImporterInventory.md; EngineeringImportPipelineDiscovery.md
  - Repository Search Result / Evidence: Workbooks present under `temp data/` (ImporterInventory.md) but ImporterInventory.md and EngineeringImportPipelineDiscovery.md report NO IMPLEMENTATION FOUND for these importers
  - Impact: Unable to trace source→mekb.sqlite ingestion for engineering domains
  - Confidence: VERIFIED
  - Status: NOT FOUND

- Gap ID: G002
  - Knowledge Area: API endpoints exposing relationship data
  - Missing Repository Object: API endpoints to query `project_customer_link`, `project_product_link`, and `project_relationships`
  - Object Type: API controller endpoints / router handlers
  - Referenced By: AIReadinessAssessment.md; APIRouteInventory.md
  - Repository Search Result / Evidence: Database schema contains `project_customer_link`, `project_product_link`, `project_relationships` (DatabaseSchemaInventory.md / models/entities.py) but APIRouteInventory.md documents no endpoints exposing these relationships
  - Impact: Cross-project queries and customer-based project lineage not supported
  - Confidence: VERIFIED
  - Status: NOT FOUND

- Gap ID: G003
  - Knowledge Area: Technical Specifications exposure
  - Missing Repository Object: API endpoint exposing `technical_specification`
  - Object Type: API endpoint
  - Referenced By: AIReadinessAssessment.md; ValidatorVerificationReport.md
  - Repository Search Result / Evidence: `technical_specification` table exists (DatabaseSchemaInventory.md; models/entities.py lines 103-104) but APIRouteInventory.md contains no endpoint for specifications
  - Impact: AI cannot retrieve technical spec details via API
  - Confidence: VERIFIED
  - Status: NOT FOUND

- Gap ID: G004
  - Knowledge Area: Engineering notes exposure
  - Missing Repository Object: API endpoint for `engineering_notes`
  - Object Type: API endpoint
  - Referenced By: AIReadinessAssessment.md; ValidatorVerificationReport.md
  - Repository Search Result / Evidence: `engineering_notes` table present (DatabaseSchemaInventory.md; models/entities.py) but no API endpoint documented in APIRouteInventory.md
  - Impact: Notes and lessons-learned not accessible via API
  - Confidence: VERIFIED
  - Status: NOT FOUND

- Gap ID: G005
  - Knowledge Area: Data lineage / origin of `mekb.sqlite`
  - Missing Repository Object: Initialization / schema creation scripts for mekb.sqlite (CREATE TABLE / DDL / migrations)
  - Object Type: Database initialization scripts or documentation
  - Referenced By: EngineeringDatabaseOrigin.md; EngineeringImportPipelineDiscovery.md
  - Repository Search Result / Evidence: EngineeringDatabaseOrigin.md documents that `mekb.sqlite` origin is NOT VERIFIABLE; no CREATE TABLE statements or schema creation code found in repository
  - Impact: Cannot reproduce or fully trace initial data population
  - Confidence: VERIFIED
  - Status: NOT FOUND

- Gap ID: G006
  - Knowledge Area: Global search and cross-attribute filtering
  - Missing Repository Object: API endpoint implementing global search across projects/products/customers/attributes (dedicated search implementation)
  - Object Type: API endpoint / search service
  - Referenced By: AIReadinessAssessment.md; APIRouteInventory.md
  - Repository Search Result / Evidence: APIRouteInventory.md lists `GET /api/v1/search` in Python endpoints but AIReadinessAssessment.md and APIRouteInventory.md mark global search as NOT FOUND or limited; implementation not providing cross-attribute filters is documented
  - Impact: Limits AI cross-project discovery
  - Confidence: VERIFIED (functionality gap documented)
  - Status: PARTIAL / NOT FOUND for full capability

---

End of Knowledge Gap Inventory (all gaps above are repository-verified and include evidence citations).