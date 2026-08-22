# MEKB Data Dictionary and Source Inventory

## Purpose
This document captures the first-phase engineering data analysis for the Mitra Engineering Knowledge Base (MEKB). It catalogs the source file families, identifies repeated data structures and header patterns, and maps source fields to the proposed EKL data model.

## Source File Families

### 1. Blow Molds Cycle Time Sheets
- Example file: `029_Blow Molds Cycle Times.xlsx`
- Typical worksheet: `Sheet1`
- Key fields detected:
  - `MACHINE`
  - `PRODUCT WEIGHT`
  - `CAVITATION`
  - `CYCLE TIME`
  - `REMARKS`
- Data pattern: cycle-time measurements per machine/product weight combination
- Proposed mapping:
  - `MachineMaster` (machine_code, machine_name, machine_type)
  - `CycleTimeHistory` (machine_id, product_weight_gm, cavitation, cycle_time_sec, remarks, source metadata)

### 2. Blow Molds Internal Study Sheets
- Example files: `Blow Molds Data for Internal Study.xlsx`, `Blow Molds Data for Internal Study_RevA.xlsx`
- Sheets may include `Sheet1`, `Sheet2`
- Header row often starts with `Tool No`, `Mold Name`, `Cavitation`, `Machine`, `Process`, `Product Type`, `product Weight (gm)`, `Product+Flash (gm)`, `Calucualted parision lenth (mm)`, `Pinch Width`, `Parision wall Thickness`, `Resin`, `Product Height (mm)`, `Product Volume(ml)`, `Product Size`, `Remarks`
- Data pattern: mold-level product engineering details, raw material, dimensions, and process metadata
- Proposed mapping:
  - `ProjectMaster` (project_number, project_prefix, project_name)
  - `ProductMaster` (product_name, weight_gm, volume_ml, height_mm, material, shape)
  - `MachineMaster` (machine_code, machine_name)
  - `MaterialMaster` (material_code, material_name, material_type, grade)
  - `CycleTimeHistory` as line-level engineering measurements
  - `EngineeringDocument` for complete raw sheet captures when records are ambiguous

### 3. Index & Part List Sheets
- Example files: `BM-454 INDEX SHEET(1).xlsx`, `BM-454 INDEX SHEET.xlsx`, `BM-474 INDEX SHEET.xlsx`
- Typical header row: `S.NO`, `DESCRIPTION`, `PAGE NO`, `REMARKS`
- Data pattern: structured document index / table of contents for mold data packages
- Proposed mapping:
  - `EngineeringDocument` for the index document metadata
  - `DocumentIndex` or `PartList` for structured index entries where useful
  - `ProjectMaster` associations via project identifier in filename or document body

### 4. Process Planning Sheets
- Example files: `BM377 Process planning sheet.xlsx`, `BM454_Process planning sheet.xlsx`, `BM471_Process planning sheet.xlsx`, `BM476_Process planning sheet.xlsx`
- Key identified headers: `S.NO`, `3D modeling`, `COMPLETED`, `MOLD DEVELOPMENT`, `ELECTRODE EXTRACTION`, `MACHINING MODELS`, `MOLD BASE PARTS`
- Data pattern: project process steps by project number and status
- Proposed mapping:
  - `ProcessPlanning` (project_id, step_number, step_name, status, planned_start, planned_end, actual_start, actual_end)
  - `ProjectMaster` linkage by extracted project identifier from file name or document text

### 5. Mold Part Lists and Cost Sheets
- Example files: `BM454 Veedol 600ml M01 08Cavity Mold SEB101 FN_Partlist_RevA(1).xlsx`, `BM454 Veedol 600ml M01 08Cavity Mold SEB101 FN_Partlist_RevA.xlsx`
- Sheets observed: `COST-SUMMARY`, `Mold and Mask Parts`, `Mold Base Parts`, `Standard Parts`, `Fastners`, `Elec`, `Partlist- summary`, `WQF`, `SHEET1`
- Key fields:
  - `S.NO`, `Description`, `Amount - Rs`, `MATERIAL`, `GRADE`, `QTY`, `FINISHED SIZES`, `REMARKS`, `Length/Dia`, `Height`, `Width`, `Weight`, `Rate`, `Amount`
