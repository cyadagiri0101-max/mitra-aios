# API Route Inventory

## Verified Routes from Repository Source

### Python FastAPI Endpoints

Source: `D:\MitraEngineeringLibrary\api\main.py`

- `GET /health` — Health check endpoint.  (line 46)
- `GET /api/v1/projects` — List projects with optional `prefix`, `search`, `skip`, `limit`.  (line 63)
- `GET /api/v1/projects/{project_number}` — Get project details by project number.  (line 103)
- `GET /api/v1/projects/{project_number}/cycle-times` — Get cycle times for a project.  (line 121)
- `GET /api/v1/projects/{project_number}/process-planning` — Get process planning rows for a project.  (line 148)
- `GET /api/v1/projects/{project_number}/part-list` — Get part list rows for a project.  (line 176)
- `GET /api/v1/projects/{project_number}/documents` — Get documents associated with a project.  (line 214)
- `GET /api/v1/search` — Global search across projects, products, bottles, customers, machines, materials, neck types, cycle times, and documents. Query parameter `q` is required.  (line 241)
- `GET /api/v1/documents` — List document index records with pagination `skip`, `limit`.  (line 411)
- `GET /api/v1/documents/{document_id}` — Get document index record by ID.  (line 437)
- `GET /api/v1/dashboard/widgets` — Dashboard summary endpoint with project/product/document counts, recent import status, and database health.  (line 457)
- `GET /api/v1/products` — List products with optional `search`, `skip`, `limit`.  (line 504)
- `GET /api/v1/machines` — List machines with optional `type`, `skip`, `limit`.  (line 542)
- `GET /api/v1/materials` — List materials with `skip`, `limit`.  (line 574)
- `GET /api/v1/cycle-times` — List cycle times with optional filters `project_number`, `machine_code`, `skip`, `limit`.  (line 600)
- `GET /api/v1/components` — List component details with optional `tool_no`, `material`, `shape`, `skip`, `limit`.  (line 644)
- `GET /api/v1/import-logs` — List import logs with `skip`, `limit`.  (line 690)
- `GET /api/v1/sync/projects` — Sync endpoint returning changed projects since optional `since` timestamp.  (line 720)
- `GET /api/v1/sync/all` — Sync summary returning counts for listed tables.  (line 748)

### TypeScript Express Endpoints

Source: `D:\MitraEngineeringLibrary\src\controllers\api.controller.ts`

- `GET /api/status` — Returns TypeORM initialization status.  (line 7)
- `GET /api/projects` — Returns all projects from `project_master` repository with relations `customer`, `product`, `technicalSpecification`.  (line 12)
- `GET /api/customers` — Returns all customers from `customer_master`.  (line 17)
- `GET /api/machines` — Returns all machines from `machine_master`.  (line 22)
- `GET /api/materials` — Returns all materials from `material_master`.  (line 27)

### Verified Route Implementation Notes

- The Python FastAPI app uses `app = FastAPI(...)` and dependency injection via `Depends(get_db_session)`.
- The TypeScript Express app initializes `DataSource` from `src/database/data-source.ts` and mounts the router at `/api`.  (source: `src/index.ts`, line 11)
- All verified routes in the inspected files are `GET` endpoints.
