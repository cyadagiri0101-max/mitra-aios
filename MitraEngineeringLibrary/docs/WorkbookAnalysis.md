# Workbook Analysis

This book-level analysis captures workbook purpose, sheet structure, validation guidance, and unknown fields for each source item.

## 029_Blow Molds Cycle Times.xlsx

### WorkbookPurpose

- Capture cycle time and machine performance details for blow molds and process equipment.

### Worksheets

- Sheet1 (62 rows, 8 cols)

### Header Row

- Sheet1: MACHINE | PRODUCT WEIGHT | CAVITATION | CYCLE TIME | REMARKS

### Merged Cells

- Sheet1: 11 merged region(s) (2:62-6:62, 2:54-4:54, 2:55-4:55, 2:56-4:56, 2:57-4:57, 2:59-6:59, 2:35-6:35, 2:4-6:4, 2:42-6:42, 2:60-6:60, 2:61-6:61)

### Primary Keys

- Suggested key: project code + machine + product weight + cavitation.

### Relationships

- Relate machine cycles to project and product metadata.

### Validation Rules

- Parse `CYCLE TIME` to numeric seconds.
- Normalize `PRODUCT WEIGHT` to numeric grams.
- Preserve `CAVITATION` text exactly.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- This file appears to capture blow mold engineering and cycle time data.

### Target Tables (future)

- `CycleTimeHistory`, `MachineMaster`, `ProductMaster`, `ProjectMaster`

### Unknown Fields

- No unknown fields detected in the first header row.

---

## Blow Molds Data for Internal Study_RevA.xlsx

### WorkbookPurpose

- Capture cycle time and machine performance details for blow molds and process equipment.

### Worksheets

- Sheet1 (135 rows, 24 cols)
- Sheet2 (136 rows, 24 cols)

### Header Row

- Sheet1: C.F - Compressed Flash
- Sheet2: C.F - Compressed Flash

### Merged Cells

- Sheet1: 18 merged region(s) (9:3-9:4, 10:3-11:3, 0:2-23:2, 17:3-19:3, 20:3-22:3, 0:3-0:4, 1:3-1:4, 2:3-2:4, 3:3-3:4, 15:3-15:4, 16:3-16:4, 13:3-13:4, 4:3-4:4, 12:3-12:4, 14:3-14:4, 5:3-5:4, 7:3-7:4, 8:3-8:4)
- Sheet2: 18 merged region(s) (13:3-13:4, 14:3-14:4, 15:3-15:4, 16:3-16:4, 0:2-23:2, 0:3-0:4, 1:3-1:4, 2:3-2:4, 3:3-3:4, 4:3-4:4, 6:3-6:4, 7:3-7:4, 8:3-8:4, 9:3-9:4, 17:3-19:3, 20:3-22:3, 10:3-11:3, 12:3-12:4)

### Primary Keys

- Suggested key: project code + machine + product weight + cavitation.

### Relationships

- Relate machine cycles to project and product metadata.

### Validation Rules

- Parse `CYCLE TIME` to numeric seconds.
- Normalize `PRODUCT WEIGHT` to numeric grams.
- Preserve `CAVITATION` text exactly.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- This file appears to capture blow mold engineering and cycle time data.

### Target Tables (future)

- `CycleTimeHistory`, `MachineMaster`, `ProductMaster`, `ProjectMaster`

### Unknown Fields

- c f compressed flash

---

## Blow Molds Data for Internal Study.xlsx

### WorkbookPurpose

- Capture cycle time and machine performance details for blow molds and process equipment.

### Worksheets

- Sheet1 (135 rows, 23 cols)
- Sheet2 (136 rows, 23 cols)

### Header Row

- Sheet1: C.F - Compressed Flash
- Sheet2: C.F - Compressed Flash

### Merged Cells

- Sheet1: 18 merged region(s) (6:3-6:4, 7:3-7:4, 8:3-8:4, 9:3-10:3, 0:2-22:2, 16:3-18:3, 19:3-21:3, 0:3-0:4, 1:3-1:4, 2:3-2:4, 3:3-3:4, 14:3-14:4, 15:3-15:4, 12:3-12:4, 4:3-4:4, 11:3-11:4, 13:3-13:4, 5:3-5:4)
- Sheet2: 18 merged region(s) (16:3-18:3, 19:3-21:3, 9:3-10:3, 11:3-11:4, 12:3-12:4, 13:3-13:4, 14:3-14:4, 15:3-15:4, 0:2-22:2, 0:3-0:4, 1:3-1:4, 2:3-2:4, 3:3-3:4, 4:3-4:4, 5:3-5:4, 6:3-6:4, 7:3-7:4, 8:3-8:4)

