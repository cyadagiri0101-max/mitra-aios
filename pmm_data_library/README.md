# PMM Data Library

**Prathiraj Metal Masters — Master Data Library**

A reusable Python data-access layer for Blow Mold (BM) and Injection Mold (IM) project data, consolidated from multiple Excel files prepared by different teams across different time periods.

---

## 📦 What's Inside

| Component | Records | Description |
|-----------|---------|-------------|
| `blow_molds` | 1,142 | Blow mold projects with costing, materials, status |
| `injection_molds` | 127 | Injection mold projects with customer & dispatch info |
| `job_works` | 517 | Job works, spare parts, and service tool records |
| `alpla_std_parts` | 91 | ALPLA standard parts tracking |
| `commercial_molds` | 115 | Commercial mold base details |
| `part_list_summaries` | 8 | Part list cost summaries (BM450, BM458, BM475) |
| `part_list_details` | 712 | Individual part records with material, qty, rate, amount |

---

## 🔧 Installation (into your VS Code project)

1. Copy the entire `pmm_data_library/` folder into your project root.
2. Ensure `pmm_database.db` is present in the same folder.

```
your-project/
├── pmm_data_library/
│   ├── __init__.py
│   ├── db.py
│   ├── models.py
│   ├── utils.py
│   ├── setup_db.py
│   └── pmm_database.db
└── your_app.py
```

---

## 🚀 Quick Start

```python
from pmm_data_library import BlowMoldDB, InjectionMoldDB, MasterDataDB

# --- Blow Molds ---
db = BlowMoldDB()

# All blow molds
all_molds = db.get_all()

# Find by project number (BMXXX format)
mold = db.get_by_project_no("BM243")

# Search by customer
alpla_molds = db.search_by_customer("ALPLA")

# Search by machine platform
seb101 = db.search_by_machine("SEB101")

# Filter by status
dispatched = db.get_by_status("Dispatched")

# --- Injection Molds ---
im_db = InjectionMoldDB()
im_all = im_db.get_all()
im_035 = im_db.get_by_project_no("IM035")

# --- Part Lists ---
pls_db = PartListSummaryDB()
pls_all = pls_db.get_all()  # 8 cost summaries
bm475_costs = pls_db.get_by_project("BM475")

pld_db = PartListDetailDB()
all_parts = pld_db.get_all()  # 712 individual parts
bm475_parts = pld_db.get_by_project("BM475")  # 237 parts
mask_parts = pld_db.search_by_category("Mask")  # Filter by category

# --- Master Overview ---
master = MasterDataDB()
print(master.stats())
# {'blow_molds': 1142, 'injection_molds': 127, 'job_works': 517, ...}

# Cross-table search
results = master.find_project("BM475")
# Returns matching records from blow_molds, injection_molds, alpla_std_parts, part_list_summaries, part_list_details
```
```

---

## 🔢 Normalization Rules

| Original | Normalized | Type | Example |
|----------|------------|------|---------|
| `M-xxx` | `BMxxx` | Blow Mold (early) | `M-15` → `BM015` |
| `BM-xxx` | `BMxxx` | Blow Mold (current) | `BM-243` → `BM243` |
| `T-xxxx` | `T-xxxx` | Blow Mold (legacy) | `T-1147` kept as-is |
| `IM-xx` | `IMxxx` | Injection Mold | `IM-8` → `IM008`, `IM-35` → `IM035` |
| `CMB-xx` | `CMBxxx` | Commercial Mold Base | kept as-is |
| `S-xx` | `S-xx` | Job Work / Spare | kept as-is |

---

## 🗃️ Database Rebuild

If you update the Excel master file, rebuild the SQLite database:

```bash
cd pmm_data_library
python setup_db.py
# Or with custom path:
python setup_db.py --excel ../PMM_Master_Data_Library.xlsx --db pmm_database.db
```

---

## 📋 Models

### `BlowMold`
- `original_tool_no` — raw tool number from source
- `normalized_project_no` — `BMXXX` format
- `project_type` — "BM"
- `description`, `cavity`, `machine`, `volume`, `neck_type`
- `end_customer`, `neck_material`, `body_material`, `base_material`
- `inserts_cost`, `mask_parts_cost`, `mold_base_cost`, `std_part_cost`, `fasteners_cost`, `elec_cost`, `alpla_std_parts`, `wooden_box`, `total_cost`
- `status`, `source_file`, `source_sheet`

### `InjectionMold`
- `original_tool_no`, `normalized_project_no` (`IMXXX`)
- `description`, `end_customer`, `status`, `mold_dispatch_date`

### `JobWork`
- `job_no`, `description`, `project_description`, `status`

### `ALPLAStdPart`
- `original_tool_no`, `normalized_project_no`, `m_c_plat_form`, `neck_type`
- `std_parts_status`, `mold_status`, `po_number`, `po_release_date`, `alpla_quote_no`, `remarks`

### `CommercialMold`
- `prathiraj_mold_no`, `customer_mold_no`, `supplied_to`, `description`

### `PartListSummary`
- `project_no`, `revision`, `file_path`
- `inserts_cost`, `mask_parts_cost`, `mold_base_cost`
- `standard_parts_cost`, `fasteners_cost`, `electrodes_cost`, `total_cost`

### `PartListDetail`
- `project_no`, `revision`, `part_category` (Mold_and_Mask_Parts, Mold_Base_Parts, Standard_Parts, Fasteners, Electrodes)
- `description`, `material`, `quantity`, `rate`, `amount`
- `source_file`, `source_sheet`

---

## 📁 Source Files Consolidated

| Source | Location | Content |
|--------|----------|---------|
| Desktop Costing | `Desktop\1_Blow_Mold_Costing.xlsx` | Detailed blow mold costing |
| Y: Costing | `Y:\Blow Molds\1_Blow_Mold_Costing.xlsx` | Historical blow mold costing |
| Costing History | `Y:\Blow Molds\Blow_Mold_Costing History_2.xlsx` | By neck type (Lost/Flash/Captured) |
| Project Status | `Y:\Blow Molds\012_Project Status_Blow_Molds.xlsx` | Year-wise project status |
| Tool Numbers | `Y:\Blow Molds\Blow_Molds_Tool_No's.xlsx` | Tool registry, job works, STD parts |
| Network Drive Folders | `Y:\Blow Molds - Design Data\BM301-BM500` | 178 new project folders (BM301–BM479) added from folder names |
| Part Lists BM475 | `Y:\Blow Molds\BM451-BM500\BM475\Partlist\` | RevA & RevB part lists |
| Part Lists BM458 | `Y:\Blow Molds\BM451-BM500\BM458\Partlist\` | RevA & no-rev part lists |
| Part Lists BM450 | `Y:\Blow Molds\BM401-BM450\BM450\Partlist\` | RevA, RevB, RevC & no-rev part lists |
| All-in-One | `Z:\Laptop Backup\011_Prathiraj_...` | Master history: BM, IM, jobs, commercial |

---

## 📄 License

Internal use only — Prathiraj Metal Masters Pvt Ltd.