- Data pattern: BOM-style part listings, material/cost breakdowns, standard/fastener/electrode details
- Proposed mapping:
  - `PartList` (project_id, item_description, material, grade, quantity, dimensions, weight, rate, amount, part_type)
  - `MaterialMaster` for materials and grades
  - `EngineeringDocument` for sheet-level provenance

### 6. Component Details Sheets
- Example file: `component Details.xlsx`
- Sheet: `Details`
- Headers: `Tool No`, `Description`, `cavity`, `Material`, `Component Weight`, `Volume`, `Shape`, `MA`, `MI`, `TH`
- Proposed mapping:
  - `ProjectMaster` by `Tool No`
  - `ProductMaster` / `BottleFamily` if component represents product family
  - `MaterialMaster` for `Material`
  - `TechnicalSpecification` for component dimensions and physical properties

## Project Identifier Normalization
- Frequent project prefixes: `BM`, `IM`, `IBM`, `PD`, `E`, `O`, `CMB`, `F`, `S`
- Canonical project identifier pattern: `<PREFIX><NUMBER>` (e.g. `BM454`, `IM123`)
- `extract_project_number()` should handle hyphens, spaces, and mixed-case names

## Recommended Master Schema for EKL
- `ProjectMaster`
  - `project_number`
  - `project_prefix`
  - `project_name`
  - `description`
  - `status`
  - `created_at`, `updated_at`, `revision`
- `ProductMaster`
  - `product_name`
  - `product_variant`
  - `volume_ml`
  - `weight_gm`
  - `height_mm`
  - `material`
  - `shape`
  - `bottle_family_id`
- `MachineMaster`
  - `machine_code`
  - `machine_name`
  - `machine_type`
  - `manufacturer`, `model`
- `MaterialMaster`
  - `material_code`
  - `material_name`
  - `material_type`
  - `grade`
  - `supplier`
- `BottleFamily`
  - `family_name`
  - `typical_volume_range`
- `NeckTypeMaster`
  - `neck_code`, `neck_name`, `neck_size_mm`, `thread_type`

## Recommended Transactional Schema
- `CycleTimeHistory`
  - `project_id`, `machine_id`, `product_name`, `product_weight_gm`, `cavitation`, `cycle_time_sec`, `remarks`
- `ProcessPlanning`
  - `project_id`, `step_number`, `step_name`, `status`, timing fields
- `PartList`
  - `project_id`, `item_description`, `material`, `grade`, `quantity`, `dimensions`, `weight`, `rate`, `amount`, `part_type`
- `TechnicalSpecification`
  - `bottle_family_id`, `spec_name`, `spec_value`, `spec_unit`, `spec_category`
- `EngineeringDocument`
  - full raw document capture, filename, content, source metadata
- `ImportContext` / `DataSource` / `Provenance`
  - file provenance, batch, row origin, revision history

## Provenance & Validation Requirements
- Persist source file metadata for every imported row
- Track `source_file`, `source_sheet`, `source_row`
- Maintain import batch id and computed file hash
- Validate numeric fields with locale-aware parsing
- Store raw row parse warnings when headers or row structure vary
- Deduplicate `ProjectMaster` by canonical project identifier

## Data Dictionary Glossary
- `project_number`: canonical tool/project code extracted from file names and rows
- `machine_code`: machine identifier from `MACHINE` or `Machine`
- `product_weight_gm`: product weight in grams
- `cavitation`: cavity count or notation such as `4+4`
- `cycle_time_sec`: cycle duration in seconds
- `material_name` / `material_code`: resin or metal material used in mold/product
- `volume_ml`: product volume in milliliters
- `height_mm`: product or part height in millimeters
- `shape`: product or component geometry descriptor
- `remarks`: free-text engineering comments

## Next Steps
1. Confirm additional source file types beyond the current Excel inventory.
2. Formalize schema definitions in `models/entities.py` and `database/schema.sql`.
3. Develop parsing rules for each file family, including header detection and fallback heuristics.
4. Create `importers/config.yaml` or parser metadata to map source columns to EKL fields.
5. Build a validation report generator to compare raw document structure against expected schema.
