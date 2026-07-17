# Database Lineage

## Database File 1

- Database file: D:\MitraEngineeringLibrary\database\mekb.sqlite
- Purpose: EKL inventory / validation database used by the engineering validation documentation set.
- Created by: Not evidenced as created by `pmm_data_library/setup_db.py`; it is referenced directly by validation and documentation scripts such as `acceptance_evidence.py`, `improve_ekl_data.py`, `explore_data.py`, `generate_docs.py`, and `scripts/generate_database_schema_inventory.py`.
- Referenced by: `docs/DatabaseSchemaInventory.md`, `acceptance_evidence.py`, `improve_ekl_data.py`, `explore_data.py`, `generate_docs.py`, `scripts/generate_database_schema_inventory.py`, `scripts/generate_model_schema_comparison.py`, `scripts/generate_model_schema_verification_report.py`, `scripts/generate_validation_documentation.py`, `scripts/schema_validation_audit.py`, and `scripts/verify_model_mismatches.py`.
- Evidence: `docs/DatabaseSchemaInventory.md` states the database file is `D:\MitraEngineeringLibrary\database\mekb.sqlite`.
- Relationship to EKL: This is the EKL database that the documentation inventory describes.
- Relationship to setup_db.py: `pmm_data_library/setup_db.py` does not target this path; it defaults to `pmm_database.db` in the `pmm_data_library` folder.
- Relationship to DatabaseSchemaInventory.md: This is the database described by `docs/DatabaseSchemaInventory.md`.
- Final conclusion: `setup_db.py` does not build this database.

## Database File 2

- Database file: D:\Mitra3.0\pmm_data_library\pmm_database.db
- Purpose: PMM data-library database produced by the PMM setup/rebuild script.
- Created by: `pmm_data_library/setup_db.py`.
- Referenced by: `pmm_data_library/setup_db.py`, `pmm_data_library/db.py`, `inspect_pmm.py`, `inspect_pmm_rows.py`, `mitra-backend/src/modules/tool-master/services/pmm-import.service.ts`, `mitra-backend/src/modules/tool-master/services/tool-master.service.ts`, `mitra-backend/import_pmm_to_tool_master.js`, and `pmm_data_library/README.md`.
- Evidence: `pmm_data_library/setup_db.py` sets `db_path = args.db or os.path.join(script_dir, "pmm_database.db")` and uses `sqlite3.connect(db_path)`.
- Relationship to EKL: This is a separate PMM data-library database, not the EKL inventory database.
- Relationship to setup_db.py: This is the database path created by `setup_db.py`.
- Relationship to DatabaseSchemaInventory.md: No relationship is evidenced by the inventory; the inventory documents `D:\MitraEngineeringLibrary\database\mekb.sqlite`, not this file.
- Final conclusion: `setup_db.py` builds this database, not `mekb.sqlite`.

## Repository references found

- `mekb.sqlite` references:
  - `acceptance_evidence.py`
  - `customer_detection.py`
  - `explore_data.py`
  - `improve_ekl_data.py`
  - `generate_docs.py`
  - `scripts/generate_database_schema_inventory.py`
  - `scripts/generate_model_schema_comparison.py`
  - `scripts/generate_model_schema_verification_report.py`
  - `scripts/generate_validation_documentation.py`
  - `scripts/schema_validation_audit.py`
  - `scripts/verify_model_mismatches.py`
  - `docs/DatabaseSchemaInventory.md`

- `pmm_database.db` references:
  - `pmm_data_library/setup_db.py`
  - `pmm_data_library/db.py`
  - `inspect_pmm.py`
  - `inspect_pmm_rows.py`
  - `mitra-backend/import_pmm_to_tool_master.js`
  - `mitra-backend/src/modules/tool-master/services/pmm-import.service.ts`
  - `mitra-backend/src/modules/tool-master/services/tool-master.service.ts`
  - `pmm_data_library/README.md`

## Final Conclusion

Choice: B. `setup_db.py` builds a different database.

Reason: The repository evidence shows that `pmm_data_library/setup_db.py` writes to `pmm_database.db` in the `pmm_data_library` folder by default, while the inventoried EKL schema is documented under `D:\MitraEngineeringLibrary\database\mekb.sqlite` and referenced by the validation/documentation scripts.