### Primary Keys

- Suggested key: project code + machine + product weight + cavitation.

### Relationships

- Relate machine cycles to project and product metadata.

### Validation Rules

- Parse `CYCLE TIME` to numeric seconds.
- Normalize `PRODUCT WEIGHT` to numeric grams.
- Preserve `CAVITATION` text exactly.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- This file appears to capture blow mold engineering and cycle time data.

### Target Tables (future)

- `CycleTimeHistory`, `MachineMaster`, `ProductMaster`, `ProjectMaster`

### Unknown Fields

- c f compressed flash

---

## BM-454 INDEX SHEET.xlsx

### WorkbookPurpose

- Capture engineering metadata, document indexes, or supporting project documents.

### Worksheets

- Sheet1 (68 rows, 5 cols)

### Header Row

- Sheet1: PRATHIRAJ METAL MASTERS PVT.LTD

### Merged Cells

- Sheet1: 12 merged region(s) (1:59-1:62, 4:48-4:49, 0:0-4:0, 0:1-4:1, 1:3-2:3, 0:2-4:2, 1:4-1:8, 3:48-3:49, 1:26-1:43, 1:44-1:54, 1:55-1:58, 1:9-1:25)

### Primary Keys

- Suggested key: file name + row index or section identifier.

### Relationships

- Relate index or document rows to EngineeringDocument and ProjectMaster entities.

### Validation Rules

- Validate key columns such as `S.NO`, `DESCRIPTION`, `PAGE NO`, and `REMARKS` for index sheets.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- This file appears to be a document index for engineering project deliverables.

### Target Tables (future)

- `EngineeringDocument`, `DocumentIndex`, `ProjectMaster`

### Unknown Fields

- prathiraj metal masters pvt ltd

---

## BM-454 INDEX SHEET(1).xlsx

### WorkbookPurpose

- Capture engineering metadata, document indexes, or supporting project documents.

### Worksheets

- Sheet1 (68 rows, 5 cols)

### Header Row

- Sheet1: PRATHIRAJ METAL MASTERS PVT.LTD

### Merged Cells

- Sheet1: 12 merged region(s) (1:59-1:62, 4:48-4:49, 0:0-4:0, 0:1-4:1, 1:3-2:3, 0:2-4:2, 1:4-1:8, 3:48-3:49, 1:26-1:43, 1:44-1:54, 1:55-1:58, 1:9-1:25)

### Primary Keys

- Suggested key: file name + row index or section identifier.

### Relationships

- Relate index or document rows to EngineeringDocument and ProjectMaster entities.

### Validation Rules

- Validate key columns such as `S.NO`, `DESCRIPTION`, `PAGE NO`, and `REMARKS` for index sheets.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- This file appears to be a document index for engineering project deliverables.

### Target Tables (future)

- `EngineeringDocument`, `DocumentIndex`, `ProjectMaster`

### Unknown Fields

- prathiraj metal masters pvt ltd

---

## BM-474 INDEX SHEET.xlsx

### WorkbookPurpose

- Capture engineering metadata, document indexes, or supporting project documents.

### Worksheets

- Sheet1 (44 rows, 8 cols)

### Header Row

- Sheet1: PRATHIRAJ METAL MASTERS PVT.LTD

### Merged Cells

- Sheet1: 10 merged region(s) (1:37-1:40, 0:0-4:0, 0:1-4:1, 1:3-2:3, 0:2-4:2, 1:4-1:8, 1:24-1:31, 1:32-1:36, 3:25-3:26, 1:9-1:23)

### Primary Keys

- Suggested key: file name + row index or section identifier.

### Relationships

- Relate index or document rows to EngineeringDocument and ProjectMaster entities.

### Validation Rules

- Validate key columns such as `S.NO`, `DESCRIPTION`, `PAGE NO`, and `REMARKS` for index sheets.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- This file appears to be a document index for engineering project deliverables.

### Target Tables (future)

- `EngineeringDocument`, `DocumentIndex`, `ProjectMaster`

### Unknown Fields

- prathiraj metal masters pvt ltd

---

## BM377 Process planning sheet.xlsx

### WorkbookPurpose

- Capture process planning stages, project milestones, and completion status.

### Worksheets

- 332 (82 rows, 15 cols)

### Header Row

- 332: TOOL NO :BM377 ERTH 400ml Rectangular Bottle HDPE M01 08-Cavity Mold BMU70E+ FN

### Merged Cells

