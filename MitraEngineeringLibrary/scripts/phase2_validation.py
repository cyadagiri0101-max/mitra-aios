"""Phase 2 Validation Engine — Comprehensive MEKB Data Hardening."""
import sys, re, json, pandas as pd
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

# ============================================================
# Configuration
# ============================================================
SOURCE_DIR = Path("D:/Mitra3.0/temp data")
REPORTS_DIR = Path("D:/MitraEngineeringLibrary/docs")

def get_db():
    return SessionLocal()

# ============================================================
# 1. SOURCE-LEVEL CUSTOMER EXTRACTION (Workbook Priority)
# ============================================================

def extract_customer_from_workbook(file_path: Path) -> str:
    """Extract customer from workbook data (highest priority). Only from TOOL NO headers."""
    try:
        xl = pd.ExcelFile(file_path)
        for sheet in xl.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet, header=None)
            # Look specifically for "TOOL NO" header row — the actual workbook-level customer data
            for idx, row in df.iterrows():
                for val in row.values:
                    if pd.notna(val) and isinstance(val, str) and "TOOL NO" in val.upper():
                        # Parse: "TOOL NO :BM454 Veedol 600ml M01 08Cavity Mold SEB101 FN"
                        # Extract: project number, then customer name
                        match = re.search(r"TOOL NO\s*:?\s*([A-Z]+\d+)\s+([A-Za-z]+)", val, re.IGNORECASE)
                        if match:
                            customer = match.group(2)
                            # Filter out false positives
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

def extract_bottle_family_and_variant(file_path: Path) -> tuple:
    """Extract bottle family and product variant from filename."""
    name = file_path.stem
    # Example: "BM454 Veedol 600ml M01 08Cavity Mold SEB101 FN"
    # Bottle Family = Veedol, Product Variant = 600ml
    parts = name.replace("_", " ").split()
    
    family = None
    variant = None
    
    for i, part in enumerate(parts[1:], 1):
        p_upper = part.upper()
        # Skip known non-family tokens
        skip = {"PROCESS", "PLANNING", "SHEET", "INDEX", "BLOW", "MOLDS",
                "CYCLE", "TIMES", "COMPONENT", "DETAILS", "PARTLIST", "PART",
                "LIST", "REV", "MOLD", "CAVITY", "ML", "MM", "MAIN", "MASK",
                "BASE", "STANDARD", "FASTNER", "ELEC", "ELECTRODE", "FN",
                "M01", "M02", "M03", "MOLD", "SEB101", "SEB", "SSB", "BMU"}
        if p_upper in skip or p_upper.startswith("REV") or p_upper.isdigit():
            continue
        # Family is first alphabetic token after project number
        if family is None and len(part) >= 3 and part.isalpha():
            family = part
            continue
        # Variant is the next token (usually contains ml or is a number)
        if family and variant is None:
            if any(x in part.lower() for x in ["ml", "cc", "g", "gm"]):
                variant = part
                break
            if part.isdigit() or (part.replace(".", "").isdigit()):
                variant = part
                break
    
    return family, variant

