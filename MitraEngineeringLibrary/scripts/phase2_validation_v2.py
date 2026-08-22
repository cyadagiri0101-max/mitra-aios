import sys, os, re, json, pandas as pd
from pathlib import Path
from collections import defaultdict, Counter
from datetime import datetime

sys.path.insert(0, "D:/MitraEngineeringLibrary")

from models import SessionLocal
from sqlalchemy import text
from models import (
    ProjectMaster, ProductMaster, BottleFamily, CustomerMaster,
    MachineMaster, MaterialMaster, NeckTypeMaster, CycleTimeHistory,
    ProcessPlanning, PartList, ComponentDetail, DocumentIndex,
    ProjectProductLink, ProjectCustomerLink, ProjectRelationship
)

SOURCE_DIR = Path("D:/Mitra3.0/temp data")
REPORTS_DIR = Path("D:/MitraEngineeringLibrary/docs")

def get_db():
    return SessionLocal()

# ============================================================
# SOURCE-LEVEL CUSTOMER EXTRACTION (Workbook Priority)
# ============================================================

def extract_customer_from_workbook(file_path: Path) -> str:
    """Extract customer from workbook data (highest priority). Only from Partlist TOOL NO headers."""
    if "Partlist" not in file_path.name and "PartList" not in file_path.name and "Part list" not in file_path.name.lower():
        return None
    try:
        xl = pd.ExcelFile(file_path)
        for sheet in xl.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet, header=None)
            for idx, row in df.iterrows():
                for val in row.values:
                    if pd.notna(val) and isinstance(val, str) and "TOOL NO" in val.upper():
                        match = re.search(r"TOOL NO\s*:?\s*([A-Z]+\d+)\s+([A-Za-z]+)", val, re.IGNORECASE)
                        if match:
                            customer = match.group(2)
                            false_positives = {"BLOW", "MOLD", "MOLDS", "CAVITY", "PROCESS", "DATA", "INDEX", "SHEET", "PLANNING", "COMPONENT", "DETAILS", "CYCLE", "TIMES", "ML", "MM", "FN", "STANDARD", "FASTNER", "ELEC", "ELECTRODE", "MAIN", "MASK", "BASE", "PART", "LIST", "REV", "VBL"}
                            if customer.upper() not in false_positives and len(customer) >= 3 and customer.isalpha():
                                return customer
    except Exception:
        pass
    return None

def extract_customer_from_filename(file_path: Path) -> str:
    """Extract customer from filename (lowest priority)."""
    name = file_path.stem
    skip = {"PROCESS", "PLANNING", "SHEET", "INDEX", "BLOW", "MOLDS",
            "CYCLE", "TIMES", "COMPONENT", "DETAILS", "PARTLIST", "PART",
            "LIST", "REV", "MOLD", "CAVITY", "ML", "MM", "MAIN", "MASK",
            "BASE", "STANDARD", "FASTNER", "ELEC", "ELECTRODE", "FN"}
    parts = name.replace("_", " ").split()
    for part in parts[1:]:
        p_upper = part.upper()
        if p_upper in skip or p_upper.startswith("REV") or p_upper.isdigit():
            continue
        if len(part) >= 3 and part.isalpha():
            return part
    return None

# ============================================================
# VALIDATION ENGINE
# ============================================================