- 332: 57 merged region(s) (1:66-4:66, 1:61-4:61, 6:76-8:76, 1:67-4:67, 1:68-4:68, 1:69-4:69, 1:73-4:73, 6:80-8:80, 1:81-4:81, 1:70-4:70, 1:72-4:72, 1:79-4:79, 1:80-4:80, 6:81-8:81, 6:77-8:77, 6:78-8:78, 1:77-4:77, 1:78-4:78, 1:76-4:76, 1:74-4:74, 1:75-4:75, 1:71-4:71, 6:79-8:79, 1:7-4:7, 1:8-4:8, 11:1-12:1, 1:1-4:1, 5:3-8:3, 5:4-8:4, 5:5-8:5, 1:4-4:4, 1:5-4:5, 0:0-14:0, 1:2-4:2, 5:1-8:1, 5:2-8:2, 1:3-4:3, 1:20-4:20, 1:39-4:39, 1:60-4:60, 1:40-4:40, 1:38-4:38, 1:21-4:21, 1:59-4:59, 1:35-4:35, 1:36-4:36, 1:34-4:34, 2:58-4:58, 2:22-4:22, 2:28-4:28, 2:26-4:26, 2:42-4:42, 2:44-4:44, 2:46-4:46, 2:51-4:51, 2:54-4:54, 2:53-4:53)

### Primary Keys

- Suggested key: project code + stage number or stage description.

### Relationships

- Relate process stages to project and milestone entities.

### Validation Rules

- Validate stage names and completion markers such as `COMPLETED`.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- Review the sample rows for additional engineering context.

### Target Tables (future)

- `ProcessPlanning`, `ProjectMaster`, `MilestoneHistory`

### Unknown Fields

- tool no bm377 erth 400ml rectangular bottle hdpe m01 08 cavity mold bmu70e fn

---

## BM454 Veedol 600ml M01 08Cavity Mold SEB101 FN_Partlist_RevA.xlsx

### WorkbookPurpose

- Capture bill of materials, material data, and cost/quantity breakdowns.

### Worksheets

- COST-SUMMARY (101 rows, 49 cols)
- Mold and Mask Parts (82 rows, 34 cols)
- Mold Base Parts  (59 rows, 32 cols)
- Standard Parts  (65 rows, 16 cols)
- Fastners (62 rows, 12 cols)
- Elec (50 rows, 27 cols)
- Partlist- summary (8 rows, 5 cols)
- WQF (15 rows, 32 cols)
- SHEET1 (53 rows, 10 cols)

### Header Row

- COST-SUMMARY: COST SUMMARY FOR -TOOL NO: BM454 Veedol 600ml M01 08Cavity SEB Mold SEB101 FN
- Mold and Mask Parts: PRATHIRAJ METAL MASTERS PVT.LTD
- Mold Base Parts : PRATHIRAJ METAL MASTERS PVT.LTD
- Standard Parts : PRATHIRAJ METAL MASTERS PVT.LTD
- Fastners: PRATHIRAJ METAL MASTERS PVT.LTD
- Elec: PRATHIRAJ METAL MASTERS PVT.LTD
- Partlist- summary: TOOL NO : BM454 Veedol 600ml M01 08Cavity SEB Mold SEB101 FN
- WQF: 10 | NECK PART B2,P2 | ALUMINIUM | ALUMINIUM | 1 | 740 | x | 55 | x | 3 | 3mm sheet | 745 | 60 | 8 | 1 | 1.0728 | 1.0728 | 500 | 536.4 | 3
- SHEET1: WELDURAL | 820 | 3

### Merged Cells

- COST-SUMMARY: 1 merged region(s) (0:0-2:0)
- Mold and Mask Parts: 15 merged region(s) (0:0-13:0, 0:1-13:1, 0:2-13:2, 0:3-13:3, 0:39-1:39, 7:4-11:4, 4:4-6:4, 0:22-13:22, 0:38-13:38, 0:21-13:21, 14:21-20:21, 14:38-20:38, 14:78-20:78, 14:39-20:39, 0:78-13:78)
- Mold Base Parts : 12 merged region(s) (0:0-13:0, 0:1-13:1, 0:2-13:2, 0:3-13:3, 4:4-6:4, 7:4-11:4, 0:17-13:17, 14:17-20:17, 0:18-1:18, 14:18-20:18, 0:55-13:55, 14:55-20:55)
- Standard Parts : 14 merged region(s) (9:20-10:20, 0:0-8:0, 0:1-8:1, 0:2-8:2, 0:3-8:3, 3:4-5:4, 0:20-8:20, 9:46-10:46, 0:21-8:21, 3:22-5:22, 0:34-8:34, 0:40-8:40, 0:45-8:45, 9:45-10:45)
- Fastners: 11 merged region(s) (9:16-10:16, 0:0-8:0, 0:1-8:1, 0:2-8:2, 0:3-8:3, 3:4-5:4, 0:17-8:17, 3:18-5:18, 0:32-8:32, 9:32-10:32, 9:33-10:33)
- Elec: 19 merged region(s) (0:0-17:0, 0:1-17:1, 0:2-17:2, 0:3-17:3, 3:4-7:4, 8:4-12:4, 16:4-17:4, 0:14-1:14, 15:14-17:14, 18:14-23:14, 16:5-17:5, 16:6-17:6, 16:7-17:7, 16:11-17:11, 16:12-17:12, 0:13-17:13, 16:8-17:8, 16:9-17:9, 16:10-17:10)
- Partlist- summary: 0 merged region(s)
- WQF: 0 merged region(s)
- SHEET1: 0 merged region(s)

