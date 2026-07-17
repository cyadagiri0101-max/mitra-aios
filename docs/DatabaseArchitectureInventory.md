# Database Architecture Inventory

## Verified Python Backend Database Architecture

Source files:
- `D:\MitraEngineeringLibrary\models\database.py`
- `D:\MitraEngineeringLibrary\config\settings.py`
- `D:\MitraEngineeringLibrary\models\entities.py`

### Database Engine and Connection

- `settings.DATABASE_URL` is configured as `sqlite:///D:/MitraEngineeringLibrary/database/mekb.sqlite`.  (line 12 in `config/settings.py`)
- SQLAlchemy engine is created with `create_engine(settings.DATABASE_URL, ...)`.  (line 6 in `models/database.py`)
- SQLite-specific connection arguments are enabled when `sqlite` is present in `DATABASE_URL`.  (line 9 in `models/database.py`)
- SQLite PRAGMA settings are applied on connect:
  - `PRAGMA foreign_keys=ON`  (line 17 in `models/database.py`)
  - `PRAGMA journal_mode=WAL`  (line 18 in `models/database.py`)
  - `PRAGMA synchronous=NORMAL`  (line 19 in `models/database.py`)
- SQLAlchemy uses `sessionmaker` and `declarative_base()` to define ORM models.  (lines 12-18 in `models/database.py`)

### Python ORM Table Inventory

The following SQLAlchemy ORM classes and table names are defined in `models/entities.py`:

- `DataSource` — `data_sources`  (lines 11-12)
- `Provenance` — `provenance`  (lines 23-24)
- `RevisionHistory` — `revision_history`  (lines 33-34)
- `ProjectMaster` — `project_master`  (lines 47-48)
- `ProductMaster` — `product_master`  (lines 66-67)
- `BottleFamily` — `bottle_family`  (lines 90-91)
- `TechnicalSpecification` — `technical_specification`  (lines 103-104)
- `CustomerMaster` — `customer_master`  (lines 117-118)
- `MachineMaster` — `machine_master`  (lines 129-130)
- `MaterialMaster` — `material_master`  (lines 143-144)
- `NeckTypeMaster` — `neck_type_master`  (lines 156-157)
- `FolderTemplateMaster` — `folder_template_master`  (lines 169-170)
- `DocumentTypeMaster` — `document_type_master`  (lines 181-182)
- `AISearchTag` — `ai_search_tags`  (lines 192-193)
- `ProjectProductLink` — `project_product_link`  (lines 205-206)
- `ProjectCustomerLink` — `project_customer_link`  (lines 214-215)
- `ProjectRelationship` — `project_relationships`  (lines 223-224)
- `CycleTimeHistory` — `cycle_time_history`  (lines 232-233)
- `ProcessPlanning` — `process_planning`  (lines 251-252)
- `PartList` — `part_list`  (lines 273-274)
- `ComponentDetail` — `component_detail`  (lines 301-302)
- `EngineeringNote` — `engineering_notes`  (lines 322-323)
- `DocumentIndex` — `document_index`  (lines 336-337)
- `ImportLog` — `import_log`  (lines 352-353)

### Python Model Characteristics

- The Python ORM schema includes provenance and revision history tables, indicating data origin and change tracking.
- Many model classes include `created_at`, `updated_at`, `revision`, `source_file`, `source_sheet`, `source_row`, and `import_date` fields.
- The schema uses SQLAlchemy `relationship()` definitions for associations such as `ProjectMaster.products`, `ProjectMaster.cycle_times`, `ProjectMaster.process_plannings`, and `ProjectMaster.part_lists`.

## Verified TypeScript Backend Database Architecture

Source files:
- `D:\MitraEngineeringLibrary\src\database\data-source.ts`
- `D:\MitraEngineeringLibrary\src\index.ts`

### TypeORM Data Source Configuration

- `AppDataSourceOptions` defines a PostgreSQL connection.  (line 17 in `src/database/data-source.ts`)
- Connection parameters use environment variables with defaults:
  - `DB_HOST` default `localhost`
  - `DB_PORT` default `5432`
  - `DB_USER` default `postgres`
  - `DB_PASSWORD` default `postgres`
  - `DB_NAME` default `mitra_engineering_library`
- `synchronize: true` is enabled in TypeORM configuration.  (line 17 in `src/database/data-source.ts`)
- Registered entities in TypeORM are:
  - `CustomerMaster`
  - `MachineMaster`
  - `MaterialMaster`
  - `NeckTypeMaster`
  - `BottleFamily`
  - `ProjectMaster`
  - `ProductMaster`
  - `TechnicalSpecification`
  - `FolderTemplateMaster`
  - `PartList`
  - `ProcessPlanning`
  - `CycleTimeHistory`
  - `EngineeringDocument`
  - `AITag`

### TypeScript Application Bootstrapping

- `src/index.ts` creates and initializes `dataSource` from `AppDataSourceOptions`.  (line 11 in `src/index.ts`)
- After initialization, the Express app mounts `createApiRouter(dataSource)` at `/api`.  (line 11 in `src/index.ts`)

## Verified Cross-Stack Notes

- The repository contains two distinct back-end stacks with verified database evidence:
  - Python/SQLAlchemy/SQLite (`api/main.py`, `models/database.py`, `models/entities.py`, `config/settings.py`)
  - TypeScript/TypeORM/PostgreSQL (`src/index.ts`, `src/database/data-source.ts`)
- All inventory content in this document is based solely on the verified repository files listed above.