class ValidationEngine:
    def __init__(self):
        self.db = get_db()
        self.issues = []
        self.warnings = []
        
    def validate(self):
        results = {}
        results["customer_coverage"] = self._validate_customer_coverage()
        results["project_coverage"] = self._validate_project_coverage()
        results["relationships"] = self._validate_relationships()
        results["source_priority"] = self._validate_source_priority()
        results["import_confidence"] = self._validate_import_confidence()
        return results
    
    def _validate_customer_coverage(self):
        print("\n" + "="*60)
        print("VALIDATING: Customer Coverage")
        print("="*60)
        
        db_customers = self.db.execute(text("SELECT id, customer_code, customer_name FROM customer_master")).fetchall()
        print(f"DB Customers: {len(db_customers)}")
        for c in db_customers:
            print(f"  {c[0]}: {c[1]} = {c[2]}")
        
        workbook_customers = {}
        filename_customers = {}
        
        for f in sorted(SOURCE_DIR.glob("*.xlsx")):
            if f.name.startswith("~"):
                continue
            wb_cust = extract_customer_from_workbook(f)
            fn_cust = extract_customer_from_filename(f)
            if wb_cust:
                workbook_customers[f.name] = wb_cust
            if fn_cust:
                filename_customers[f.name] = fn_cust
        
        print(f"\nWorkbook-level customers (Partlist only): {len(workbook_customers)}")
        for fn, cust in workbook_customers.items():
            print(f"  {fn}: {cust}")
        
        print(f"\nFilename-level customers: {len(filename_customers)}")
        for fn, cust in filename_customers.items():
            print(f"  {fn}: {cust}")
        
        mismatches = []
        for fn in set(workbook_customers.keys()) & set(filename_customers.keys()):
            wb = workbook_customers[fn]
            fn_c = filename_customers[fn]
            if wb.lower() != fn_c.lower():
                mismatches.append((fn, wb, fn_c))
        
        if mismatches:
            print(f"\nMISMATCHES (workbook != filename): {len(mismatches)}")
            for fn, wb, fn_c in mismatches:
                print(f"  {fn}: workbook='{wb}' vs filename='{fn_c}'")
                self.issues.append(f"Customer mismatch: {fn} — workbook='{wb}' vs filename='{fn_c}'")
        
        all_source_customers = {c.upper() for c in set(workbook_customers.values()) | set(filename_customers.values())}
        db_customer_codes = {c[1].upper() for c in db_customers}
        missing = all_source_customers - db_customer_codes
        
        if missing:
            print(f"\nCustomers in source but NOT in DB: {len(missing)}")
            for c in sorted(missing):
                print(f"  MISSING: {c}")
                self.issues.append(f"Customer missing from DB: {c}")
        
        return {
            "db_count": len(db_customers),
            "workbook_customers": workbook_customers,
            "filename_customers": filename_customers,
            "mismatches": len(mismatches),
            "missing_in_db": list(missing),
        }
    
    def _validate_project_coverage(self):
        print("\n" + "="*60)
        print("VALIDATING: Project Coverage")
        print("="*60)
        
        db_projects = self.db.execute(text("SELECT project_number, project_name FROM project_master")).fetchall()
        db_project_nums = {r[0] for r in db_projects}
        print(f"DB Projects: {len(db_project_nums)}")
        
        source_projects = defaultdict(set)
        
        for f in sorted(SOURCE_DIR.glob("*.xlsx")):
            if f.name.startswith("~"):
                continue
            fname = f.name.upper()
            
            if "INDEX SHEET" in fname:
                ftype = "index_sheet"
            elif "PROCESS PLANNING" in fname or "PROCESS PLANNING" in fname:
                ftype = "process_planning"
            elif "PARTLIST" in fname or "PART LIST" in fname:
                ftype = "part_list"
            elif "CYCLE TIMES" in fname:
                ftype = "cycle_times"
            elif "INTERNAL STUDY" in fname:
                ftype = "internal_study"
            elif "COMPONENT" in fname or "COMPONENT DETAILS" in fname:
                ftype = "component_details"
            else:
                continue
            
            matches = re.findall(r"(BM|IM|IBM|PD|CMB|F|S|E|O)(\d+)", fname)
            for prefix, num in matches:
                source_projects[ftype].add(f"{prefix}{num}")
        
        print(f"\nProject coverage by source type:")
        for ftype, projects in sorted(source_projects.items()):
            print(f"  {ftype}: {len(projects)} projects")
        
        all_source_projects = set()
        for projects in source_projects.values():
            all_source_projects.update(projects)
        
        extra_in_db = db_project_nums - all_source_projects
        if extra_in_db:
            print(f"\nProjects in DB but NOT in any source filename: {len(extra_in_db)}")
            print(f"  (These come from workbook data inside Internal Study, Component Details, etc.)")
        
        missing_cross = {}
        for ftype, projects in source_projects.items():
            missing = projects - db_project_nums
            if missing:
                missing_cross[ftype] = missing
        
        if missing_cross:
            print(f"\nMissing cross-references:")
            for ftype, missing in missing_cross.items():
                print(f"  {ftype}: {len(missing)} projects not in DB")
                for p in sorted(missing)[:10]:
                    print(f"    - {p}")
        
        return {
            "db_count": len(db_project_nums),
            "source_types": {k: len(v) for k, v in source_projects.items()},
            "missing_cross_refs": {k: list(v) for k, v in missing_cross.items()},
            "extra_in_db_count": len(extra_in_db),
        }
    
    def _validate_relationships(self):
        print("\n" + "="*60)
        print("VALIDATING: Relationships")
        print("="*60)
        
        projects = self.db.execute(text("SELECT id, project_number FROM project_master")).fetchall()
        missing_relationships = defaultdict(list)
        
        for proj_id, proj_num in projects:
            products = self.db.execute(text(
                "SELECT COUNT(*) FROM product_master WHERE project_id = :pid"
            ), {"pid": proj_id}).scalar()
            if products == 0:
                missing_relationships[proj_num].append("No product linked")
            
            customers = self.db.execute(text(
                "SELECT COUNT(*) FROM project_customer_link WHERE project_id = :pid"
            ), {"pid": proj_id}).scalar()
            if customers == 0:
                missing_relationships[proj_num].append("No customer linked")
            
            machines = self.db.execute(text(
                "SELECT COUNT(DISTINCT machine_id) FROM cycle_time_history WHERE project_id = :pid"
            ), {"pid": proj_id}).scalar()
            if machines == 0:
                missing_relationships[proj_num].append("No machine linked")
            
            materials = self.db.execute(text(
                "SELECT COUNT(*) FROM product_master WHERE project_id = :pid AND material IS NOT NULL"
            ), {"pid": proj_id}).scalar()
            if materials == 0:
                missing_relationships[proj_num].append("No material linked")
            
            capacity = self.db.execute(text(
                "SELECT COUNT(*) FROM product_master WHERE project_id = :pid AND volume_ml IS NOT NULL"
            ), {"pid": proj_id}).scalar()
            if capacity == 0:
                missing_relationships[proj_num].append("No capacity/volume linked")
            
            cavitation = self.db.execute(text(
                "SELECT COUNT(*) FROM cycle_time_history WHERE project_id = :pid AND cavitation IS NOT NULL"
            ), {"pid": proj_id}).scalar()
            if cavitation == 0:
                missing_relationships[proj_num].append("No cavitation linked")
            
            documents = self.db.execute(text(
                "SELECT COUNT(*) FROM document_index WHERE project_id = :pid"
            ), {"pid": proj_id}).scalar()
            parts = self.db.execute(text(
                "SELECT COUNT(*) FROM part_list WHERE project_id = :pid"
            ), {"pid": proj_id}).scalar()
            if documents == 0 and parts == 0:
                missing_relationships[proj_num].append("No documents or parts")
            
            if len(missing_relationships[proj_num]) >= 3:
                self.warnings.append(f"{proj_num}: {', '.join(missing_relationships[proj_num])}")
        
        print(f"\nProjects with missing relationships: {len(missing_relationships)}")
        
        rel_counts = Counter()
        for proj, issues in missing_relationships.items():
            for issue in issues:
                rel_counts[issue] += 1
        
        print(f"\nMissing relationship breakdown:")
        for issue, count in rel_counts.most_common():
            print(f"  {issue}: {count} projects")
        
        return {
            "total_projects": len(projects),
            "projects_with_issues": len(missing_relationships),
            "breakdown": dict(rel_counts),
        }
    
    def _validate_source_priority(self):
        print("\n" + "="*60)
        print("VALIDATING: Source Priority")
        print("="*60)
        
        violations = []
        for f in sorted(SOURCE_DIR.glob("*.xlsx")):
            if f.name.startswith("~"):
                continue
            if "Partlist" not in f.name and "PartList" not in f.name:
                continue
            
            wb_cust = extract_customer_from_workbook(f)
            fn_cust = extract_customer_from_filename(f)
            
            if wb_cust and fn_cust and wb_cust.lower() != fn_cust.lower():
                violations.append({
                    "file": f.name,
                    "workbook_customer": wb_cust,
                    "filename_customer": fn_cust,
                    "issue": "Workbook customer != filename customer"
                })
            elif wb_cust and not fn_cust:
                violations.append({
                    "file": f.name,
                    "workbook_customer": wb_cust,
                    "filename_customer": None,
                    "issue": "Customer in workbook but not in filename"
                })
        
        print(f"Source priority violations: {len(violations)}")
        for v in violations:
            print(f"  {v['file']}: {v['issue']}")
        
        return {
            "violations": violations,
            "violation_count": len(violations),
        }
    
    def _validate_import_confidence(self):
        print("\n" + "="*60)
        print("VALIDATING: Import Confidence")
        print("="*60)
        
        tables = [
            ("project_master", ["project_number", "project_prefix", "project_name"], 3),
            ("product_master", ["product_name", "volume_ml", "weight_gm", "material", "shape"], 5),
            ("cycle_time_history", ["project_id", "product_name", "cavitation", "cycle_time_sec"], 4),
            ("process_planning", ["project_id", "step_name", "step_category", "status"], 4),
            ("part_list", ["project_id", "part_category", "description", "material"], 4),
            ("component_detail", ["project_id", "tool_no", "description", "material"], 4),
        ]
        
        confidence_scores = {}
        for table, fields, total in tables:
            count = self.db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            if count == 0:
                continue
            
            total_filled = 0
            for field in fields:
                filled = self.db.execute(text(f"SELECT COUNT(*) FROM {table} WHERE {field} IS NOT NULL")).scalar()
                total_filled += filled
            
            score = total_filled / (count * total) * 100
            confidence_scores[table] = round(score, 1)
            print(f"  {table}: {score:.1f}% confidence ({count} records)")
        
        return confidence_scores
    
    def generate_reports(self, results):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # 1. CustomerCoverageReport.md
        cc = results["customer_coverage"]
        content = "# Customer Coverage Report\n**Date:** " + timestamp + "\n\n"
        content += "## Source Priority Rules\n1. **Workbook data** (highest priority)\n2. **Folder name** (medium priority)\n3. **Filename** (lowest priority)\n\n"
        content += "## 1.1 Customers in Database\nTotal: " + str(cc['db_count']) + "\n\n"
        content += "## 1.2 Customers Detected from Workbooks (Partlist only)\n"
        for fn, cust in cc["workbook_customers"].items():
            content += f"- `{fn}`: **{cust}**\n"
        content += "\n## 1.3 Customers Detected from Filenames\n"
        for fn, cust in cc["filename_customers"].items():
            content += f"- `{fn}`: **{cust}**\n"
        if cc['mismatches'] > 0:
            content += "\n## 1.4 Mismatches (Workbook vs Filename)\nTotal: " + str(cc['mismatches']) + "\n"
        if cc['missing_in_db']:
            content += "\n## 1.5 Customers Missing from Database\n"
            for c in cc['missing_in_db']:
                content += f"- {c}\n"
        content += "\n## 1.6 Defects\n- Parser updated to read workbook-level TOOL NO headers for customer extraction.\n- Filename remains as fallback only.\n"
        (REPORTS_DIR / "CustomerCoverageReport.md").write_text(content, encoding="utf-8")
        
        # 2. ProjectCoverageReport.md
        pc = results["project_coverage"]
        content = "# Project Coverage Report\n**Date:** " + timestamp + "\n\n"
        content += "## 2.1 Projects in Database\nTotal: " + str(pc['db_count']) + "\n\n"
        content += "## 2.2 Projects by Source Type\n"
        for ftype, count in pc["source_types"].items():
            content += f"- {ftype}: {count} projects\n"
        if pc['missing_cross_refs']:
            content += "\n## 2.3 Missing Cross-References\n"
            for ftype, missing in pc['missing_cross_refs'].items():
                content += f"- {ftype}: {len(missing)} projects not in DB\n"
        if pc['extra_in_db_count'] > 0:
            content += "\n## 2.4 Projects in DB but Not in Source Filenames\n"
            content += f"- {pc['extra_in_db_count']} projects from workbook data (Internal Study, Component Details)\n"
        (REPORTS_DIR / "ProjectCoverageReport.md").write_text(content, encoding="utf-8")
        
        # 3. RelationshipValidation.md
        rv = results["relationships"]
        content = "# Relationship Validation Report\n**Date:** " + timestamp + "\n\n"
        content += "## 3.1 Validation Chain\nProject → Product → Customer → Machine → Material → Capacity → Neck Type → Cavitation → Documents\n\n"
        content += "## 3.2 Summary\n- Total projects: " + str(rv['total_projects']) + "\n"
        content += "- Projects with missing relationships: " + str(rv['projects_with_issues']) + "\n\n"
        content += "## 3.3 Missing Relationship Breakdown\n"
        for issue, count in rv["breakdown"].items():
            content += f"- {issue}: {count} projects\n"
        (REPORTS_DIR / "RelationshipValidation.md").write_text(content, encoding="utf-8")
        
        # 4. SourcePriorityValidation.md
        sp = results["source_priority"]
        content = "# Source Priority Validation Report\n**Date:** " + timestamp + "\n\n"
        content += "## 4.1 Priority Rules\n1. Workbook data (highest)\n2. Folder name (medium)\n3. Filename (lowest)\n\n"
        content += "## 4.2 Violations\nTotal: " + str(sp['violation_count']) + "\n"
        for v in sp["violations"]:
            content += f"\n- **File:** `{v['file']}`\n"
            content += f"  - Workbook customer: {v['workbook_customer']}\n"
            content += f"  - Filename customer: {v['filename_customer']}\n"
            content += f"  - Issue: {v['issue']}\n"
        if sp['violation_count'] == 0:
            content += "\nNo violations found. All workbook customers match filename customers or are derived from workbook-only sources.\n"
        (REPORTS_DIR / "SourcePriorityValidation.md").write_text(content, encoding="utf-8")
        
        # 5. ImportConfidenceReport.md
        ic = results["import_confidence"]
        content = "# Import Confidence Report\n**Date:** " + timestamp + "\n\n"
        content += "## 5.1 Confidence by Table\nConfidence = (filled fields / total expected fields) x 100\n\n| Table | Confidence | Status |\n|-------|-----------|--------|\n"
        for table, score in ic.items():
            status = "HIGH" if score >= 80 else "MEDIUM" if score >= 50 else "LOW"
            content += f"| {table} | {score}% | {status} |\n"
        content += "\n## 5.2 Recommendations\n- LOW confidence tables need parser improvements.\n- MEDIUM confidence tables need NULL handling.\n- HIGH confidence tables are production-ready.\n"
        (REPORTS_DIR / "ImportConfidenceReport.md").write_text(content, encoding="utf-8")
        
        print(f"\nAll 5 reports written to {REPORTS_DIR}")


if __name__ == "__main__":
    engine = ValidationEngine()
    results = engine.validate()
    engine.generate_reports(results)
    
    print("\n" + "="*60)
    print("VALIDATION SUMMARY")
    print("="*60)
    print(f"Issues: {len(engine.issues)}")
    print(f"Warnings: {len(engine.warnings)}")
    for issue in engine.issues[:10]:
        print(f"  ISSUE: {issue}")
    for warning in engine.warnings[:10]:
        print(f"  WARNING: {warning}")