### Primary Keys

- Suggested key: file name + row index + item description.

### Relationships

- Relate part lines to material master, project, and cost summary entities.

### Validation Rules

- Parse `QTY`, `Rate`, and `Amount` as numeric values when possible.
- Preserve `DESCRIPTION`, `MATERIAL`, and `GRADE` as raw text.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- Review the sample rows for additional engineering context.

### Target Tables (future)

- `PartList`, `MaterialMaster`, `ProjectMaster`, `EngineeringDocument`

### Unknown Fields

- cost summary for tool no bm454 veedol 600ml m01 08cavity seb mold seb101 fn, prathiraj metal masters pvt ltd, tool no bm454 veedol 600ml m01 08cavity seb mold seb101 fn, 10, neck part b2 p2, aluminium, 1, 740, x, 55, 3, 3mm sheet, 745, 60, 8, 1 0728, 500, 536 4, weldural, 820

---

## BM454 Veedol 600ml M01 08Cavity Mold SEB101 FN_Partlist_RevA(1).xlsx

### WorkbookPurpose

- Capture bill of materials, material data, and cost/quantity breakdowns.

### Worksheets

- COST-SUMMARY (101 rows, 49 cols)
- Mold and Mask Parts (82 rows, 34 cols)
- Mold Base Parts  (59 rows, 32 cols)
- Standard Parts  (65 rows, 16 cols)
- Fastners (62 rows, 12 cols)
- Elec (50 rows, 27 cols)
- Partlist- summary (8 rows, 5 cols)
- WQF (15 rows, 32 cols)
- SHEET1 (53 rows, 10 cols)

### Header Row

- COST-SUMMARY: COST SUMMARY FOR -TOOL NO: BM454 Veedol 600ml M01 08Cavity SEB Mold SEB101 FN
- Mold and Mask Parts: PRATHIRAJ METAL MASTERS PVT.LTD
- Mold Base Parts : PRATHIRAJ METAL MASTERS PVT.LTD
- Standard Parts : PRATHIRAJ METAL MASTERS PVT.LTD
- Fastners: PRATHIRAJ METAL MASTERS PVT.LTD
- Elec: PRATHIRAJ METAL MASTERS PVT.LTD
- Partlist- summary: TOOL NO : BM454 Veedol 600ml M01 08Cavity SEB Mold SEB101 FN
- WQF: 10 | NECK PART B2,P2 | ALUMINIUM | ALUMINIUM | 1 | 740 | x | 55 | x | 3 | 3mm sheet | 745 | 60 | 8 | 1 | 1.0728 | 1.0728 | 500 | 536.4 | 3
- SHEET1: WELDURAL | 820 | 3

### Merged Cells

