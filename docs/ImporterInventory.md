# Importer Inventory

This inventory was built from direct evidence in the repository (Python source and workbook files). Where information is missing, the item is marked NOT VERIFIABLE with the evidence source.

---

## 1. Blow Mold Internal Study
- Importer name: Blow Mold Internal Study
- Python file: NOT VERIFIABLE (no importer function or module found matching this name in repository search)
- Import function: NOT VERIFIABLE
- Destination table(s): NOT VERIFIABLE
- Source workbook(s): Found files matching name patterns:
  - temp data/Blow Molds Data for Internal Study.xlsx
  - temp data/Blow Molds Data for Internal Study_RevA.xlsx
  Evidence: workbook files exist at the above paths (file search).
- Source worksheet(s): NOT VERIFIABLE (worksheets not inspected)
- Source columns: NOT VERIFIABLE
- Target columns: NOT VERIFIABLE
- Import order: NOT VERIFIABLE
- Dependencies: NOT VERIFIABLE
- Importer active: NOT VERIFIABLE
- Referenced by other importer: NOT VERIFIABLE

---

## 2. Cycle Time Importer
- Importer name: Cycle Time Importer
- Python file: NOT VERIFIABLE (no explicit importer function found)
- Import function: NOT VERIFIABLE
- Destination table(s): Candidate: `cycle_time_history` (logical target name) — existence of table must be cross-checked in later step.
- Source workbook(s): Found files matching pattern:
  - temp data/029_Blow Molds Cycle Times.xlsx
  Evidence: workbook file exists (file search).
- Source worksheet(s): NOT VERIFIABLE
- Source columns: NOT VERIFIABLE
- Target columns: NOT VERIFIABLE
- Import order: NOT VERIFIABLE
- Dependencies: NOT VERIFIABLE
- Importer active: NOT VERIFIABLE
- Referenced by other importer: NOT VERIFIABLE

---

## 3. Process Planning Importer
- Importer name: Process Planning Importer
- Python file: NOT VERIFIABLE
- Import function: NOT VERIFIABLE
- Destination table(s): Candidate: `process_planning` (to be cross-checked)
- Source workbook(s): Found files matching pattern:
  - temp data/BM454_Process planning sheet.xlsx
  - temp data/BM454_Process planning sheet(1).xlsx
  - temp data/BM476_Process planning sheet.xlsx
  - temp data/BM471_Process planning sheet.xlsx
  - temp data/BM377 Process planning sheet.xlsx
  Evidence: workbook files exist (file search).
- Source worksheet(s): NOT VERIFIABLE
- Source columns: NOT VERIFIABLE
- Target columns: NOT VERIFIABLE
- Import order: NOT VERIFIABLE
- Dependencies: NOT VERIFIABLE
- Importer active: NOT VERIFIABLE
- Referenced by other importer: NOT VERIFIABLE

---

## 4. Part List Importer
- Importer name: Part List Importer
- Python file: NOT VERIFIABLE
- Import function: NOT VERIFIABLE
- Destination table(s): Candidate: `part_list` (to be cross-checked)
- Source workbook(s): Found files matching pattern:
  - temp data/BM454 Veedol 600ml M01 08Cavity Mold SEB101 FN_Partlist_RevA.xlsx
  - temp data/BM454 Veedol 600ml M01 08Cavity Mold SEB101 FN_Partlist_RevA(1).xlsx
  - (other Partlist files referenced in temp listings but not present in repo root)
  Evidence: workbook files exist (file search; temp data folder).
- Source worksheet(s): NOT VERIFIABLE
- Source columns: NOT VERIFIABLE
- Target columns: NOT VERIFIABLE
- Import order: NOT VERIFIABLE
- Dependencies: NOT VERIFIABLE
- Importer active: NOT VERIFIABLE
- Referenced by other importer: NOT VERIFIABLE

---


# Importer Inventory (Repository-backed verification)

This document records importer implementation evidence discovered in the repository. All entries are based on direct repository evidence (code or file presence). No inference or guessing has been used.

---

## Repository scan summary

