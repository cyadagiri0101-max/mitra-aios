# M7 — Engineering Knowledge Library Scan Report
## Automated Discovery & Governance Audit
**Scan Batch ID:** `scan-1787221595788-cf88d28f`  
**Scan Timestamp:** `2026-08-20T10:26:35.788Z`  
**Scanner Version:** `1.0.0-M7.0`  
**Library Root:** `D:\Mitra3.0\MitraEngineeringLibrary`  
**Governance Mode:** Strict Read-Only  

---

## 1. Executive Metrics

| Metric | Value | Notes |
| :--- | :--- | :--- |
| **Total Files Discovered** | **19,400** | Complete filesystem recursive traversal |
| **Total Directories** | **2,338** | Discovered subfolder depth |
| **Total Physical Size** | **268.35 MB** (28,13,86,814 bytes) | Raw storage on disk |
| **Eligible Engineering Assets** | **73** | Pre-filtered domain assets for RAG ingestion |
| **Excluded Runtime Files** | **19,327** | Dependencies (.venv, node_modules, bytecode) |
| **Identical Duplicate Groups** | **1033** | SHA-256 hash match groups |
| **Revision Candidate Groups** | **7** | Iteration / revision sequences detected |
| **Scan Errors / Inaccessible** | **0** | Permission or missing file errors |

---

## 2. Classification Breakdown

| Classification | Count | Description |
| :--- | :--- | :--- |
| **ENGINEERING_DOCUMENT** | 39 | Markdown specifications, data dictionaries, analysis reports |
| **ENGINEERING_DATA** | 0 | Part lists, cycle times, process planning sheets, index files |
| **STRUCTURED_DATABASE** | 1 | MEKB SQLite relational database (24 tables) |
| **MASTER_WORKBOOK** | 4 | Master project workbooks (PL.xlsx, Asset Inventory) |
| **PARSER_SOURCE** | 29 | Extraction parsers and domain schema definitions |
| **MANIFEST** | 7 | Historical export batch logs and summaries |
| **RUNTIME_DEPENDENCY** | 14199 | Excluded package dependencies (.venv / node_modules) |
| **BINARY_RUNTIME** | 5091 | Excluded compiled binaries (.pyc, .dll, .pyd, .exe) |
| **CACHE / BUILD_ARTIFACT** | 0 | Excluded source maps, temp cache files |
| **UNKNOWN / EXCLUDED** | 30 | Unclassified / non-engineering files |

---

## 3. Authority Classification

| Authority Status | Count | Ingestion Handling |
| :--- | :--- | :--- |
| **AUTHORITATIVE_RELEASE** | 66 | Primary RAG candidate (Score multiplier: $1.0\times$) |
| **CURRENT_WORKING** | 4 | Active project working sheets (Score multiplier: $0.8\times$) |
| **HISTORICAL_REFERENCE** | 10 | Secondary baseline reference (Score multiplier: $0.5\times$) |
| **SUPERSEDED** | 0 | Replaced revisions (filtered by default) |
| **UNKNOWN** | 19320 | Non-domain or excluded runtime records |

---

## 4. Key Authoritative Domain Assets

