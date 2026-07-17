# Engineering Database Origin

## 1. Repository Search Summary

Repository-wide searches performed for:
- CREATE TABLE, CREATE INDEX, ALTER TABLE, PRAGMA, executescript
- schema.sql, *.sql files
- SQLAlchemy metadata.create_all(), Base.metadata.create_all()
- Alembic migrations, database initialization code
- Bootstrap, initialize, populate, load, restore, backup, snapshot keywords
- Actual database files (*.db, *.sqlite)

## 2. Database Creation Files

### Verified database creation points

| File | Evidence | Result |
| --- | --- | --- |
| [pmm_data_library/setup_db.py](pmm_data_library/setup_db.py) | `sqlite3.connect(db_path)` and `db_path = args.db or os.path.join(script_dir, "pmm_database.db")` | Creates `pmm_database.db` via `df.to_sql()` |
| mitra-backend migrations (8 files) | TypeORM migration files in `src/database/migrations/` | Create PostgreSQL tables for MITRA application, not mekb.sqlite |

### Files checked, no CREATE TABLE found

| Category | Result |
| --- | --- |
| Python files in repository | No `sqlite3.executescript()` or SQL DDL statements found |
| SQL schema files | No `*.sql` files found in repository |
| Alembic migrations | No Alembic directory found |
| Shell scripts | No database creation scripts found |

## 3. Schema Creation Files

### Engineering database (mekb.sqlite)

| Table | Creator | Evidence |
| --- | --- | --- |
| project_master | NO IMPLEMENTATION FOUND | No CREATE TABLE statement found in repository |
| product_master | NO IMPLEMENTATION FOUND | No CREATE TABLE statement found in repository |
| customer_master | NO IMPLEMENTATION FOUND | No CREATE TABLE statement found in repository |
| machine_master | NO IMPLEMENTATION FOUND | No CREATE TABLE statement found in repository |
| material_master | NO IMPLEMENTATION FOUND | No CREATE TABLE statement found in repository |
| cycle_time_history | NO IMPLEMENTATION FOUND | No CREATE TABLE statement found in repository |
| technical_specification | NO IMPLEMENTATION FOUND | No CREATE TABLE statement found in repository |
| process_planning | NO IMPLEMENTATION FOUND | No CREATE TABLE statement found in repository |
| part_list | NO IMPLEMENTATION FOUND | No CREATE TABLE statement found in repository |
| component_detail | NO IMPLEMENTATION FOUND | No CREATE TABLE statement found in repository |
| document_index | NO IMPLEMENTATION FOUND | No CREATE TABLE statement found in repository |
| project_customer_link | NO IMPLEMENTATION FOUND | No CREATE TABLE statement found in repository |
| bottle_family | NO IMPLEMENTATION FOUND | Created by improve_ekl_data.py via INSERT, not by repository initialization |
| neck_type_master | NO IMPLEMENTATION FOUND | Created by improve_ekl_data.py via INSERT, not by repository initialization |
| ai_search_tags | NO IMPLEMENTATION FOUND | Created by improve_ekl_data.py via INSERT, not by repository initialization |

### MITRA application (PostgreSQL)

| Migration File | Tables Created | Database Target |
| --- | --- | --- |
| 1700000000000-InitialSchema.ts | audit_logs, session_stores, workflow_states, etc. | PostgreSQL |
| 1700000000001-RefreshTokenAndVectorSearch.ts | Additional PostgreSQL tables | PostgreSQL |
| 1700000000002-FullDomainSchema.ts | machine_masters, materials, etc. | PostgreSQL |
| 1700000000003-DispatchPlans.ts | Additional PostgreSQL tables | PostgreSQL |

**Note:** All MITRA migrations target PostgreSQL, not SQLite.

## 4. Data Population Files

### Engineering database population

| File | Type | Result |
| --- | --- | --- |
| [improve_ekl_data.py](improve_ekl_data.py) | INSERT operations | Modifies existing tables only; does not create them |
| [pmm_data_library/setup_db.py](pmm_data_library/setup_db.py) | Excel-to-SQLite importer | Targets `pmm_database.db`, not `mekb.sqlite` |
| Deployment documentation | DEPLOYMENT.md, README.md | Only documents PostgreSQL migration and seeding; no mention of engineering database |

## 5. Verified Evidence

### mekb.sqlite is pre-existing and external

