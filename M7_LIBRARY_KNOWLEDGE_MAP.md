# M7 — Engineering Knowledge Map & Signals
## Domain Signals Discovered in MitraEngineeringLibrary
**Vault:** `D:\Mitra3.0\MitraEngineeringLibrary`  
**Purpose:** Map specific technical engineering rules discovered in data sheets to MITRA AI context signals.

---

## 1. Materials & Heat Treatment Knowledge Signals

| Material / Alloy | Grade | Typical Application | Discovered Hardness / Spec |
| :--- | :--- | :--- | :--- |
| **High-Strength Aluminium** | `HOKOTOL` / `ALUMOLD 500` | Blow Mold Body Inserts, Neck & Pinch Inserts | High thermal conductivity ($150\text{--}170\text{ W/m}\cdot\text{K}$), Hardness ~150 HB |
| **Corrosion-Resistant Steel** | `1.2085` (AISI 420F Mod) | Mold Base Plates, Cooling Blocks, Manifolds | Pre-hardened $280\text{--}325\text{ HB}$ (~$30\text{--}34\text{ HRC}$), Corrosion resistant |
| **Pre-hardened Mold Steel** | `1.2311` / `P20` | Cavity Plates, Backing Plates, Core Plates | $28\text{--}34\text{ HRC}$, Uniform machinability |
| **Hot Work Tool Steel** | `1.2344` (AISI H13) | Pinch Blades, Ejector Pins, Blow Pins | Through-hardened $48\text{--}52\text{ HRC}$, High wear resistance |
| **Copper Beryllium** | `CuBe2` / `MoldMAX` | High-heat Neck Ring Inserts, Pinch Offs | Rapid cooling at pinch zone to prevent parison burn |

---

## 2. Mold Design & Process Planning Knowledge Signals

1. **Cycle Time Benchmark Modeling:**
   - Single cavity 1000ml bottle on `BMU TC`: ~22–26 seconds.
   - 4+4 Cavity 500g Jar on `SPEEDEX`: 18.0 seconds.
   - 6+6 Cavity 30.6g Bottle on `SIKA`: 18.0 seconds.
   - 8-Cavity 400ml Vancouver Bottle on `BMU 70E+`: 14.5–16.0 seconds.
2. **Scrap Chamber & Flash Geometry:**
   - 3-Stage Scrap Chamber depth profiles: Depth ($D$), Width ($Z$), Clearance ($F$).
   - Dedicated base scrap vs neck scrap relief parameters.
3. **Electrode Extraction & EDM:**
   - Roughing spark gap ($0.25\text{ mm}$), Semi-finishing gap ($0.15\text{ mm}$), Finishing spark gap ($0.08\text{ mm}$).
   - Electrode count per cavity: Rib electrodes, logo/emboss electrodes, thread finish electrodes.

---

## 3. Commercial & Standard Parts Signals

- Standard components parsed with supplier part numbers:
  - Dowel Pins: `MS4-25` (MISUMI High Precision $\varnothing 4\text{mm} \times 25\text{mm}$).
  - Guide Bushings & Pillars: `STCW28-125` (MISUMI).
  - Cooling O-rings: Viton heat-resistant seals ($150^\circ\text{C}$ rated).
  - Gas Springs & Ejector Return Pins: Hasco / Fibro standard series.