- COST-SUMMARY: 1 merged region(s) (0:0-2:0)
- Mold and Mask Parts: 15 merged region(s) (0:0-13:0, 0:1-13:1, 0:2-13:2, 0:3-13:3, 0:39-1:39, 7:4-11:4, 4:4-6:4, 0:22-13:22, 0:38-13:38, 0:21-13:21, 14:21-20:21, 14:38-20:38, 14:78-20:78, 14:39-20:39, 0:78-13:78)
- Mold Base Parts : 12 merged region(s) (0:0-13:0, 0:1-13:1, 0:2-13:2, 0:3-13:3, 4:4-6:4, 7:4-11:4, 0:17-13:17, 14:17-20:17, 0:18-1:18, 14:18-20:18, 0:55-13:55, 14:55-20:55)
- Standard Parts : 14 merged region(s) (9:20-10:20, 0:0-8:0, 0:1-8:1, 0:2-8:2, 0:3-8:3, 3:4-5:4, 0:20-8:20, 9:46-10:46, 0:21-8:21, 3:22-5:22, 0:34-8:34, 0:40-8:40, 0:45-8:45, 9:45-10:45)
- Fastners: 11 merged region(s) (9:16-10:16, 0:0-8:0, 0:1-8:1, 0:2-8:2, 0:3-8:3, 3:4-5:4, 0:17-8:17, 3:18-5:18, 0:32-8:32, 9:32-10:32, 9:33-10:33)
- Elec: 19 merged region(s) (0:0-17:0, 0:1-17:1, 0:2-17:2, 0:3-17:3, 3:4-7:4, 8:4-12:4, 16:4-17:4, 0:14-1:14, 15:14-17:14, 18:14-23:14, 16:5-17:5, 16:6-17:6, 16:7-17:7, 16:11-17:11, 16:12-17:12, 0:13-17:13, 16:8-17:8, 16:9-17:9, 16:10-17:10)
- Partlist- summary: 0 merged region(s)
- WQF: 0 merged region(s)
- SHEET1: 0 merged region(s)

### Primary Keys

- Suggested key: file name + row index + item description.

### Relationships

- Relate part lines to material master, project, and cost summary entities.

### Validation Rules

- Parse `QTY`, `Rate`, and `Amount` as numeric values when possible.
- Preserve `DESCRIPTION`, `MATERIAL`, and `GRADE` as raw text.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- Review the sample rows for additional engineering context.

### Target Tables (future)

- `PartList`, `MaterialMaster`, `ProjectMaster`, `EngineeringDocument`

### Unknown Fields

- cost summary for tool no bm454 veedol 600ml m01 08cavity seb mold seb101 fn, prathiraj metal masters pvt ltd, tool no bm454 veedol 600ml m01 08cavity seb mold seb101 fn, 10, neck part b2 p2, aluminium, 1, 740, x, 55, 3, 3mm sheet, 745, 60, 8, 1 0728, 500, 536 4, weldural, 820

---

## BM454_Process planning sheet.xlsx

### WorkbookPurpose

- Capture process planning stages, project milestones, and completion status.

### Worksheets

- 332 (85 rows, 21 cols)

### Header Row

- 332: TOOL NO :BM454 Veedol 600ml M01 08Cavity SEB Mold SEB101 FN

### Merged Cells

- 332: 65 merged region(s) (2:10-4:10, 2:9-4:9, 6:83-9:83, 6:84-9:84, 6:79-8:79, 6:80-9:80, 6:81-9:81, 2:11-4:11, 6:82-9:82, 1:79-4:79, 1:78-4:78, 1:77-4:77, 1:76-4:76, 1:75-4:75, 1:84-4:84, 1:83-4:83, 0:0-14:0, 1:2-4:2, 5:1-8:1, 5:2-8:2, 11:1-12:1, 1:1-4:1, 5:3-8:3, 5:4-8:4, 5:5-8:5, 1:4-4:4, 1:5-4:5, 2:8-4:8, 1:7-4:7, 1:6-4:6, 1:3-4:3, 1:74-4:74, 1:73-4:73, 1:72-4:72, 2:63-5:63, 2:64-5:64, 2:65-5:65, 2:66-5:66, 2:67-5:67, 1:60-4:60, 2:59-4:59, 2:58-4:58, 2:57-4:57, 2:56-4:56, 1:55-4:55, 1:54-4:54, 1:82-4:82, 1:81-4:81, 1:80-4:80, 1:71-4:71, 1:61-4:61, 2:68-5:68, 2:69-5:69, 2:49-4:49, 2:48-4:48, 2:47-4:47, 1:46-4:46, 2:19-4:19, 2:14-4:14, 2:13-4:13, 1:45-4:45, 2:31-4:31, 1:29-4:29, 1:28-4:28, 2:20-4:20)

### Primary Keys

- Suggested key: project code + stage number or stage description.

### Relationships

- Relate process stages to project and milestone entities.

### Validation Rules

- Validate stage names and completion markers such as `COMPLETED`.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- Review the sample rows for additional engineering context.

### Target Tables (future)

- `ProcessPlanning`, `ProjectMaster`, `MilestoneHistory`

### Unknown Fields

- tool no bm454 veedol 600ml m01 08cavity seb mold seb101 fn

---

## BM454_Process planning sheet(1).xlsx

### WorkbookPurpose

- Capture process planning stages, project milestones, and completion status.

### Worksheets

- 332 (85 rows, 21 cols)