- Python files inspected (23):
  - acceptance_evidence.py
  - customer_detection.py
  - improve_ekl_data.py
  - generate_docs.py
  - generate_acceptance_report.py
  - explore_data.py
  - inspect_pmm_rows.py
  - inspect_pmm.py
  - temp_generate_docs_new.py
  - temp_generate_docs_fixed.py
  - temp_generate_docs.py
  - pmm_data_library/models.py
  - pmm_data_library/db.py
  - pmm_data_library/setup_db.py
  - pmm_data_library/utils.py
  - pmm_data_library/__init__.py
  - scripts/generate_validator_verification_report.py
  - scripts/generate_validation_documentation.py
  - scripts/generate_model_schema_verification_report.py
  - scripts/generate_model_schema_comparison.py
  - scripts/generate_database_schema_inventory.py
  - scripts/verify_model_mismatches.py
  - scripts/schema_validation_audit.py

Evidence: repository file listing produced by workspace search.

---

## Importer candidates found (evidence-backed)

1) `d:/Mitra3.0/pmm_data_library/setup_db.py`
- Purpose: Rebuilds a SQLite database from a master Excel workbook.
- Evidence:
  - File docstring: "Rebuilds the SQLite database from the master Excel file."
  - Code: `xl = pd.ExcelFile(excel_path)` and `df = pd.read_excel(excel_path, sheet_name=sheet)` (reads Excel)
  - Code: `df.to_sql(table, conn, if_exists='replace', index=False)` (writes to SQLite)
  - Function: `build_database(excel_path: str, db_path: str)` — implements the import/rebuild loop.
  - Workbook path evidence: default `excel_path = os.path.join(script_dir, "..", "PMM_Master_Data_Library.xlsx")` (relative path in code)
  - Destination tables (explicit mapping in `sheet_table_map`):
    - 'Master_Blow_Molds' → 'blow_molds'
    - 'Master_Injection_Molds' → 'injection_molds'
    - 'Master_Job_Works' → 'job_works'
    - 'Master_ALPLA_STD_Parts' → 'alpla_std_parts'
    - 'Master_Commercial_Molds' → 'commercial_molds'
    - 'Data_Dictionary' → 'data_dictionary'
    - 'Normalization_Rules' → 'normalization_rules'
    - 'Source_Summary' → 'source_summary'
- Importer function: `build_database` (defined in file)
- Import order: loop over `sheet_table_map` iteration order in source (deterministic as written)
- Dependencies: `pandas`, `sqlite3`, `os` (imports at top of file)

2) `d:/Mitra3.0/improve_ekl_data.py`
- Purpose: Data-quality improvements and automated transformations inside the existing EKL SQLite DB (not an Excel importer).
- Evidence:
  - Top-level `DB` constant pointing at `D:\MitraEngineeringLibrary\database\mekb.sqlite`
  - Uses `sqlite3.connect(DB)` and `cur.execute(...)` for SELECT/UPDATE/INSERT operations
  - Multiple `INSERT INTO ...` SQL strings present, e.g. `INSERT INTO bottle_family (family_name, description, created_at) VALUES (?, ?, ?)` and others.
  - Entry point: `main()` function performs database modifications and is guarded by `if __name__ == "__main__": main()`
- Workbook referenced: NONE (file does not read Excel; no `pd.read_excel`, `ExcelFile`, or `openpyxl` usage)
- Destination tables referenced (evidence from SQL strings): `bottle_family`, `customer_master`, `project_customer_link`, `neck_type_master`, `project_relationships`, `ai_search_tags`, `product_master`, `project_master`, `cycle_time_history`, etc.
- Importer function: NONE (this is a transformation script; not an importer from Excel)

3) `d:/Mitra3.0/scripts/generate_validation_documentation.py`
- Purpose: Generates documentation (DatabaseSchemaInventory.md and ValidationQueryAudit.md) by inspecting the SQLite DB and parsing `acceptance_evidence.py`.
- Evidence: uses `sqlite3` to query schema and counts; parses SQL in `acceptance_evidence.py` via `ast`; does not read Excel or write tables.
- Workbook referenced: NONE
- Destination tables referenced: None for import; used only for inspection queries.

