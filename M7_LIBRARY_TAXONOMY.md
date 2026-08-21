# M7 — Engineering Knowledge Taxonomy & Classification
## Discovered Domain Taxonomy for PMM Engineering Data
**Vault:** `D:\Mitra3.0\MitraEngineeringLibrary`  
**Classification Standard:** MEKB 24-Entity Relational Model & MITRA Domain Ontology

---

## 1. Project Prefix Taxonomy

The library enforces strict project prefix classification reflecting tooling product types:

| Prefix | Domain | Description | Key Attributes Captured |
| :--- | :--- | :--- | :--- |
| **BM** | Blow Mold | Extrusion & Stretch Blow Molds | Cavitation, Parison length, Pinch width, Scrap chamber (D, Z, F), Cycle time |
| **IM** | Injection Mold | Precision Injection Molds | Cavity/Core inserts, Mold base, Hot runner, Ejector system, Steel grade |
| **IBM** | Injection Blow Mold | Single-stage & Two-stage IBM | Preform tooling, Blow station inserts, Neck Finish (28mm, 38mm) |
| **CMB** | Combined Mold | Multi-part combined tooling | Multi-insert assembly, Interchangeable cavity blocks |
| **PD** | Product Design | New Bottle / Container Design | Volume (ml), Overflow capacity, Brimful, Weight (gm), Wall thickness profile |
| **E** | Enquiry | Pre-sales technical evaluation | RFQ feasibility, Estimated cycle time, Machine clamping force |
| **O** | Orders / Other | Tool modifications & Job works | Refurbishment, Cavity re-machining, Spare inserts |
| **F** | Fixtures | Machining & Quality Fixtures | EDM electrode fixtures, Trimming jigs, CMM inspection fixtures |
| **S** | Samples | Prototype & Pilot Samples | Pilot mold parameters, Initial trial samples |

---

## 2. Document Type Taxonomy

Documents across the library are classified into 8 functional engineering categories:

1. **Part List / Engineering BOM (`part_list`):**
   - Sub-types: Insert & Main Parts, Mask Parts, Mold Base Parts, Standard Parts.
   - Granular Fields: Material, Grade (HOKOTOL, 1.2085, 1.2311), Finished Sizes ($L \times W \times H$), Hardness (HB/HRC), Supplier (MISUMI, Hasco).
2. **Process Planning Sheets (`process_planning`):**
   - Sub-types: 3D Modeling, Mold Base Development, Electrode Extraction, CNC Machining, EDM Wire-cut, Bench Fitting, Polishing, Assembly.
3. **Cycle Time History (`cycle_time_history`):**
   - Sub-types: Machine-specific cycle times (`SPEEDEX`, `SIKA`, `BEKUM`, `AUTOMA`, `ASB`).
   - Granular Fields: Product weight (gm), Total shot weight + flash, Cavitation ($4+4$, $6+6$), Cycle time in seconds.
4. **Tool Index Sheets (`document_index`):**
   - Sub-types: BM Tool Index, Assembly drawing index, Component drawing register.
5. **Component Details (`component_detail`):**
   - Sub-types: Finished core/cavity inserts, wear plates, guide pillars, cooling manifolds.
6. **Technical Specifications (`technical_specification`):**
   - Sub-types: Neck finish dimensions, bottle height, body diameter, pinch-off angles.
7. **Customer Standards:**
   - Sub-types: ALPLA standards, Dabur guidelines, Reckitt/Mortein specifications.
8. **Engineering Notes & Decisions:**
   - Sub-types: DFM recommendations, cooling optimization notes, trial correction logs.