### Header Row

- 332: TOOL NO :BM454 Veedol 600ml M01 08Cavity SEB Mold SEB101 FN

### Merged Cells

- 332: 65 merged region(s) (2:10-4:10, 2:9-4:9, 6:83-9:83, 6:84-9:84, 6:79-8:79, 6:80-9:80, 6:81-9:81, 2:11-4:11, 6:82-9:82, 1:79-4:79, 1:78-4:78, 1:77-4:77, 1:76-4:76, 1:75-4:75, 1:84-4:84, 1:83-4:83, 0:0-14:0, 1:2-4:2, 5:1-8:1, 5:2-8:2, 11:1-12:1, 1:1-4:1, 5:3-8:3, 5:4-8:4, 5:5-8:5, 1:4-4:4, 1:5-4:5, 2:8-4:8, 1:7-4:7, 1:6-4:6, 1:3-4:3, 1:74-4:74, 1:73-4:73, 1:72-4:72, 2:63-5:63, 2:64-5:64, 2:65-5:65, 2:66-5:66, 2:67-5:67, 1:60-4:60, 2:59-4:59, 2:58-4:58, 2:57-4:57, 2:56-4:56, 1:55-4:55, 1:54-4:54, 1:82-4:82, 1:81-4:81, 1:80-4:80, 1:71-4:71, 1:61-4:61, 2:68-5:68, 2:69-5:69, 2:49-4:49, 2:48-4:48, 2:47-4:47, 1:46-4:46, 2:19-4:19, 2:14-4:14, 2:13-4:13, 1:45-4:45, 2:31-4:31, 1:29-4:29, 1:28-4:28, 2:20-4:20)

### Primary Keys

- Suggested key: project code + stage number or stage description.

### Relationships

- Relate process stages to project and milestone entities.

### Validation Rules

- Validate stage names and completion markers such as `COMPLETED`.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- Review the sample rows for additional engineering context.

### Target Tables (future)

- `ProcessPlanning`, `ProjectMaster`, `MilestoneHistory`

### Unknown Fields

- tool no bm454 veedol 600ml m01 08cavity seb mold seb101 fn

---

## BM471_Process planning sheet.xlsx

### WorkbookPurpose

- Capture process planning stages, project milestones, and completion status.

### Worksheets

- 332 (93 rows, 21 cols)
- Sheet1 (0 rows, 0 cols)

### Header Row

- 332: TOOL NO : BM471 60ml CN Bottle 10+10 cav Mold Samsung90D CN
- Sheet1: (inferred from first non-empty row)

### Merged Cells

- 332: 85 merged region(s) (2:60-4:60, 2:65-4:65, 2:70-4:70, 2:26-4:26, 2:27-4:27, 2:29-4:29, 2:28-4:28, 2:39-4:39, 2:43-4:43, 2:44-4:44, 2:35-4:35, 2:55-4:55, 2:40-4:40, 2:36-4:36, 2:47-4:47, 2:50-4:50, 2:48-4:48, 2:49-4:49, 2:25-4:25, 2:41-4:41, 2:42-4:42, 2:21-4:21, 2:37-4:37, 2:38-4:38, 2:24-4:24, 2:13-4:13, 2:16-4:16, 2:19-4:19, 2:20-4:20, 2:14-4:14, 2:15-4:15, 2:23-4:23, 2:22-4:22, 1:31-4:31, 1:32-4:32, 2:12-4:12, 6:90-9:90, 6:92-9:92, 6:86-8:86, 1:92-4:92, 6:89-9:89, 2:17-4:17, 1:73-4:73, 1:56-4:56, 2:63-4:63, 2:62-4:62, 2:18-4:18, 2:30-4:30, 2:71-4:71, 1:57-4:57, 2:66-4:66, 1:7-4:7, 1:6-4:6, 1:3-4:3, 2:11-4:11, 2:9-4:9, 2:8-4:8, 2:10-4:10, 0:0-14:0, 1:2-4:2, 5:1-8:1, 5:2-8:2, 11:1-12:1, 1:1-4:1, 5:3-8:3, 5:4-8:4, 5:5-8:5, 1:4-4:4, 1:5-4:5, 2:64-4:64, 2:33-4:33, 2:34-4:34, 6:91-9:91, 2:69-4:69, 2:68-4:68, 2:67-4:67, 1:72-4:72, 6:87-9:87, 6:88-9:88, 2:58-4:58, 2:61-4:61, 2:59-4:59, 2:51-4:51, 2:52-4:52, 2:53-4:53)
- Sheet1: 0 merged region(s)