---

## Importers mentioned in project requirements but NO IMPLEMENTATION FOUND in repository

The following importer names were part of the validation scope provided by the project brief but no matching implementation (Python file or function reading Excel and writing to the EKL database) was found in the repository search results above. For each item below, repository evidence is given.

- Blow Mold Internal Study
  - Status: NO IMPLEMENTATION FOUND
  - Evidence: repository-wide code search for Excel-reading and to-SQL patterns (`pd.read_excel`, `pd.ExcelFile`, `to_sql`, `openpyxl`, `load_workbook`, `xlrd`) returned only the files listed above; no Python module or function matching "Blow Mold Internal Study" or a similarly named importer was found.

- Cycle Time Importer
  - Status: NO IMPLEMENTATION FOUND
  - Evidence: no code reading cycle time workbooks or mapping cycle-time sheets to `cycle_time_history` via `to_sql` was found. A workbook named `temp data/029_Blow Molds Cycle Times.xlsx` exists in the repo, but no importer referencing it was found.

- Process Planning Importer
  - Status: NO IMPLEMENTATION FOUND
  - Evidence: multiple `Process planning` workbook files are present under `temp data/`, but no Python code was found that reads these workbooks and writes to `process_planning`.

- Part List Importer
  - Status: NO IMPLEMENTATION FOUND
  - Evidence: Partlist workbook files exist in `temp data/`, but no Python importer code referencing these files or writing to a `part_list` table was found.

- Component Detail Importer
  - Status: NO IMPLEMENTATION FOUND
  - Evidence: `temp data/component Details.xlsx` exists; no matching Python importer code found.

- Document Index Importer
  - Status: NO IMPLEMENTATION FOUND
  - Evidence: no Python code found that reads document index workbooks and writes to `document_index`.

---

## Cross-check notes and constraints

- All assertions above are based on repository evidence collected by searching for Excel-reading and DB-writing code patterns across every Python file (`pd.read_excel`, `pd.ExcelFile`, `openpyxl`, `load_workbook`, `.to_sql`, `executemany`, `cursor.execute(` with `INSERT`), and by inspecting the matching files listed in "Importer candidates found".
- Where a workbook file exists in the repository but no importer code references it, the importer mapping is marked `NO IMPLEMENTATION FOUND` (per instructions: do not infer).
- No edits to code, importers, or database were performed.

---

## Next steps (per your flow)

- Cross-check the destination tables referenced in the verified importer implementations (for example, the `sheet_table_map` in `pmm_data_library/setup_db.py`) against `docs/DatabaseSchemaInventory.md` (this is step 4 in your process). This is ready to run when you confirm to proceed.

---

Revision: inventory updated with repository-backed evidence only.

---

## Verified Import Pipeline

Source: `d:/Mitra3.0/pmm_data_library/setup_db.py`

This section documents the importer behavior exactly as implemented in `pmm_data_library/setup_db.py`. All items below are derived from explicit source code operations in that file; no inference is used.

Behavior summary (evidence lines in source):
- Removes existing DB file if present: `if os.path.exists(db_path): os.remove(db_path)`
- Opens SQLite connection: `conn = sqlite3.connect(db_path)`
- Loads Excel workbook: `xl = pd.ExcelFile(excel_path)`
- Iterates `sheet_table_map` and for each sheet:
  - Checks sheet presence: `if sheet not in xl.sheet_names: print(f"⚠️ Sheet '{sheet}' not found, skipping.")`
  - Reads worksheet into DataFrame: `df = pd.read_excel(excel_path, sheet_name=sheet)`
  - Renames columns: `df.columns = [c.replace(' ', '_').replace('/', '_').replace('.', '_').replace('-', '_') for c in df.columns]`
  - Writes DataFrame to SQLite table: `df.to_sql(table, conn, if_exists='replace', index=False)`
- Commits and closes connection: `conn.commit(); conn.close()`

