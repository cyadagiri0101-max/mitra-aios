# M7 — AI Question Evaluation Set (50 Golden Engineering Questions)
## Benchmark Test Suite for G13 Grounded Retrieval & Citation Certification
**Evaluation Scope:** 50 Real Engineering Questions derived from `MitraEngineeringLibrary`  
**Grounding Standard:** 100% of answers must cite exact document + sheet/row or trigger honest insufficiency advisory.

---

## Question Evaluation Matrix (50 Questions)

| # | Category | Question | Expected Authoritative Source | Required Citation Fields | Hallucination Failure Condition |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Material | What steel grade is used for cooling blocks in BM454? | `BM454 Partlist_RevA.xlsx` (Mold Base Parts) | File, Sheet, Row (`1.2085 Steel`) | Citing generic P20 or unlisted steel |
| **2** | Material | Which aluminium alloy is specified for BM454 body inserts? | `BM454 Partlist_RevA.xlsx` (Inserts) | File, Sheet, Row (`HOKOTOL / ALUMOLD 1-500`) | Citing generic 6061 aluminium |
| **3** | Material | What is the hardness specification for pre-hardened 1.2085? | `EngineeringDataDictionary.md` | Doc, Section (`280-325 HB`) | Specifying 50+ HRC |
| **4** | Material | When is Beryllium Copper (CuBe2) used in blow molds? | `EngineeringNamingConvention.md` | Doc, Section (Pinch zone cooling) | Claiming structural mold base use |
| **5** | Material | What material is specified for dowel pins MS4-25? | `BM454 Partlist_RevA.xlsx` (Standard Parts) | File, Sheet, Part No (`High precision STD`) | Inventing custom machine grade |
| **6** | Mold Design | What is the cavitation for BM454 Veedol 600ml mold? | `BM454 Partlist_RevA.xlsx` | Title, Sheet (`8-Cavity`) | Guessing 2 or 4 cavities |
| **7** | Mold Design | What machine is BM454 designed for? | `BM454 Partlist_RevA.xlsx` | Title (`SEB101 FN`) | Naming incorrect machine |
| **8** | Mold Design | What are the finished dimensions of BM454 body insert? | `BM454 Partlist_RevA.xlsx` | File, Sheet, Dim (`1230 x 135 x 40 mm`) | Fabricating arbitrary dimensions |
| **9** | Mold Design | What is the total cost of inserts in BM454 Partlist RevA? | `BM454 Partlist_RevA.xlsx` (COST-SUMMARY) | Sheet, Amount (`Rs. 542,517.72`) | Guessing estimated pricing |
| **10**| Mold Design | What is the scrap chamber depth profile notation? | `excel_files_structure_report.md` | Doc, Section (`D, Z, F`) | Naming standard ISO roughness |
| **11**| Cycle Time | What is the cycle time for a 13.5g bottle on SPEEDEX machine?| `029_Blow Molds Cycle Times.xlsx` | File, Row (`18 Sec, 4+4 Cav`) | Claiming 10s or 30s |
| **12**| Cycle Time | What is the running cycle time for Bahubali 400ml on SIKA? | `029_Blow Molds Cycle Times.xlsx` | File, Row (`18.0 sec, 30.6g, 6+6 Cav`) | Stating inaccurate cycle time |
| **13**| Cycle Time | How does cavitation affect blow mold cycle time in MEKB? | `cycle_time_history` table in SQLite | Table, Stats (Empirical records) | Theoretical formula without citing data |
| **14**| Planning | What are the main stages in BM377 Process Planning sheet? | `BM377 Process planning sheet.xlsx` | File, Stage list (3D modeling, Mold Dev, Electrodes, Machining) | Omitting electrode extraction |
| **15**| Planning | What is the first operation in BM mold development planning?| `BM377 Process planning sheet.xlsx` | File, Step (`3D modeling`) | Stating raw material purchase first |
| **16**| Planning | How many process planning steps exist for BM476? | `mekb.sqlite` / `process_planning` | Table, Row count (`290 steps`) | Stating unverified estimate |
| **17**| Planning | Which department performs electrode extraction? | `EngineeringDataDictionary.md` | Doc, Dept (`Design / CAD-CAM`) | Attributing to tool assembly |
| **18**| Standard Parts| Who is the supplier for dowel pin MS4-25? | `BM454 Partlist_RevA.xlsx` | File, Supplier (`MISUMI`) | Naming DME or Hasco |
| **19**| Standard Parts| What part type code is used for standard guide pins? | `BM454 Partlist_RevA.xlsx` | Part Type (`STD`) | Calling it custom insert |
| **20**| Standard Parts| What is the quantity of MS4-25 dowel pins on BM454? | `BM454 Partlist_RevA.xlsx` | Qty (`140 pcs`) | Fabricating count |
| **21**| Projects | What customer owns project BM473 (Fabric Care 1000ml)? | `PL.xlsx` (Design sheet) | File, Sheet, Customer (`ALPLA`) | Guessing Unilever or P&G |
| **22**| Projects | What customer is associated with BM472 Vision 725ml? | `PL.xlsx` (Design sheet) | File, Sheet, Customer (`CREATIVE`) | Naming ALPLA |
| **23**| Projects | What is the cavitation of BM471 60ml CN Bottle? | `PL.xlsx` (Design sheet) | File, Cavitation (`10+10 Cavity`) | Stating 8-cavity |
| **24**| Projects | What resin is used for BM470 Milk 1000ml bottle? | `PL.xlsx` (Design sheet) | File, Material (`HDPE`) | Saying PET or PP |
| **25**| Projects | Which customer ordered BM468 BV JAR 500g? | `PL.xlsx` (Design sheet) | File, Customer (`ALTERNICQ`) | Saying Dabur |
| **26**| Projects | What machine is BM468 designed for? | `PL.xlsx` (Design sheet) | File, Machine (`Speedex LH MTL`) | Guessing Bekum |
| **27**| Projects | How many total unique projects exist in MEKB database? | `mekb.sqlite` (`project_master`) | Count (`281 projects`) | Citing unverified numbers |
| **28**| Index Sheet | What is page 1 in BM-454 Index Sheet? | `BM-454 INDEX SHEET.xlsx` | File, Page (`Main Parts & Mask Parts`) | Saying Assembly drawing |
| **29**| Index Sheet | What is page 2 in BM-454 Index Sheet? | `BM-454 INDEX SHEET.xlsx` | File, Page (`Mold Base Parts`) | Saying Standard Parts |
| **30**| Index Sheet | What does a BM Index Sheet contain? | `docs/data_dictionary.md` | Doc, Definition (Drawing & Part register) | Describing commercial invoice |
| **31**| Components | How many component details are cataloged in MEKB? | `mekb.sqlite` (`component_detail`) | Count (`516 components`) | Guessing 100 or 1000 |
| **32**| Components | What is the prefix for Injection Blow Mold projects? | `ProjectPrefixRules.md` | Rule (`IBM`) | Calling it INJ-BLOW |
| **33**| Components | What does prefix CMB designate? | `ProjectPrefixRules.md` | Rule (`Combined Mold`) | Calling it Commercial Mold |
| **34**| Quality | What criteria define a complete project folder in MEKB? | `FolderStructureAnalysis.md` | Rule (Partlist + Planning + Index) | Claiming drawing alone is enough |
| **35**| Quality | What is the validation rule for project code format? | `ValidationRules.md` | Regex (`^(BM\|IM\|IBM\|PD\|E\|O\|CMB\|F\|S)\d+`) | Allowing arbitrary strings |
| **36**| Quality | Where are validation reports exported in MEKB? | `exports/` directory | Path (`exports/*.html`) | Pointing to backend database |
| **37**| Standards | What neck finish finish diameter is standard for 600ml oil? | `Blow Molds Data for Internal Study.xlsx` | Neck size (mm) | Hallucinating beverage 28mm |
| **38**| Standards | What resin is evaluated in Blow Mold Internal Study? | `Blow Molds Data for Internal Study_RevA.xlsx` | Resin column (HDPE / PP) | Stating Polycarbonate |
| **39**| Standards | What is the pinch off blade angle recommendation? | `EngineeringDataDictionary.md` | Doc, Angle ($30^\circ\text{--}45^\circ$) | Recommending $90^\circ$ flat |
| **40**| Standards | What supplier supplies guide pillars STCW28-125? | `BM454 Partlist_RevA.xlsx` | Supplier (`MISUMI`) | Stating Local Job Work |
| **41**| Historical | What was the row count of BM454 Partlist RevA vs base? | `excel_files_structure_report.md` | 230 rows vs 115 rows | Treating both as identical |
| **42**| Historical | What is the tool number for Veedol 600ml mold? | `BM454 Partlist_RevA.xlsx` | Tool No (`BM454`) | Saying BM-VEEDOL |
| **43**| Historical | What product weight is recorded for Revital bottle in BM248?| `Blow Molds Data for Internal Study.xlsx` | Row, Weight (gm) | Inventing weight |
| **44**| Historical | Which project prefix is used for Enquiry feasibility? | `ProjectPrefixRules.md` | Prefix (`E`) | Saying ENQ |
| **45**| Historical | Which project prefix represents Product Design? | `ProjectPrefixRules.md` | Prefix (`PD`) | Saying PROD |
| **46**| Insufficiency | What is the laser welding parameter for titanium inserts? | None (Not in library) | Insufficiency advisory | Hallucinating laser wattage |
| **47**| Insufficiency | What is the 5-axis CNC feed rate for inconel turbine blades?| None (Not in library) | Insufficiency advisory | Hallucinating feed rate |
| **48**| Insufficiency | What is the supplier price of DME hot runner manifold 2026?| None (Not in library) | Insufficiency advisory | Hallucinating pricing |
| **49**| Insufficiency | What is the chemical formula of custom color masterbatch? | None (Not in library) | Insufficiency advisory | Hallucinating chemistry |
| **50**| Insufficiency | Who was the forklift driver for BM454 dispatch? | None (Not in library) | Insufficiency advisory | Hallucinating staff names |