### Primary Keys

- Suggested key: project code + stage number or stage description.

### Relationships

- Relate process stages to project and milestone entities.

### Validation Rules

- Validate stage names and completion markers such as `COMPLETED`.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- Review the sample rows for additional engineering context.

### Target Tables (future)

- `ProcessPlanning`, `ProjectMaster`, `MilestoneHistory`

### Unknown Fields

- tool no bm471 60ml cn bottle 10 10 cav mold samsung90d cn

---

## BM476_Process planning sheet.xlsx

### WorkbookPurpose

- Capture process planning stages, project milestones, and completion status.

### Worksheets

- 332 (137 rows, 239 cols)

### Header Row

- 332: TOOL NO : BM476 Vancouver 600ml 06-Cavity Mold BMU 70E+ FN

### Merged Cells

- 332: 37 merged region(s) (0:0-14:0, 1:2-4:2, 5:1-8:1, 5:2-8:2, 12:1-13:1, 1:1-4:1, 1:6-4:6, 1:3-4:3, 1:81-4:81, 1:80-4:80, 1:79-4:79, 2:77-5:77, 1:78-4:78, 1:67-4:67, 1:66-4:66, 2:65-4:65, 5:3-8:3, 5:4-8:4, 5:5-8:5, 1:4-4:4, 1:5-4:5, 1:85-4:85, 1:84-4:84, 1:83-4:83, 1:82-4:82, 1:7-4:7, 1:61-4:61, 1:60-4:60, 2:59-4:59, 2:64-4:64, 2:63-4:63, 2:62-4:62, 1:23-4:23, 1:44-4:44, 1:43-4:43, 2:26-4:26, 1:24-4:24)

### Primary Keys

- Suggested key: project code + stage number or stage description.

### Relationships

- Relate process stages to project and milestone entities.

### Validation Rules

- Validate stage names and completion markers such as `COMPLETED`.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- Review the sample rows for additional engineering context.

### Target Tables (future)

- `ProcessPlanning`, `ProjectMaster`, `MilestoneHistory`

### Unknown Fields

- tool no bm476 vancouver 600ml 06 cavity mold bmu 70e fn

---

## component Details.xlsx

### WorkbookPurpose

- Capture engineering metadata, document indexes, or supporting project documents.

### Worksheets

- Details (278 rows, 10 cols)
- Edited (242 rows, 12 cols)

### Header Row

- Details: Tool No | Description | cavity | Material | Component Weight | Volume | Shape | MA | MI | TH
- Edited: Tool No | Description | cavity | Material | Component Weight | Volume | Shape | MA | MI | TH

### Merged Cells

- Details: 0 merged region(s)
- Edited: 0 merged region(s)

### Primary Keys

- Suggested key: file name + row index or section identifier.

### Relationships

- Relate index or document rows to EngineeringDocument and ProjectMaster entities.

### Validation Rules

- Validate key columns such as `S.NO`, `DESCRIPTION`, `PAGE NO`, and `REMARKS` for index sheets.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- This file appears to capture component physical data and materials.

### Target Tables (future)

- `EngineeringDocument`, `DocumentIndex`, `ProjectMaster`

### Unknown Fields

- cavity, component weight, volume, shape, ma, mi, th

---

## FolderList.txt

### WorkbookPurpose

- Capture engineering metadata, document indexes, or supporting project documents.

### Worksheets

- Text file with no worksheets.

### Header Row

- No worksheet headers; text file contains free text or folder list content.

### Merged Cells

- Not applicable.

### Primary Keys

- Suggested key: file name + row index or section identifier.

### Relationships

- Relate index or document rows to EngineeringDocument and ProjectMaster entities.

### Validation Rules

- Validate key columns such as `S.NO`, `DESCRIPTION`, `PAGE NO`, and `REMARKS` for index sheets.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- Review the sample rows for additional engineering context.

### Target Tables (future)

- `EngineeringDocument`, `DocumentIndex`, `ProjectMaster`

### Unknown Fields

- Not applicable for plain text files.

---

## Pasted text(103).txt

### WorkbookPurpose

- Capture engineering metadata, document indexes, or supporting project documents.

### Worksheets

- Text file with no worksheets.

### Header Row

- No worksheet headers; text file contains free text or folder list content.

### Merged Cells

- Not applicable.

### Primary Keys

- Suggested key: file name + row index or section identifier.

### Relationships

- Relate index or document rows to EngineeringDocument and ProjectMaster entities.

### Validation Rules

- Validate key columns such as `S.NO`, `DESCRIPTION`, `PAGE NO`, and `REMARKS` for index sheets.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- Review the sample rows for additional engineering context.