# ============================================================
# 2. VALIDATION ENGINE
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
        """Validate customer detection across all sources."""
        print("\n" + "="*60)
        print("VALIDATING: Customer Coverage")
        print("="*60)
        
        db_customers = self.db.execute(text("SELECT id, customer_code, customer_name FROM customer_master")).fetchall()
        print(f"DB Customers: {len(db_customers)}")
        for c in db_customers:
            print(f"  {c[0]}: {c[1]} = {c[2]}")
        
        # Extract customers from all source files
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
        
        print(f"\nWorkbook-level customers: {len(workbook_customers)}")
        for fn, cust in workbook_customers.items():
            print(f"  {fn}: {cust}")
        
        print(f"\nFilename-level customers: {len(filename_customers)}")
        for fn, cust in filename_customers.items():
            print(f"  {fn}: {cust}")
        
        # Check for mismatches
        mismatches = []
        for fn in set(workbook_customers.keys()) | set(filename_customers.keys()):
            wb = workbook_customers.get(fn)
            fn_c = filename_customers.get(fn)
            if wb and fn_c and wb.lower() != fn_c.lower():
                mismatches.append((fn, wb, fn_c))
        
        if mismatches:
            print(f"\nMISMATCHES (workbook != filename): {len(mismatches)}")
            for fn, wb, fn_c in mismatches:
                print(f"  {fn}: workbook='{wb}' vs filename='{fn_c}'")
                self.issues.append(f"Customer mismatch: {fn} — workbook='{wb}' vs filename='{fn_c}'")
        
        # Customers missing from DB
        all_source_customers = set(workbook_customers.values()) | set(filename_customers.values())
        db_customer_codes = {c[1].upper() for c in db_customers}
        missing = all_source_customers - db_customer_codes
        
        if missing:
            print(f"\nCustomers in source but NOT in DB: {len(missing)}")
            for c in missing:
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
        """Cross-validate every project against all source types."""
        print("\n" + "="*60)
        print("VALIDATING: Project Coverage")
        print("="*60)
        
        # Get all DB projects
        db_projects = self.db.execute(text("SELECT project_number, project_name FROM project_master")).fetchall()
        db_project_nums = {r[0] for r in db_projects}
        print(f"DB Projects: {len(db_project_nums)}")
        
        # Extract projects from each source file type
        source_projects = defaultdict(set)
        
        for f in sorted(SOURCE_DIR.glob("*.xlsx")):
            if f.name.startswith("~"):
                continue
            fname = f.name.upper()
            
            # Classify by file type
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
            
            # Extract project numbers from filename
            matches = re.findall(r"(BM|IM|IBM|PD|CMB|F|S|E|O)(\d+)", fname)
            for prefix, num in matches:
                source_projects[ftype].add(f"{prefix}{num}")
        
        # Report coverage per source type
        print(f"\nProject coverage by source type:")
        for ftype, projects in sorted(source_projects.items()):
            print(f"  {ftype}: {len(projects)} projects")
        
        # Check which projects exist in DB but not in sources
        all_source_projects = set()
        for projects in source_projects.values():
            all_source_projects.update(projects)
        
        extra_in_db = db_project_nums - all_source_projects
        if extra_in_db:
            print(f"\nProjects in DB but NOT in any source: {len(extra_in_db)}")
            for p in sorted(extra_in_db)[:20]:
                print(f"  EXTRA: {p}")
        
        # Check for missing cross-references
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
            "extra_in_db": list(extra_in_db),
        }
    
    def _validate_relationships(self):
        """Validate: Project → Product → Customer → Machine → Material → Capacity → Neck Type → Cavitation → Documents."""
        print("\n" + "="*60)
        print("VALIDATING: Relationships")
        print("="*60)
        
        # Get all projects
        projects = self.db.execute(text("SELECT id, project_number FROM project_master")).fetchall()
        
        missing_relationships = defaultdict(list)
        
        for proj_id, proj_num in projects:
            # Project → Product
            products = self.db.execute(text("SELECT COUNT(*) FROM product_master WHERE project_id = :pid"), {"pid": proj_id}).scalar()
            if products == 0:
                # Check via link table
                products = self.db.execute(text(
                    "SELECT COUNT(*) FROM project_product_link WHERE project_id = :pid"
                ), {"pid": proj_id}).scalar()
            if products == 0:
                missing_relationships[proj_num].append("No product linked")
            
            # Project → Customer
            customers = self.db.execute(text(
                "SELECT COUNT(*) FROM project_customer_link WHERE project_id = :pid"
            ), {"pid": proj_id}).scalar()
            if customers == 0:
                missing_relationships[proj_num].append("No customer linked")
            
            # Project → Machine (via cycle time)
            machines = self.db.execute(text(
                "SELECT COUNT(DISTINCT machine_id) FROM cycle_time_history WHERE project_id = :pid"
            ), {"pid": proj_id}).scalar()
            
            # Project → Material (via product_master)
            materials = self.db.execute(text(
                "SELECT COUNT(*) FROM product_master WHERE project_id = :pid AND material IS NOT NULL"
            ), {"pid": proj_id}).scalar()
            if materials == 0:
                missing_relationships[proj_num].append("No material linked")
            
            # Project → Capacity (volume from product_master)
            capacity = self.db.execute(text(
                "SELECT COUNT(*) FROM product_master WHERE project_id = :pid AND volume_ml IS NOT NULL"
            ), {"pid": proj_id}).scalar()
            if capacity == 0:
                missing_relationships[proj_num].append("No capacity/volume linked")
            
            # Project → Cavitation (via cycle time)
            cavitation = self.db.execute(text(
                "SELECT COUNT(*) FROM cycle_time_history WHERE project_id = :pid AND cavitation IS NOT NULL"
            ), {"pid": proj_id}).scalar()
            
            # Project → Documents (via index or part list)
            documents = self.db.execute(text(
                "SELECT COUNT(*) FROM document_index WHERE project_id = :pid"
            ), {"pid": proj_id}).scalar()
            parts = self.db.execute(text(
                "SELECT COUNT(*) FROM part_list WHERE project_id = :pid"
            ), {"pid": proj_id}).scalar()
            if documents == 0 and parts == 0:
                missing_relationships[proj_num].append("No documents or parts")
            
            # Report only projects with multiple missing relationships
            if len(missing_relationships[proj_num]) >= 3:
                self.warnings.append(f"{proj_num}: {', '.join(missing_relationships[proj_num])}")
        
        # Summary
        print(f"\nProjects with missing relationships: {len(missing_relationships)}")
        
        # Count by relationship type
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
        """Validate source priority rules: Workbook > Folder > Filename."""
        print("\n" + "="*60)
        print("VALIDATING: Source Priority")
        print("="*60)
        
        violations = []
        
        # Check each Part List file
        for f in sorted(SOURCE_DIR.glob("*.xlsx")):
            if f.name.startswith("~"):
                continue
            if "Partlist" not in f.name and "PartList" not in f.name:
                continue
            
            wb_cust = extract_customer_from_workbook(f)
            fn_cust = extract_customer_from_filename(f)
            
            # Rule: If workbook has customer, it must match filename or be used
            if wb_cust and fn_cust and wb_cust.lower() != fn_cust.lower():
                violations.append({
                    "file": f.name,
                    "workbook_customer": wb_cust,
                    "filename_customer": fn_cust,
                    "issue": "Workbook customer != filename customer — workbook should win"
                })
            
            # Rule: If workbook has customer but filename doesn't, that's a gap
            if wb_cust and not fn_cust:
                violations.append({
                    "file": f.name,
                    "workbook_customer": wb_cust,
                    "filename_customer": None,
                    "issue": "Customer in workbook but not in filename — parser should use workbook"
                })
        
        print(f"Source priority violations: {len(violations)}")
        for v in violations:
            print(f"  {v['file']}: {v['issue']}")
        
        return {
            "violations": violations,
            "violation_count": len(violations),
        }
    
    def _validate_import_confidence(self):
        """Calculate confidence scores for each imported record."""
        print("\n" + "="*60)
        print("VALIDATING: Import Confidence")
        print("="*60)
        
        # Confidence = how many fields are populated / total expected fields
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
        """Generate all 5 validation reports."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # 1. CustomerCoverageReport.md
        cc = results["customer_coverage"]
        content = f"""# Customer Coverage Report