| Evidence | Source |
| --- | --- |
| **Database file location** | `D:\MitraEngineeringLibrary\database\mekb.sqlite` (outside Mitra3.0 repository) |
| **File presence in repository** | NOT FOUND (repository search returned only pmm_database.db and VS index files) |
| **Referenced as pre-existing** | [docs/DatabaseSchemaInventory.md](docs/DatabaseSchemaInventory.md) documents the schema without creating it |
| **No creation code** | Repository search found zero CREATE TABLE statements in Python, SQL, or TypeScript |
| **No initialization in deployment** | [DEPLOYMENT.md](DEPLOYMENT.md) documents only PostgreSQL setup; no engineering database initialization |
| **No .gitignore exclusion** | The `.gitignore` does not exclude *.sqlite or *.db files, yet mekb.sqlite is not committed |
| **Treated as authoritative** | Validation scripts read from it; improve_ekl_data.py modifies it, but no initialization code exists |

### Repository contains only database consumers and modifiers

| File | Role | Evidence |
| --- | --- | --- |
| [acceptance_evidence.py](acceptance_evidence.py) | Reader | `sqlite3.connect(DB)` with no table creation |
| [explore_data.py](explore_data.py) | Reader | Opens database for inspection only |
| [generate_docs.py](generate_docs.py) | Reader | Generates documentation from existing schema |
| [improve_ekl_data.py](improve_ekl_data.py) | Modifier | `INSERT INTO` and `UPDATE` statements; no table creation |
| Schema inventory scripts | Readers | Read and document existing schema; no creation |

## 6. Verified Pipeline

### What IS verifiable

1. **External database location:** `D:\MitraEngineeringLibrary\database\mekb.sqlite` exists outside the repository.
2. **Schema documentation:** [docs/DatabaseSchemaInventory.md](docs/DatabaseSchemaInventory.md) documents 24 tables with 659,456 bytes of populated data.
3. **Repository access pattern:** All repository scripts read from or modify the database; none create it.
4. **MITRA application database:** PostgreSQL is created via migrations at deployment time.
5. **PMM database:** `pmm_database.db` is created by [pmm_data_library/setup_db.py](pmm_data_library/setup_db.py) from Excel.

### What is NOT verifiable

1. **Engineering database creation:** No CREATE TABLE statements found in repository.
2. **Engineering database initialization:** No setup, bootstrap, or initialization code found for mekb.sqlite.
3. **Database origin:** No documentation of how or when mekb.sqlite was first created.
4. **Data source mappings:** No importer mappings to engineering workbooks found.
5. **Upstream ETL:** No scripts or documentation of how mekb.sqlite was originally populated.

## 7. Deployment Documentation Review

### DEPLOYMENT.md coverage

| Item | Documented | Database Covered |
| --- | --- | --- |
| PostgreSQL setup | ✅ Yes | PostgreSQL only |
| Migration execution | ✅ Yes | PostgreSQL only |
| Database seeding | ✅ Yes | PostgreSQL only |
| Engineering database setup | ❌ No | NOT covered |
| mekb.sqlite initialization | ❌ No | NOT covered |
| EKL database setup | ❌ No | NOT covered |

### README.md coverage

| Item | Documented | Database Covered |
| --- | --- | --- |
| Quick start deployment | ✅ Yes | PostgreSQL only |
| Architecture diagram | ✅ Yes | PostgreSQL, Redis, MinIO, Ollama |
| Tech stack | ✅ Yes | PostgreSQL, Redis, MinIO, Ollama |
| Engineering database | ❌ No | NOT mentioned |

## 8. File System Evidence

### Database files in repository

| File | Status | Creator |
| --- | --- | --- |
| pmm_data_library/pmm_database.db | Present | [pmm_data_library/setup_db.py](pmm_data_library/setup_db.py) |
| mekb.sqlite | NOT present | NOT created by repository |

### Database files NOT in repository (external)

| File | Location | Status |
| --- | --- | --- |
| mekb.sqlite | D:\MitraEngineeringLibrary\database\ | Pre-existing external |

## 9. Final Conclusion

Choice: **C. Engineering database origin NOT VERIFIABLE.**

Reason: The engineering database (`mekb.sqlite`) is located outside the Mitra3.0 repository at `D:\MitraEngineeringLibrary\database\mekb.sqlite` and is not created by any code or process documented in the repository. The repository contains only database consumers and modifiers (validation scripts, documentation generators, and data-quality improvers), but no code that creates the engineering database tables. The deployment documentation covers only PostgreSQL initialization. Therefore, the origin of mekb.sqlite—whether it was created manually, imported from an external source, restored from a backup, or generated by an external tool—is NOT VERIFIABLE from repository evidence.

### Key Finding

The engineering database is treated as a **pre-existing, externally-maintained authoritative data source** that is not part of the MITRA application initialization or deployment process. The repository accesses and modifies it, but does not create or initialize it.
