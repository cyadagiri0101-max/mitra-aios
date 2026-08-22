# Backend Architecture Inventory

**Source scope:** backend implementation only.
**Evidence scope:** repository source files under `D:\MitraEngineeringLibrary\api`, `D:\MitraEngineeringLibrary\models`, `D:\MitraEngineeringLibrary\config`, and `D:\MitraEngineeringLibrary\src`.
**Excluded:** frontend, documentation, acceptance reports.

---

## 1. Application Entry Point

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| Python FastAPI entry point | `D:\MitraEngineeringLibrary\api\start_server.py` | imports `uvicorn` and `app` from `api.main`, runs `uvicorn.run(...)` | Verified |
| TypeScript Express entry point | `D:\MitraEngineeringLibrary\src\index.ts` | imports `express`, initializes `DataSource`, uses `createApiRouter`, listens on port | Verified |

---

## 2. Root Module

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| Python API root module | `D:\MitraEngineeringLibrary\api\main.py` | defines `app = FastAPI(...)`, endpoint routes, and DB dependency | Verified |
| TypeScript app root module | `D:\MitraEngineeringLibrary\src\index.ts` | instantiates Express app and initializes TypeORM `DataSource` | Verified |

---

## 3. Registered Modules

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| Python models module | `D:\MitraEngineeringLibrary\models\__init__.py` | exports `Base`, `engine`, `SessionLocal`, `get_db`, entity classes | Verified |
| Python config module | `D:\MitraEngineeringLibrary\config\__init__.py` | exports `settings` from `settings.py` | Verified |
| TypeScript database config module | `D:\MitraEngineeringLibrary\src\database\data-source.ts` | exports `AppDataSourceOptions` array of entities | Verified |

---

## 4. Controllers

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| Python route controller | `D:\MitraEngineeringLibrary\api\main.py` | defines FastAPI route handlers for `/health`, `/api/v1/...`, `/api/v1/search`, `/api/v1/documents`, `/api/v1/dashboard/widgets` | Verified |
| TypeScript API router | `D:\MitraEngineeringLibrary\src\controllers\api.controller.ts` | `createApiRouter` builds Express routes for `/status`, `/projects`, `/customers`, `/machines`, `/materials` | Verified |

---

## 5. Providers

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| Python DB provider | `D:\MitraEngineeringLibrary\models\database.py` | `SessionLocal` and `get_db()` FastAPI dependency provider | Verified |
| TypeScript DataSource provider | `D:\MitraEngineeringLibrary\src\database\data-source.ts` | TypeORM `DataSourceOptions` exported and used by `src/index.ts` | Verified |

---

## 6. Services

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| ProjectService | `D:\MitraEngineeringLibrary\src\services\project-service.ts` | methods to create/find projects, customers, products, machines, materials, neck types | Verified |
| ImporterService | `D:\MitraEngineeringLibrary\src\services\importer.service.ts` | workbook import logic and text-file import logic | Verified |
| FolderScannerService | `D:\MitraEngineeringLibrary\src\services\folder-scanner.service.ts` | folder scanning by project prefix | Verified |

---

## 7. Database Module

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| Python SQLAlchemy database module | `D:\MitraEngineeringLibrary\models\database.py` | `engine`, `SessionLocal`, `Base`, SQLite PRAGMA config, get_db dependency | Verified |
| TypeScript TypeORM config | `D:\MitraEngineeringLibrary\src\database\data-source.ts` | database connection options and entity registration | Verified |

---

## 8. Configuration Module

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| Python settings module | `D:\MitraEngineeringLibrary\config\settings.py` | Pydantic `BaseSettings` class with `DATABASE_URL`, `PROJECT_NAME`, `VERSION`, `SOURCE_DIR`, `EXPORT_DIR`, `LOG_DIR`, env file support | Verified |

---

## 9. Authentication Module

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| Authentication | NOT FOUND | no auth imports or auth code in `api/*.py`, `src/*.ts`, or `src/**/*.ts` | Verified |

---

## 10. Logging

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| Logging | NOT FOUND | no dedicated logging module or `winston`/`morgan`/`logging` config found in backend source | Verified |

---

## 11. Middleware

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| Python CORS middleware | `D:\MitraEngineeringLibrary\api\main.py` | `app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)` | Verified |
| Express middleware | `D:\MitraEngineeringLibrary\src\index.ts` | `app.use(bodyParser.json())` | Verified |

---

## 12. Guards

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| Guards | NOT FOUND | no guard/authorization code patterns found in backend source | Verified |

---

## 13. Interceptors

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| Interceptors | NOT FOUND | no interceptor-related code patterns found | Verified |

---

## 14. Pipes

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| Pipes | NOT FOUND | no pipe/validation pipe code patterns found | Verified |

---

## 15. Filters

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| Filters | NOT FOUND | no exception/filter code patterns found | Verified |

---

## 16. DTO Folders

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| DTO folder | NOT FOUND | no DTO file names or folders found in backend source | Verified |

---

## 17. Entity Folders

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| Python ORM entities | `D:\MitraEngineeringLibrary\models\entities.py` | SQLAlchemy models with `Base` and relationships | Verified |
| TypeScript ORM entities | `D:\MitraEngineeringLibrary\src\entities` | TypeORM entity classes under `src/entities/*.entity.ts` | Verified |

---

## 18. Repository Folders

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| TypeScript repository usage | `D:\MitraEngineeringLibrary\src\controllers\api.controller.ts`, `D:\MitraEngineeringLibrary\src\services\project-service.ts` | `dataSource.getRepository(...)` usage in controller and service code | Verified |
| Python repository pattern | NOT VERIFIED | no explicit repository folder or repository classes found in Python backend | Not Verifiable |

---

## 19. Scheduler / Queue / Cache / Background Workers

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| Scheduler / queue / cache / background workers | NOT FOUND | no scheduler, queue, worker, cron, Redis, or cache code found in backend source | Verified |

---

## 20. ORM

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| SQLAlchemy ORM | `D:\MitraEngineeringLibrary\models\database.py`, `D:\MitraEngineeringLibrary\models\entities.py` | `declarative_base()`, `create_engine`, sessionmaker, SQLAlchemy models | Verified |
| TypeORM ORM | `D:\MitraEngineeringLibrary\src\database\data-source.ts`, `D:\MitraEngineeringLibrary\src\entities/*.entity.ts` | TypeORM `DataSourceOptions`, `@Entity`, column decorators | Verified |

---

## 21. HTTP Framework

| Name | Repository Path | Evidence | Confidence |
| --- | --- | --- | --- |
| FastAPI | `D:\MitraEngineeringLibrary\api\main.py` | imports FastAPI, defines `app = FastAPI(...)` and route handlers | Verified |
| Express | `D:\MitraEngineeringLibrary\src\index.ts` | imports `express`, creates app, and listens on port | Verified |

---

## 22. Summary Observations

- The repository contains two distinct backend stacks:
  - Python FastAPI backend under `D:\MitraEngineeringLibrary\api`, `models`, and `config`.
  - TypeScript Express/TypeORM backend under `D:\MitraEngineeringLibrary\src`.
- Authentication, logging, guards, interceptors, pipes, filters, and scheduler/background worker support are absent from the verified backend source.
- DTO-specific folders are not present in the backend source.
- A repository pattern is only implied by TypeORM repository usage, not implemented as dedicated repository classes in Python.

---

**Inventory created from verified repository evidence only.**
