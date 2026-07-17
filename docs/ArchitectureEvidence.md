# Architecture Evidence

This document records the verified repository evidence used to build the architecture inventory documents.

## Python API and Database Evidence

- `D:\MitraEngineeringLibrary\api\main.py`
  - Defines a FastAPI app instance.  (line 1)
  - Registers `GET` endpoints for health, projects, search, documents, dashboard, products, machines, materials, cycle-times, components, import-logs, and sync.  (lines 46, 63, 103, 121, 148, 176, 214, 241, 411, 437, 457, 504, 542, 574, 600, 644, 690, 720, 748)
- `D:\MitraEngineeringLibrary\models\database.py`
  - Creates SQLAlchemy engine and session factory.  (line 6)
  - Enables SQLite-specific connection arguments.  (line 9)
  - Applies SQLite PRAGMA settings for foreign keys, WAL journaling, and synchronous mode.  (lines 17-19)
- `D:\MitraEngineeringLibrary\config\settings.py`
  - Configures default SQLite `DATABASE_URL` pointing to `D:/MitraEngineeringLibrary/database/mekb.sqlite`.  (line 12)
- `D:\MitraEngineeringLibrary\models\entities.py`
  - Defines SQLAlchemy ORM classes and database table names for the MEKB schema.  (lines 11-353)
  - Includes data provenance tables `data_sources` and `provenance`.  (lines 11-24)
  - Includes both project-related tables and import tracking tables such as `import_log`.  (lines 47-353)

## TypeScript API and Database Evidence

- `D:\MitraEngineeringLibrary\src\index.ts`
  - Imports `express`, `body-parser`, `typeorm`, and application router creation.  (lines 1-6)
  - Initializes `DataSource` using `AppDataSourceOptions`.  (line 11)
  - Mounts `/api` router and starts the Express server on port `4000` by default.  (lines 11-18)
- `D:\MitraEngineeringLibrary\src\controllers\api.controller.ts`
  - Defines Express router with five GET routes: `/status`, `/projects`, `/customers`, `/machines`, `/materials`.  (lines 4-27)
- `D:\MitraEngineeringLibrary\src\database\data-source.ts`
  - Defines TypeORM `AppDataSourceOptions` for PostgreSQL.  (lines 17-18)
  - Registers entity classes used by the TypeScript backend.  (lines 1-18)

## Verified Service Evidence

- `D:\MitraEngineeringLibrary\src\services\project-service.ts`
  - Defines `ProjectService` and methods for project/customer/product/machine/material/neck-type creation and retrieval.  (lines 11-74)
- `D:\MitraEngineeringLibrary\src\services\importer.service.ts`
  - Defines `ImporterService` with methods `importWorkbook` and `importEngineeringTextFile`.  (lines 7-33)
- `D:\MitraEngineeringLibrary\src\services\folder-scanner.service.ts`
  - Defines `FolderScannerService` with method `scanFolder` and known folder prefixes.  (lines 4-7)

## Verified Evidence Scope

- All facts in the architecture inventory documents are drawn directly from repository source files.
- No external systems, runtime behavior, or unverified files were used to create these documents.
- The evidence is limited to the reviewed files in `D:\MitraEngineeringLibrary` and the documented routes, database models, and service classes found there.