- `api/main.py` (27.0 KB) — *PARSER_SOURCE* [AUTHORITATIVE_RELEASE] (SHA-256: `5e66e5a26364...`)
- `api/start_server.py` (0.2 KB) — *PARSER_SOURCE* [AUTHORITATIVE_RELEASE] (SHA-256: `2566a1092ce8...`)
- `database/mekb.sqlite` (644.0 KB) — *STRUCTURED_DATABASE* [AUTHORITATIVE_RELEASE] (SHA-256: `cf9f7c2df8af...`)
- `docs/BackendArchitectureInventory.md` (8.5 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `d65b2e2db125...`)
- `docs/BusinessRules.md` (0.7 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `23713191a3fa...`)
- `docs/CustomerCoverageReport.md` (1.0 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `7b09159a1204...`)
- `docs/CustomerRules.md` (0.4 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `2812613c6162...`)
- `docs/CustomerValidationReport.md` (1.4 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `7e9aad5790b7...`)
- `docs/data_dictionary.md` (7.4 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `fb226f157df5...`)
- `docs/DataQualityReport.md` (4.6 KB) — *ENGINEERING_DOCUMENT* [HISTORICAL_REFERENCE] (SHA-256: `879590221deb...`)
- `docs/DocumentTypeRules.md` (0.6 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `638df0c9bd83...`)
- `docs/DuplicateReport.md` (2.8 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `e10f86e546c8...`)
- `docs/EngineeringAssetInventory.md` (4.3 KB) — *MASTER_WORKBOOK* [CURRENT_WORKING] (SHA-256: `688ad73d91f1...`)
- `docs/EngineeringDataDictionary.md` (79.8 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `9c55d15b5b6c...`)
- `docs/EngineeringDataDictionary.xlsx` (233.6 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `8c7d8e5543a1...`)
- `docs/EngineeringNamingConvention.md` (1.1 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `78031046b637...`)
- `docs/EngineeringStatistics.md` (0.4 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `0042b3bcfea6...`)
- `docs/excel_files_structure_report.md` (63.7 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `57666d434259...`)
- `docs/FolderStructureAnalysis.md` (1374.2 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `c65e3615e24c...`)
- `docs/FolderValidationReport.md` (1.5 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `b153fe3bcbb3...`)
- `docs/GapAnalysis.md` (1404.7 KB) — *ENGINEERING_DOCUMENT* [HISTORICAL_REFERENCE] (SHA-256: `d3e7ae83a49c...`)
- `docs/ImportAuditReport.md` (4.3 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `1f52ce67a8be...`)
- `docs/ImportConfidenceReport.md` (0.6 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `2a7f4316dad7...`)
- `docs/ImportPreparationChecklist.md` (0.8 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `a0452cae6bff...`)
- `docs/MachineRules.md` (0.9 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `8d01156ea885...`)
- `docs/MachineValidationReport.md` (3.9 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `02ab75a21d0f...`)
- `docs/NeckTypeRules.md` (0.4 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `668dbf722e6e...`)
- `docs/Phase1QualityReport.md` (3.8 KB) — *ENGINEERING_DOCUMENT* [HISTORICAL_REFERENCE] (SHA-256: `2e79cf653530...`)
- `docs/Phase1Summary.md` (0.7 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `9ab3d27147ae...`)
- `docs/ProjectCoverageReport.md` (0.3 KB) — *ENGINEERING_DOCUMENT* [AUTHORITATIVE_RELEASE] (SHA-256: `37248a837488...`)

---

## 5. Duplicate Groups Summary

### Group 1 (SHA-256: `82847d669ac6a2ae...`)
- **Primary:** `.venv/Include/site/python3.14/greenlet/greenlet.h`
- **Duplicates:**
  - `.venv/Lib/site-packages/greenlet/greenlet.h`

### Group 2 (SHA-256: `ceebae7b8927a322...`)
- **Primary:** `.venv/Lib/site-packages/annotated_doc-0.0.4.dist-info/INSTALLER`
- **Duplicates:**
  - `.venv/Lib/site-packages/annotated_types-0.7.0.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/anyio-4.14.1.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/certifi-2026.6.17.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/charset_normalizer-3.4.7.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/click-8.4.2.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/colorama-0.4.6.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/et_xmlfile-2.0.0.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/fastapi-0.139.0.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/greenlet-3.5.3.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/h11-0.16.0.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/idna-3.18.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/jinja2-3.1.6.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/markupsafe-3.0.3.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/numpy-2.5.0.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/openpyxl-3.1.5.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/pandas-3.0.3.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/pip-26.1.2.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/pydantic_core-2.46.4.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/pydantic_settings-2.14.2.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/pydantic-2.13.4.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/python_dateutil-2.9.0.post0.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/python_dotenv-1.2.2.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/requests-2.34.2.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/six-1.17.0.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/sqlalchemy-2.0.51.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/starlette-1.3.1.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/typing_extensions-4.16.0.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/typing_inspection-0.4.2.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/tzdata-2026.2.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/urllib3-2.7.0.dist-info/INSTALLER`
  - `.venv/Lib/site-packages/uvicorn-0.49.0.dist-info/INSTALLER`