Transaction / error handling / logging (evidence):
- Error handling: explicit check for missing Excel file at script start prints an error and returns (no exception handling block).
- Sheet-missing handling: sheet-not-found condition prints a warning and continues to next sheet.
- Logging: `print()` used to report removed DB, table writes, and completion messages.
- Transactions: explicit `conn.commit()` after loop; no per-sheet transaction demarcation or explicit rollback handling.

Per-sheet mapping (from `sheet_table_map` in source):

For each mapping below, the worksheet name is the key in `sheet_table_map` and the destination SQLite table is the mapped value. The importer performs only the operations listed (all taken verbatim from source): read worksheet with `pd.read_excel`, rename columns by replacing spaces/slashes/dots/dashes with underscores, then write with `df.to_sql(..., if_exists='replace', index=False)`.

- Worksheet: `Master_Blow_Molds`
  - Destination table: `blow_molds`
  - DataFrame transformations: column renaming via `c.replace(' ', '_').replace('/', '_').replace('.', '_').replace('-', '_')`
  - Column renaming: all columns are renamed using the rule above (no selective renames)
  - Data cleaning/normalization/filtering/deduplication: NONE implemented in source
  - Foreign key generation: NONE implemented in source
  - Default values / NULL handling: NONE implemented in source (delegated to `to_sql` and SQLite)
  - Error handling: missing sheet prints warning and is skipped

- Worksheet: `Master_Injection_Molds`
  - Destination table: `injection_molds`
  - DataFrame transformations: same as above (column renaming rule)
  - No additional cleaning, FK, dedup, or default handling present in source

- Worksheet: `Master_Job_Works`
  - Destination table: `job_works`
  - DataFrame transformations: column renaming only

- Worksheet: `Master_ALPLA_STD_Parts`
  - Destination table: `alpla_std_parts`
  - DataFrame transformations: column renaming only

- Worksheet: `Master_Commercial_Molds`
  - Destination table: `commercial_molds`
  - DataFrame transformations: column renaming only

- Worksheet: `Data_Dictionary`
  - Destination table: `data_dictionary`
  - DataFrame transformations: column renaming only

- Worksheet: `Normalization_Rules`
  - Destination table: `normalization_rules`
  - DataFrame transformations: column renaming only

- Worksheet: `Source_Summary`
  - Destination table: `source_summary`
  - DataFrame transformations: column renaming only

Columns imported / ignored / generated / transformed
- Columns imported: all columns present in each worksheet are read into the DataFrame by `pd.read_excel` and written into the destination table after the column-name normalization step.
- Columns ignored: NONE explicitly ignored by code (no column selection or drop is present).
- Columns generated: NONE generated by the importer (no new columns are created in code).
- Columns transformed: only header names are transformed via the replace sequence; no per-cell transformations are applied.

NOT VERIFIABLE (per-source gaps):
- Precise worksheet row counts and per-column value cleaning rules are NOT VERIFIABLE from `setup_db.py` (the script does not inspect or assert specific column names or values beyond renaming headers).
- Any expected foreign-key relationships, PK assignment, or downstream normalization are NOT implemented in this script and thus NOT VERIFIABLE from this source.

Evidence references (source snippets):
- `if os.path.exists(db_path): os.remove(db_path)` — removes old DB file if present
- `xl = pd.ExcelFile(excel_path)` — loads workbook
- `if sheet not in xl.sheet_names: print(f"⚠️ Sheet '{sheet}' not found, skipping.")` — sheet existence check
- `df = pd.read_excel(excel_path, sheet_name=sheet)` — read worksheet
- `df.columns = [c.replace(' ', '_').replace('/', '_').replace('.', '_').replace('-', '_') for c in df.columns]` — header renaming
- `df.to_sql(table, conn, if_exists='replace', index=False)` — write to SQLite
- `conn.commit(); conn.close()` — commit and close

---

End of verified importer pipeline section.

---

## Verified Schema Cross-Check

This section cross-checks each worksheet-to-destination-table mapping from `pmm_data_library/setup_db.py` against `docs/DatabaseSchemaInventory.md`.