### Target Tables (future)

- `EngineeringDocument`, `DocumentIndex`, `ProjectMaster`

### Unknown Fields

- Not applicable for plain text files.

---

## Pasted text(104).txt

### WorkbookPurpose

- Capture engineering metadata, document indexes, or supporting project documents.

### Worksheets

- Text file with no worksheets.

### Header Row

- No worksheet headers; text file contains free text or folder list content.

### Merged Cells

- Not applicable.

### Primary Keys

- Suggested key: file name + row index or section identifier.

### Relationships

- Relate index or document rows to EngineeringDocument and ProjectMaster entities.

### Validation Rules

- Validate key columns such as `S.NO`, `DESCRIPTION`, `PAGE NO`, and `REMARKS` for index sheets.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- Review the sample rows for additional engineering context.

### Target Tables (future)

- `EngineeringDocument`, `DocumentIndex`, `ProjectMaster`

### Unknown Fields

- Not applicable for plain text files.

---

## Pasted text(105).txt

### WorkbookPurpose

- Capture engineering metadata, document indexes, or supporting project documents.

### Worksheets

- Text file with no worksheets.

### Header Row

- No worksheet headers; text file contains free text or folder list content.

### Merged Cells

- Not applicable.

### Primary Keys

- Suggested key: file name + row index or section identifier.

### Relationships

- Relate index or document rows to EngineeringDocument and ProjectMaster entities.

### Validation Rules

- Validate key columns such as `S.NO`, `DESCRIPTION`, `PAGE NO`, and `REMARKS` for index sheets.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- Review the sample rows for additional engineering context.

### Target Tables (future)

- `EngineeringDocument`, `DocumentIndex`, `ProjectMaster`

### Unknown Fields

- Not applicable for plain text files.

---

## Pasted text(106).txt

### WorkbookPurpose

- Capture engineering metadata, document indexes, or supporting project documents.

### Worksheets

- Text file with no worksheets.

### Header Row

- No worksheet headers; text file contains free text or folder list content.

### Merged Cells

- Not applicable.

### Primary Keys

- Suggested key: file name + row index or section identifier.

### Relationships

- Relate index or document rows to EngineeringDocument and ProjectMaster entities.

### Validation Rules

- Validate key columns such as `S.NO`, `DESCRIPTION`, `PAGE NO`, and `REMARKS` for index sheets.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- Review the sample rows for additional engineering context.

### Target Tables (future)

- `EngineeringDocument`, `DocumentIndex`, `ProjectMaster`

### Unknown Fields

- Not applicable for plain text files.

---

## Pasted text(107).txt

### WorkbookPurpose

- Capture engineering metadata, document indexes, or supporting project documents.

### Worksheets

- Text file with no worksheets.

### Header Row

- No worksheet headers; text file contains free text or folder list content.

### Merged Cells

- Not applicable.

### Primary Keys

- Suggested key: file name + row index or section identifier.

### Relationships

- Relate index or document rows to EngineeringDocument and ProjectMaster entities.

### Validation Rules

- Validate key columns such as `S.NO`, `DESCRIPTION`, `PAGE NO`, and `REMARKS` for index sheets.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- Review the sample rows for additional engineering context.

### Target Tables (future)

- `EngineeringDocument`, `DocumentIndex`, `ProjectMaster`

### Unknown Fields

- Not applicable for plain text files.

---

## Pasted text(108).txt

### WorkbookPurpose

- Capture engineering metadata, document indexes, or supporting project documents.

### Worksheets

- Text file with no worksheets.

### Header Row

- No worksheet headers; text file contains free text or folder list content.

### Merged Cells

- Not applicable.

### Primary Keys

- Suggested key: file name + row index or section identifier.

### Relationships

- Relate index or document rows to EngineeringDocument and ProjectMaster entities.

### Validation Rules

- Validate key columns such as `S.NO`, `DESCRIPTION`, `PAGE NO`, and `REMARKS` for index sheets.

### Revision Fields

- Use file name revision tokens such as `RevA`, `RevB`, `Rev` or other suffixes.
- Preserve revision notes found in headers, summary rows, or title blocks.

### Duplicate Detection

- Detect duplicate project codes, duplicate part lines, and repeated cycle time entries.
- Detect duplicate index entries or repeated document pages within the same workbook.

### Business Notes

- Review the sample rows for additional engineering context.

### Target Tables (future)

- `EngineeringDocument`, `DocumentIndex`, `ProjectMaster`

### Unknown Fields

- Not applicable for plain text files.

---