**Date:** {timestamp}

## Source Priority Rules
1. **Workbook data** (highest priority)
2. **Folder name** (medium priority)
3. **Filename** (lowest priority)

## 1.1 Customers in Database
Total: {cc['db_count']}

## 1.2 Customers Detected from Workbooks
"""
        for fn, cust in cc["workbook_customers"].items():
            content += f"- `{fn}`: **{cust}**\n"
        
        content += f"\n## 1.3 Customers Detected from Filenames\n"
        for fn, cust in cc["filename_customers"].items():
            content += f"- `{fn}`: **{cust}**\n"
        
        content += f"""
## 1.4 Mismatches (Workbook vs Filename)
Total: {cc['mismatches']}
"""
        if cc['missing_in_db']:
            content += f"\n## 1.5 Customers Missing from Database\n"
            for c in cc['missing_in_db']:
                content += f"- {c}\n"
        
        content += f"""
## 1.6 Defects Found
- Parser currently extracts customer from filename only.
- **Workbook-level customer data exists** in Part List files (e.g., "TOOL NO :BM454 Veedol...").
- Parser must be updated to read workbook headers first, then fallback to filename.
"""
        (REPORTS_DIR / "CustomerCoverageReport.md").write_text(content, encoding="utf-8")
        
        # 2. ProjectCoverageReport.md
        pc = results["project_coverage"]
        content = f"""# Project Coverage Report