Per instructions, `docs/DatabaseSchemaInventory.md` is treated as the primary source of truth. The live SQLite database is only used if a finding already present in the inventory requires confirmation; no live database evidence is required for the current result because the inventory does not contain these importer destination tables.

| Worksheet | Destination Table | Schema Status | Evidence | Result | Classification |
| --- | --- | --- | --- | --- | --- |
| Master_Blow_Molds | blow_molds | NOT VERIFIABLE | `docs/DatabaseSchemaInventory.md` contains no section or entry for `blow_molds`; the source mapping is only present in `pmm_data_library/setup_db.py` as `sheet_table_map['Master_Blow_Molds'] = 'blow_molds'`. | Table not found in primary schema inventory. | NOT VERIFIABLE |
| Master_Injection_Molds | injection_molds | NOT VERIFIABLE | `docs/DatabaseSchemaInventory.md` contains no section or entry for `injection_molds`; the only source mapping is the `sheet_table_map` entry in `pmm_data_library/setup_db.py`. | Table not found in primary schema inventory. | NOT VERIFIABLE |
| Master_Job_Works | job_works | NOT VERIFIABLE | `docs/DatabaseSchemaInventory.md` contains no section or entry for `job_works`; the only source mapping is the `sheet_table_map` entry in `pmm_data_library/setup_db.py`. | Table not found in primary schema inventory. | NOT VERIFIABLE |
| Master_ALPLA_STD_Parts | alpla_std_parts | NOT VERIFIABLE | `docs/DatabaseSchemaInventory.md` contains no section or entry for `alpla_std_parts`; the only source mapping is the `sheet_table_map` entry in `pmm_data_library/setup_db.py`. | Table not found in primary schema inventory. | NOT VERIFIABLE |
| Master_Commercial_Molds | commercial_molds | NOT VERIFIABLE | `docs/DatabaseSchemaInventory.md` contains no section or entry for `commercial_molds`; the only source mapping is the `sheet_table_map` entry in `pmm_data_library/setup_db.py`. | Table not found in primary schema inventory. | NOT VERIFIABLE |
| Data_Dictionary | data_dictionary | NOT VERIFIABLE | `docs/DatabaseSchemaInventory.md` contains no section or entry for `data_dictionary`; the only source mapping is the `sheet_table_map` entry in `pmm_data_library/setup_db.py`. | Table not found in primary schema inventory. | NOT VERIFIABLE |
| Normalization_Rules | normalization_rules | NOT VERIFIABLE | `docs/DatabaseSchemaInventory.md` contains no section or entry for `normalization_rules`; the only source mapping is the `sheet_table_map` entry in `pmm_data_library/setup_db.py`. | Table not found in primary schema inventory. | NOT VERIFIABLE |
| Source_Summary | source_summary | NOT VERIFIABLE | `docs/DatabaseSchemaInventory.md` contains no section or entry for `source_summary`; the only source mapping is the `sheet_table_map` entry in `pmm_data_library/setup_db.py`. | Table not found in primary schema inventory. | NOT VERIFIABLE |

### Verified pipeline behavior (source-code evidence)
- `if os.path.exists(db_path): os.remove(db_path)` — implemented.
- `xl = pd.ExcelFile(excel_path)` — implemented.
- `if sheet not in xl.sheet_names: print(...)` — implemented.
- `df = pd.read_excel(excel_path, sheet_name=sheet)` — implemented.
- `df.columns = [...]` — implemented.
- `df.to_sql(table, conn, if_exists='replace', index=False)` — implemented.
- `conn.commit()` and `conn.close()` — implemented.
- Column cleaning, filtering, deduplication, FK generation, default values, and NULL handling are not implemented in this source and therefore remain NOT VERIFIABLE for schema mapping purposes.

### Evidence summary
- Primary schema source: `docs/DatabaseSchemaInventory.md`
- Verified importer mapping source: `pmm_data_library/setup_db.py`
- Result: the worksheet-to-table mappings are present in source code, but their corresponding table definitions are not present in the primary schema inventory, so each cross-check result is `NOT VERIFIABLE` rather than asserted as a match or difference.