### Group 3 (SHA-256: `e3b0c44298fc1c14...`)
- **Primary:** `.venv/Lib/site-packages/annotated_doc/py.typed`
- **Duplicates:**
  - `.venv/Lib/site-packages/annotated_types/py.typed`
  - `.venv/Lib/site-packages/anyio/_backends/__init__.py`
  - `.venv/Lib/site-packages/anyio/_core/__init__.py`
  - `.venv/Lib/site-packages/anyio/py.typed`
  - `.venv/Lib/site-packages/anyio/streams/__init__.py`
  - `.venv/Lib/site-packages/certifi/py.typed`
  - `.venv/Lib/site-packages/charset_normalizer/py.typed`
  - `.venv/Lib/site-packages/click/py.typed`
  - `.venv/Lib/site-packages/fastapi-0.139.0.dist-info/REQUESTED`
  - `.venv/Lib/site-packages/fastapi/dependencies/__init__.py`
  - `.venv/Lib/site-packages/fastapi/openapi/__init__.py`
  - `.venv/Lib/site-packages/fastapi/py.typed`
  - `.venv/Lib/site-packages/greenlet/platform/__init__.py`
  - `.venv/Lib/site-packages/idna/py.typed`
  - `.venv/Lib/site-packages/jinja2-3.1.6.dist-info/REQUESTED`
  - `.venv/Lib/site-packages/jinja2/py.typed`
  - `.venv/Lib/site-packages/markupsafe/py.typed`
  - `.venv/Lib/site-packages/numpy/_pyinstaller/__init__.py`
  - `.venv/Lib/site-packages/numpy/_pyinstaller/__init__.pyi`
  - `.venv/Lib/site-packages/numpy/core/_dtype_ctypes.pyi`
  - `.venv/Lib/site-packages/numpy/core/_dtype.pyi`
  - `.venv/Lib/site-packages/numpy/fft/tests/__init__.py`
  - `.venv/Lib/site-packages/numpy/lib/tests/__init__.py`
  - `.venv/Lib/site-packages/numpy/linalg/tests/__init__.py`
  - `.venv/Lib/site-packages/numpy/ma/tests/__init__.py`
  - `.venv/Lib/site-packages/numpy/matrixlib/tests/__init__.py`
  - `.venv/Lib/site-packages/numpy/polynomial/tests/__init__.py`
  - `.venv/Lib/site-packages/numpy/py.typed`
  - `.venv/Lib/site-packages/numpy/random/tests/__init__.py`
  - `.venv/Lib/site-packages/numpy/random/tests/data/__init__.py`
  - `.venv/Lib/site-packages/numpy/testing/_private/__init__.py`
  - `.venv/Lib/site-packages/numpy/testing/_private/__init__.pyi`
  - `.venv/Lib/site-packages/numpy/testing/tests/__init__.py`
  - `.venv/Lib/site-packages/numpy/tests/__init__.py`
  - `.venv/Lib/site-packages/numpy/typing/tests/__init__.py`
  - `.venv/Lib/site-packages/openpyxl-3.1.5.dist-info/REQUESTED`
  - `.venv/Lib/site-packages/pandas-3.0.3.dist-info/REQUESTED`
  - `.venv/Lib/site-packages/pandas/_libs/window/__init__.py`
  - `.venv/Lib/site-packages/pandas/core/__init__.py`
  - `.venv/Lib/site-packages/pandas/core/_numba/__init__.py`
  - `.venv/Lib/site-packages/pandas/core/computation/__init__.py`
  - `.venv/Lib/site-packages/pandas/core/dtypes/__init__.py`
  - `.venv/Lib/site-packages/pandas/core/indexes/__init__.py`
  - `.venv/Lib/site-packages/pandas/core/interchange/__init__.py`
  - `.venv/Lib/site-packages/pandas/core/methods/__init__.py`
  - `.venv/Lib/site-packages/pandas/core/reshape/__init__.py`
  - `.venv/Lib/site-packages/pandas/core/sparse/__init__.py`
  - `.venv/Lib/site-packages/pandas/core/tools/__init__.py`
  - `.venv/Lib/site-packages/pandas/core/util/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/api/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/apply/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/arithmetic/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/arrays/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/arrays/boolean/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/arrays/categorical/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/arrays/datetimes/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/arrays/floating/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/arrays/integer/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/arrays/interval/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/arrays/masked/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/arrays/numpy_/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/arrays/period/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/arrays/sparse/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/arrays/string_/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/arrays/timedeltas/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/base/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/computation/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/config/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/construction/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/copy_view/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/copy_view/index/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/dtypes/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/dtypes/cast/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/extension/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/extension/uuid/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/frame/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/frame/constructors/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/frame/indexing/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/generic/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/groupby/aggregate/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/groupby/methods/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/groupby/transform/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/indexes/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/indexes/base_class/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/indexes/categorical/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/indexes/datetimelike_/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/indexes/datetimes/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/indexes/datetimes/methods/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/indexes/interval/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/indexes/multi/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/indexes/numeric/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/indexes/object/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/indexes/period/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/indexes/period/methods/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/indexes/ranges/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/indexes/string/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/indexes/timedeltas/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/indexes/timedeltas/methods/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/indexing/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/indexing/interval/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/indexing/multiindex/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/interchange/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/internals/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/io/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/io/excel/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/io/formats/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/io/formats/style/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/io/json/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/io/parser/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/io/parser/common/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/io/parser/dtypes/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/io/parser/usecols/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/io/pytables/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/io/pytables/common.py`
  - `.venv/Lib/site-packages/pandas/tests/io/sas/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/io/xml/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/libs/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/plotting/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/plotting/frame/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/resample/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/reshape/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/reshape/concat/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/reshape/merge/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/scalar/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/scalar/interval/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/scalar/period/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/scalar/timedelta/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/scalar/timedelta/methods/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/scalar/timestamp/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/scalar/timestamp/methods/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/series/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/series/accessors/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/series/indexing/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/tools/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/tseries/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/tseries/frequencies/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/tseries/holiday/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/tseries/offsets/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/tslibs/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/util/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/window/__init__.py`
  - `.venv/Lib/site-packages/pandas/tests/window/moments/__init__.py`
  - `.venv/Lib/site-packages/pip-26.1.2.dist-info/REQUESTED`
  - `.venv/Lib/site-packages/pip/_internal/operations/__init__.py`
  - `.venv/Lib/site-packages/pip/_internal/operations/build/__init__.py`
  - `.venv/Lib/site-packages/pip/_internal/resolution/__init__.py`
  - `.venv/Lib/site-packages/pip/_internal/resolution/legacy/__init__.py`
  - `.venv/Lib/site-packages/pip/_internal/resolution/resolvelib/__init__.py`
  - `.venv/Lib/site-packages/pip/_internal/utils/__init__.py`
  - `.venv/Lib/site-packages/pip/_vendor/cachecontrol/py.typed`
  - `.venv/Lib/site-packages/pip/_vendor/certifi/py.typed`
  - `.venv/Lib/site-packages/pip/_vendor/distro/py.typed`
  - `.venv/Lib/site-packages/pip/_vendor/idna/py.typed`
  - `.venv/Lib/site-packages/pip/_vendor/packaging/py.typed`
  - `.venv/Lib/site-packages/pip/_vendor/platformdirs/py.typed`
  - `.venv/Lib/site-packages/pip/_vendor/pyproject_hooks/py.typed`
  - `.venv/Lib/site-packages/pip/_vendor/resolvelib/py.typed`
  - `.venv/Lib/site-packages/pip/_vendor/rich/py.typed`
  - `.venv/Lib/site-packages/pip/_vendor/truststore/py.typed`
  - `.venv/Lib/site-packages/pip/_vendor/urllib3/contrib/__init__.py`
  - `.venv/Lib/site-packages/pydantic_core/py.typed`
  - `.venv/Lib/site-packages/pydantic_settings-2.14.2.dist-info/REQUESTED`
  - `.venv/Lib/site-packages/pydantic_settings/py.typed`
  - `.venv/Lib/site-packages/pydantic/_internal/__init__.py`
  - `.venv/Lib/site-packages/pydantic/deprecated/__init__.py`
  - `.venv/Lib/site-packages/pydantic/py.typed`
  - `.venv/Lib/site-packages/pydantic/v1/py.typed`
  - `.venv/Lib/site-packages/python_dotenv-1.2.2.dist-info/REQUESTED`
  - `.venv/Lib/site-packages/requests-2.34.2.dist-info/REQUESTED`
  - `.venv/Lib/site-packages/requests/py.typed`
  - `.venv/Lib/site-packages/sqlalchemy-2.0.51.dist-info/REQUESTED`
  - `.venv/Lib/site-packages/sqlalchemy/py.typed`
  - `.venv/Lib/site-packages/starlette/py.typed`
  - `.venv/Lib/site-packages/typing_inspection/__init__.py`
  - `.venv/Lib/site-packages/typing_inspection/py.typed`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/Africa/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/America/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/America/Argentina/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/America/Indiana/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/America/Kentucky/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/America/North_Dakota/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/Antarctica/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/Arctic/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/Asia/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/Atlantic/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/Australia/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/Brazil/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/Canada/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/Chile/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/Etc/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/Europe/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/Indian/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/Mexico/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/Pacific/__init__.py`
  - `.venv/Lib/site-packages/tzdata/zoneinfo/US/__init__.py`
  - `.venv/Lib/site-packages/urllib3/contrib/__init__.py`
  - `.venv/Lib/site-packages/uvicorn-0.49.0.dist-info/REQUESTED`
  - `.venv/Lib/site-packages/uvicorn/lifespan/__init__.py`
  - `.venv/Lib/site-packages/uvicorn/loops/__init__.py`
  - `.venv/Lib/site-packages/uvicorn/middleware/__init__.py`
  - `.venv/Lib/site-packages/uvicorn/protocols/__init__.py`
  - `.venv/Lib/site-packages/uvicorn/protocols/http/__init__.py`
  - `.venv/Lib/site-packages/uvicorn/protocols/websockets/__init__.py`
  - `node_modules/exit/.npmignore`
  - `node_modules/mime/.npmignore`
  - `node_modules/resolve/test/pathfilter/deep_ref/main.js`
  - `node_modules/resolve/test/resolver/baz/doom.js`
  - `node_modules/resolve/test/resolver/browser_field/a.js`
  - `node_modules/resolve/test/resolver/browser_field/b.js`
  - `node_modules/resolve/test/resolver/false_main/index.js`
  - `node_modules/resolve/test/resolver/mug.coffee`
  - `node_modules/resolve/test/resolver/mug.js`
  - `node_modules/resolve/test/resolver/multirepo/packages/package-b/index.js`
  - `node_modules/resolve/test/resolver/other_path/lib/other-lib.js`
  - `node_modules/resolve/test/resolver/other_path/root.js`
  - `node_modules/resolve/test/resolver/symlinked/_/node_modules/foo.js`
  - `node_modules/resolve/test/resolver/symlinked/_/symlink_target/.gitkeep`
  - `node_modules/resolve/test/shadowed_core/node_modules/util/index.js`

### Group 4 (SHA-256: `69e6228a0d359581...`)
- **Primary:** `.venv/Lib/site-packages/anyio-4.14.1.dist-info/WHEEL`
- **Duplicates:**
  - `.venv/Lib/site-packages/certifi-2026.6.17.dist-info/WHEEL`
  - `.venv/Lib/site-packages/requests-2.34.2.dist-info/WHEEL`

### Group 5 (SHA-256: `e93716da6b9c0d5a...`)
- **Primary:** `.venv/Lib/site-packages/certifi-2026.6.17.dist-info/licenses/LICENSE`
- **Duplicates:**
  - `.venv/Lib/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/certifi/LICENSE`
  - `.venv/Lib/site-packages/pip/_vendor/certifi/LICENSE`

### Group 6 (SHA-256: `8e1c6b44fded7447...`)
- **Primary:** `.venv/Lib/site-packages/charset_normalizer-3.4.7.dist-info/WHEEL`
- **Duplicates:**
  - `.venv/Lib/site-packages/greenlet-3.5.3.dist-info/WHEEL`
  - `.venv/Lib/site-packages/sqlalchemy-2.0.51.dist-info/WHEEL`

### Group 7 (SHA-256: `1b68144734c4b667...`)
- **Primary:** `.venv/Lib/site-packages/click-8.4.2.dist-info/WHEEL`
- **Duplicates:**
  - `.venv/Lib/site-packages/idna-3.18.dist-info/WHEEL`
  - `.venv/Lib/site-packages/pip-26.1.2.dist-info/WHEEL`
  - `.venv/Lib/site-packages/typing_extensions-4.16.0.dist-info/WHEEL`

### Group 8 (SHA-256: `f0f8f2675695a10a...`)
- **Primary:** `.venv/Lib/site-packages/dotenv/py.typed`
- **Duplicates:**
  - `.venv/Lib/site-packages/pip/_vendor/tomli_w/py.typed`
  - `.venv/Lib/site-packages/pip/_vendor/tomli/py.typed`

### Group 9 (SHA-256: `0c84bb42f5d367e5...`)
- **Primary:** `.venv/Lib/site-packages/et_xmlfile-2.0.0.dist-info/LICENCE.rst`
- **Duplicates:**
  - `.venv/Lib/site-packages/openpyxl-3.1.5.dist-info/LICENCE.rst`

### Group 10 (SHA-256: `30fa8d0cb65b5ea1...`)
- **Primary:** `.venv/Lib/site-packages/idna/__init__.py`
- **Duplicates:**
  - `.venv/Lib/site-packages/pip/_vendor/idna/__init__.py`

---

## 6. Revision Candidate Groups Summary

### Base: `__init__`
- **Latest Candidate:** `parsers/__init__.py`
- **Sequences:**
  - `parsers/__init__.py` (base) [AUTHORITATIVE_RELEASE]
  - `models/__init__.py` (base) [AUTHORITATIVE_RELEASE]

### Base: `clean_import`
- **Latest Candidate:** `scripts/clean_import_v3.py`
- **Sequences:**
  - `scripts/clean_import_v3.py` (base) [AUTHORITATIVE_RELEASE]
  - `scripts/clean_import_v2.py` (base) [AUTHORITATIVE_RELEASE]
  - `scripts/clean_import.py` (base) [AUTHORITATIVE_RELEASE]

### Base: `EngineeringAssetInventory`
- **Latest Candidate:** `docs/EngineeringAssetInventory.md`
- **Sequences:**
  - `docs/EngineeringAssetInventory.md` (base) [CURRENT_WORKING]
  - `EngineeringAssetInventory.xlsx` (base) [CURRENT_WORKING]
  - `EngineeringAssetInventory.json` (base) [CURRENT_WORKING]

### Base: `EngineeringDataDictionary`
- **Latest Candidate:** `docs/EngineeringDataDictionary.xlsx`
- **Sequences:**
  - `docs/EngineeringDataDictionary.xlsx` (base) [AUTHORITATIVE_RELEASE]
  - `docs/EngineeringDataDictionary.md` (base) [AUTHORITATIVE_RELEASE]

### Base: `phase2_validation`
- **Latest Candidate:** `scripts/phase2_validation_v2.py`
- **Sequences:**
  - `scripts/phase2_validation_v2.py` (base) [AUTHORITATIVE_RELEASE]
  - `scripts/phase2_validation.py` (base) [AUTHORITATIVE_RELEASE]

### Base: `run_phase2`
- **Latest Candidate:** `scripts/run_phase2_v2.py`
- **Sequences:**
  - `scripts/run_phase2_v2.py` (base) [AUTHORITATIVE_RELEASE]
  - `scripts/run_phase2.py` (base) [AUTHORITATIVE_RELEASE]

### Base: `WorkbookAnalysis`
- **Latest Candidate:** `docs/WorkbookAnalysis.xlsx`
- **Sequences:**
  - `docs/WorkbookAnalysis.xlsx` (base) [AUTHORITATIVE_RELEASE]
  - `docs/WorkbookAnalysis.md` (base) [AUTHORITATIVE_RELEASE]

---

## 7. Safety & Compliance Affirmation

- **Source Integrity:** Verified read-only scan. Zero source files were modified, moved, renamed, or deleted.
- **Exclusion Verification:** All 19k+ virtualenv and node_modules dependencies successfully isolated from knowledge eligibility.
- **Deterministic Manifest:** Full JSON manifest available at `M7_LIBRARY_MANIFEST.json`.