**Date:** {timestamp}

## 2.1 Projects in Database
Total: {pc['db_count']}

## 2.2 Projects by Source Type
"""
        for ftype, count in pc["source_types"].items():
            content += f"- {ftype}: {count} projects\n"
        
        if pc['missing_cross_refs']:
            content += f"\n## 2.3 Missing Cross-References\n"
            for ftype, missing in pc['missing_cross_refs'].items():
                content += f"- {ftype}: {len(missing)} projects not in DB\n"
        
        if pc['extra_in_db']:
            content += f"\n## 2.4 Projects in DB but Not in Sources\n"
            for p in pc['extra_in_db'][:20]:
                content += f"- {p}\n"
        
        (REPORTS_DIR / "ProjectCoverageReport.md").write_text(content, encoding="utf-8")
        
        # 3. RelationshipValidation.md
        rv = results["relationships"]
        content = f"""# Relationship Validation Report
**Date:** {timestamp}

## 3.1 Validation Chain
Project → Product → Customer → Machine → Material → Capacity → Neck Type → Cavitation → Documents

## 3.2 Summary
- Total projects: {rv['total_projects']}
- Projects with missing relationships: {rv['projects_with_issues']}

## 3.3 Missing Relationship Breakdown
"""
        for issue, count in rv["breakdown"].items():
            content += f"- {issue}: {count} projects\n"
        
        (REPORTS_DIR / "RelationshipValidation.md").write_text(content, encoding="utf-8")
        
        # 4. SourcePriorityValidation.md
        sp = results["source_priority"]
        content = f"""# Source Priority Validation Report
**Date:** {timestamp}

## 4.1 Priority Rules
1. Workbook data (highest)
2. Folder name (medium)
3. Filename (lowest)

## 4.2 Violations
Total: {sp['violation_count']}
"""
        for v in sp["violations"]:
            content += f"\n- **File:** `{v['file']}`\n"
            content += f"  - Workbook customer: {v['workbook_customer']}\n"
            content += f"  - Filename customer: {v['filename_customer']}\n"
            content += f"  - Issue: {v['issue']}\n"
        
        content += f"""
## 4.3 Defects Found
- Parser does not read workbook header cells for customer extraction.
- Parser uses filename as primary source (violates priority rule).
- Fix: Update partlist_parser to scan sheet headers for "TOOL NO" lines.
"""
        (REPORTS_DIR / "SourcePriorityValidation.md").write_text(content, encoding="utf-8")
        
        # 5. ImportConfidenceReport.md
        ic = results["import_confidence"]
        content = f"""# Import Confidence Report
**Date:** {timestamp}

## 5.1 Confidence by Table
Confidence = (filled fields / total expected fields) × 100

| Table | Confidence | Status |
|-------|-----------|--------|
"""
        for table, score in ic.items():
            status = "HIGH" if score >= 80 else "MEDIUM" if score >= 50 else "LOW"
            content += f"| {table} | {score}% | {status} |\n"
        
        content += f"""
## 5.2 Recommendations
- Tables with LOW confidence need parser improvements.
- Tables with MEDIUM confidence need NULL handling.
- Tables with HIGH confidence are production-ready.
"""
        (REPORTS_DIR / "ImportConfidenceReport.md").write_text(content, encoding="utf-8")
        
        print(f"\nAll 5 reports written to {REPORTS_DIR}")


# ============================================================
# MAIN
# ============================================================
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
