"""Evidence-based acceptance validation for EKL."""
import sqlite3
import json
import requests
from requests.adapters import HTTPAdapter
from datetime import datetime, timezone

DB = r"D:\MitraEngineeringLibrary\database\mekb.sqlite"
BASE = "http://localhost:8001"
API = f"{BASE}/api/v1"

_session = requests.Session()
_session.mount('http://', HTTPAdapter(pool_connections=10, pool_maxsize=20))

evidence = []

def add_evidence(category, check, query, expected, actual, count, samples, root_cause, issue_type, status):
    evidence.append({
        "category": category,
        "check": check,
        "query": query,
        "expected": expected,
        "actual": actual,
        "count": count,
        "samples": samples,
        "root_cause": root_cause,
        "issue_type": issue_type,
        "status": status,
    })

def run_sql(cur, sql):
    rows = cur.execute(sql).fetchall()
    cols = [d[0] for d in cur.description] if cur.description else []
    dict_rows = [dict(zip(cols, r)) for r in rows]
    return dict_rows

def fetch_json(url, timeout=15):
    try:
        r = _session.get(url, timeout=timeout)
        return r.status_code, r.json() if r.status_code == 200 else r.text, r.elapsed.total_seconds()
    except Exception as e:
        return -1, str(e), 0.0

def main():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    total_projects = cur.execute("SELECT COUNT(*) FROM project_master").fetchone()[0]

    # ==========================
    # 1. Database Integrity
    # ==========================

    # 1.1 Every project has valid project number
    sql = "SELECT id, project_number FROM project_master WHERE project_number IS NULL OR project_number = ''"
    rows = run_sql(cur, sql)
    add_evidence(
        "Database Integrity", "Projects with valid project number",
        sql, "0 invalid records", f"{len(rows)} invalid records",
        len(rows), rows[:10],
        "Project numbers are populated for all projects." if len(rows) == 0 else "Some projects have missing/empty project numbers.",
        "Database defect" if len(rows) > 0 else None,
        "PASS" if len(rows) == 0 else "FAIL"
    )

    # 1.2 Every product belongs to a project
    sql = "SELECT id, product_name FROM product_master WHERE project_id IS NULL"
    rows = run_sql(cur, sql)
    add_evidence(
        "Database Integrity", "Products linked to project",
        sql, "0 products without project", f"{len(rows)} products without project",
        len(rows), rows[:10],
        "Products are imported without project linkage." if len(rows) > 0 else "All products are linked to projects.",
        "Importer defect" if len(rows) > 0 else None,
        "PASS" if len(rows) == 0 else "FAIL"
    )

    # 1.3 Customers exist
    sql = "SELECT COUNT(*) AS c FROM customer_master"
    count = cur.execute(sql).fetchone()["c"]
    add_evidence(
        "Database Integrity", "Customers exist",
        sql, ">0 customers", f"{count} customers",
        count, [],
        "Customer master table has records." if count > 0 else "No customers imported.",
        "Importer defect" if count == 0 else None,
        "PASS" if count > 0 else "FAIL"
    )

    # 1.4 Machines exist
    sql = "SELECT COUNT(*) AS c FROM machine_master"
    count = cur.execute(sql).fetchone()["c"]
    add_evidence(
        "Database Integrity", "Machines exist",
        sql, ">0 machines", f"{count} machines",
        count, [],
        "Machine master table has records." if count > 0 else "No machines imported.",
        "Importer defect" if count == 0 else None,
        "PASS" if count > 0 else "FAIL"
    )

    # 1.5 Materials exist
    sql = "SELECT COUNT(*) AS c FROM material_master"
    count = cur.execute(sql).fetchone()["c"]
    add_evidence(
        "Database Integrity", "Materials exist",
        sql, ">0 materials", f"{count} materials",
        count, [],
        "Material master table has records." if count > 0 else "No materials imported.",
        "Importer defect" if count == 0 else None,
        "PASS" if count > 0 else "FAIL"
    )

    # 1.6 Bottle families exist
    sql = "SELECT COUNT(*) AS c FROM bottle_family"
    count = cur.execute(sql).fetchone()["c"]
    add_evidence(
        "Database Integrity", "Bottle families exist",
        sql, ">0 bottle families", f"{count} bottle families",
        count, [],
        "Bottle family table has records." if count > 0 else "No bottle families imported.",
        "Importer defect" if count == 0 else None,
        "PASS" if count > 0 else "FAIL"
    )

    # 1.7 Technical specifications belong to bottle family
    sql = """
        SELECT ts.id, ts.spec_name FROM technical_specification ts
        LEFT JOIN bottle_family bf ON ts.bottle_family_id = bf.id
        WHERE bf.id IS NULL
    """
    rows = run_sql(cur, sql)
    add_evidence(
        "Database Integrity", "Technical specifications have valid bottle family",
        sql, "0 invalid records", f"{len(rows)} invalid records",
        len(rows), rows[:10],
        "All technical specs are linked to valid bottle families." if len(rows) == 0 else "Some technical specs reference missing bottle families.",
        "Database defect" if len(rows) > 0 else None,
        "PASS" if len(rows) == 0 else "FAIL"
    )

    # 1.8 Orphan records - broken FKs
    orphan_checks = [
        ("product_master", "project_id", "project_master", "Project products"),
        ("product_master", "bottle_family_id", "bottle_family", "Product bottle families"),
        ("product_master", "neck_type_id", "neck_type_master", "Product neck types"),
        ("cycle_time_history", "project_id", "project_master", "Cycle time projects"),
        ("cycle_time_history", "machine_id", "machine_master", "Cycle time machines"),
        ("process_planning", "project_id", "project_master", "Process planning projects"),
        ("part_list", "project_id", "project_master", "Part list projects"),
        ("component_detail", "project_id", "project_master", "Component projects"),
        ("document_index", "project_id", "project_master", "Document projects"),
        ("engineering_notes", "project_id", "project_master", "Engineering note projects"),
        ("project_product_link", "project_id", "project_master", "Project-product links"),
        ("project_product_link", "product_id", "product_master", "Project-product product links"),
        ("project_customer_link", "project_id", "project_master", "Project-customer project links"),
        ("project_customer_link", "customer_id", "customer_master", "Project-customer customer links"),
    ]
    for child, fk, parent, label in orphan_checks:
        sql = f"""
            SELECT c.id FROM {child} c
            LEFT JOIN {parent} p ON c.{fk} = p.id
            WHERE c.{fk} IS NOT NULL AND p.id IS NULL
        """
        rows = run_sql(cur, sql)
        add_evidence(
            "Database Integrity / Orphans", f"{label} - broken FK",
            sql, "0 orphan records", f"{len(rows)} orphan records",
            len(rows), rows[:10],
            "No broken foreign keys." if len(rows) == 0 else f"{label} contains broken foreign keys.",
            "Database defect" if len(rows) > 0 else None,
            "PASS" if len(rows) == 0 else "FAIL"
        )

    # ==========================
    # 2. Engineering Relationships
    # ==========================

    rel_checks = [
        ("Project → Product", "SELECT COUNT(DISTINCT project_id) FROM product_master WHERE project_id IS NOT NULL"),
        ("Project → Bottle Family", """
            SELECT COUNT(DISTINCT p.project_id) FROM product_master p
            JOIN bottle_family bf ON p.bottle_family_id = bf.id
            WHERE p.project_id IS NOT NULL
        """),
        ("Project → Customer", "SELECT COUNT(DISTINCT project_id) FROM project_customer_link"),
        ("Project → Machine", "SELECT COUNT(DISTINCT project_id) FROM cycle_time_history WHERE project_id IS NOT NULL"),
        ("Project → Material", """
            SELECT COUNT(DISTINCT p.project_id) FROM product_master p
            WHERE p.project_id IS NOT NULL AND p.material IS NOT NULL
        """),
        ("Project → Capacity", """
            SELECT COUNT(DISTINCT p.project_id) FROM product_master p
            WHERE p.project_id IS NOT NULL AND p.volume_ml IS NOT NULL
        """),
        ("Project → Neck Type", """
            SELECT COUNT(DISTINCT p.project_id) FROM product_master p
            WHERE p.project_id IS NOT NULL AND p.neck_type_id IS NOT NULL
        """),
        ("Project → Cavitation", "SELECT COUNT(DISTINCT project_id) FROM cycle_time_history WHERE project_id IS NOT NULL AND cavitation IS NOT NULL"),
        ("Project → Cycle Time", "SELECT COUNT(DISTINCT project_id) FROM cycle_time_history WHERE project_id IS NOT NULL"),
        ("Project → Process Planning", "SELECT COUNT(DISTINCT project_id) FROM process_planning WHERE project_id IS NOT NULL"),
        ("Project → Part List", "SELECT COUNT(DISTINCT project_id) FROM part_list WHERE project_id IS NOT NULL"),
        ("Project → Component Detail", "SELECT COUNT(DISTINCT project_id) FROM component_detail WHERE project_id IS NOT NULL"),
        ("Project → Document", "SELECT COUNT(DISTINCT project_id) FROM document_index WHERE project_id IS NOT NULL"),
    ]
    for label, sql in rel_checks:
        count = cur.execute(sql).fetchone()[0]
        expected = f"{total_projects} projects"
        actual = f"{count} projects"
        add_evidence(
            "Engineering Relationships", label,
            sql, expected, actual,
            count, [],
            f"{label} relationship is fully populated." if count == total_projects else f"{label} relationship is missing for {total_projects - count} projects.",
            "Importer defect" if count < total_projects else None,
            "PASS" if count == total_projects else "FAIL"
        )

    # ==========================
    # 3. Duplicate Validation
    # ==========================

    dup_checks = [
        ("Project number", "SELECT project_number FROM project_master GROUP BY project_number HAVING COUNT(*) > 1"),
        ("Product name + variant", """
            SELECT product_name || '|' || COALESCE(product_variant,'') AS key
            FROM product_master GROUP BY key HAVING COUNT(*) > 1
        """),
        ("Customer code", "SELECT customer_code FROM customer_master GROUP BY customer_code HAVING COUNT(*) > 1"),
        ("Machine code", "SELECT machine_code FROM machine_master GROUP BY machine_code HAVING COUNT(*) > 1"),
        ("Material code", "SELECT material_code FROM material_master GROUP BY material_code HAVING COUNT(*) > 1"),
        ("Cycle time", """
            SELECT project_id, machine_id, product_name, cavitation, cycle_time_sec
            FROM cycle_time_history
            WHERE project_id IS NOT NULL
            GROUP BY project_id, machine_id, product_name, cavitation, cycle_time_sec
            HAVING COUNT(*) > 1
        """),
        ("Document index (project + serial)", """
            SELECT project_id, serial_no FROM document_index
            GROUP BY project_id, serial_no HAVING COUNT(*) > 1
        """),
        ("Component detail", """
            SELECT project_id, tool_no, description, material FROM component_detail
            GROUP BY project_id, tool_no, description, material HAVING COUNT(*) > 1
        """),
        ("Part list", """
            SELECT project_id, description, material FROM part_list
            GROUP BY project_id, description, material HAVING COUNT(*) > 1
        """),
    ]
    for label, sql in dup_checks:
        rows = run_sql(cur, sql)
        add_evidence(
            "Duplicate Validation", label,
            sql, "0 duplicates", f"{len(rows)} duplicate groups",
            len(rows), rows[:10],
            "No duplicates found." if len(rows) == 0 else f"Duplicate {label} groups detected.",
            "Importer defect" if len(rows) > 0 else None,
            "PASS" if len(rows) == 0 else "FAIL"
        )

    # ==========================
    # 4. NULL FK Inspection
    # ==========================

    null_fk_checks = [
        ("Cycle times without project link", "SELECT id, product_name, machine_id, cavitation FROM cycle_time_history WHERE project_id IS NULL"),
        ("Cycle times without machine link", "SELECT id, project_id, product_name FROM cycle_time_history WHERE machine_id IS NULL"),
        ("Part lists without project link", "SELECT id, description FROM part_list WHERE project_id IS NULL"),
        ("Component details without project link", "SELECT id, tool_no FROM component_detail WHERE project_id IS NULL"),
        ("Documents without project link", "SELECT id, serial_no FROM document_index WHERE project_id IS NULL"),
        ("Process planning without project link", "SELECT id, step_name FROM process_planning WHERE project_id IS NULL"),
        ("Products without bottle family link", "SELECT id, product_name FROM product_master WHERE bottle_family_id IS NULL"),
    ]
    for label, sql in null_fk_checks:
        rows = run_sql(cur, sql)
        add_evidence(
            "Database Integrity / NULL FK",
            label,
            sql,
            "0 unlinked records",
            f"{len(rows)} unlinked records",
            len(rows), rows[:10],
            "All expected foreign-key links are present." if len(rows) == 0 else f"{len(rows)} records have NULL foreign keys.",
            "Data quality defect" if len(rows) > 0 else None,
            "PASS" if len(rows) == 0 else "FAIL"
        )

    # ==========================
    # 5. Orphan Validation
    # ==========================

    orphan_validation = [
        ("Documents without project", "SELECT id, serial_no FROM document_index WHERE project_id IS NULL"),
        ("Cycle times without project", "SELECT id, product_name FROM cycle_time_history WHERE project_id IS NULL"),
        ("Part lists without project", "SELECT id, description FROM part_list WHERE project_id IS NULL"),
        ("Components without project", "SELECT id, tool_no FROM component_detail WHERE project_id IS NULL"),
        ("Products without project", "SELECT id, product_name FROM product_master WHERE project_id IS NULL"),
        ("Customers without projects", """
            SELECT cm.id, cm.customer_code FROM customer_master cm
            WHERE NOT EXISTS (SELECT 1 FROM project_customer_link pcl WHERE pcl.customer_id = cm.id)
        """),
        ("Bottle families without products", """
            SELECT bf.id, bf.family_name FROM bottle_family bf
            WHERE NOT EXISTS (SELECT 1 FROM product_master p WHERE p.bottle_family_id = bf.id)
        """),
    ]
    for label, sql in orphan_validation:
        rows = run_sql(cur, sql)
        add_evidence(
            "Orphan Validation", label,
            sql, "0 orphan records", f"{len(rows)} orphan records",
            len(rows), rows[:10],
            "No orphan records." if len(rows) == 0 else f"{label} found.",
            "Importer defect" if len(rows) > 0 else None,
            "PASS" if len(rows) == 0 else "FAIL"
        )

    # ==========================
    # 6. Feature Completeness
    # ==========================

    feature_completeness = [
        ("Products", "SELECT COUNT(*) AS c FROM product_master", 1),
        ("Customers", "SELECT COUNT(*) AS c FROM customer_master", 1),
        ("Machines", "SELECT COUNT(*) AS c FROM machine_master", 1),
        ("Materials", "SELECT COUNT(*) AS c FROM material_master", 1),
        ("Documents", "SELECT COUNT(*) AS c FROM document_index", 1),
        ("Cycle times", "SELECT COUNT(*) AS c FROM cycle_time_history", 1),
        ("Part lists", "SELECT COUNT(*) AS c FROM part_list", 1),
        ("Process planning", "SELECT COUNT(*) AS c FROM process_planning", 1),
        ("Component details", "SELECT COUNT(*) AS c FROM component_detail", 1),
    ]
    for label, sql, minimum in feature_completeness:
        count = cur.execute(sql).fetchone()["c"]
        add_evidence(
            "Feature Completeness",
            label,
            sql,
            f">= {minimum} records",
            f"{count} records",
            count, [],
            f"Required feature data exists: {count} records.",
            "Importer defect" if count < minimum else None,
            "PASS" if count >= minimum else "FAIL"
        )

    # ==========================
    # 7. Search Validation
    # ==========================

    search_tests = [
        ("Project Number", "BM454", f"{API}/projects?search=BM454"),
        ("Bottle Family", "Veedol", f"{API}/projects?search=Veedol"),
        ("Customer", "Veedol", f"{API}/projects?search=Veedol"),
        ("Machine", "SEB101", f"{API}/projects?search=SEB101"),
        ("Material", "HDPE", f"{API}/projects?search=HDPE"),
        ("Capacity", "380ml", f"{API}/projects?search=380ml"),
        ("Neck Type", "26mm", f"{API}/projects?search=26mm"),
        ("Cavitation", "8", f"{API}/projects?search=8"),
        ("Product Name", "Champagne 380ml", f"{API}/projects?search=Champagne 380ml"),
    ]
    for label, term, url in search_tests:
        status, data, elapsed = fetch_json(url)
        matches = data.get("total", 0) if isinstance(data, dict) else 0
        add_evidence(
            "Search Validation", f"Search by {label}: '{term}'",
            f"GET {url}", ">=1 relevant match" if label in ["Project Number", "Product Name"] else "API supports this dimension",
            f"HTTP {status}, {matches} project matches",
            matches, [],
            f"Search returned {matches} project match(es)." if matches > 0 else "Search returned no project matches; dimension not supported by /projects?search=.",
            "API defect" if matches == 0 and label != "Neck Type" else None,
            "PASS" if matches > 0 else "FAIL"
        )

    # ==========================
    # 6. API Validation
    # ==========================

    api_tests = [
        ("Health", f"{BASE}/health", 200),
        ("Projects", f"{API}/projects?limit=5", 200),
        ("Project Details", f"{API}/projects/BM454", 200),
        ("Project Documents", f"{API}/projects/BM454/documents", 200),
        ("Project Cycle Times", f"{API}/projects/BM454/cycle-times", 200),
        ("Project Part List", f"{API}/projects/BM454/part-list", 200),
        ("Project Process Planning", f"{API}/projects/BM454/process-planning", 200),
        ("Components", f"{API}/components?limit=5", 200),
        ("Products", f"{API}/products?limit=5", 200),
        ("Customers", f"{API}/sync/all", 200),  # No dedicated /customers
        ("Machines", f"{API}/machines", 200),
        ("Materials", f"{API}/materials", 200),
        ("Sync", f"{API}/sync/all", 200),
        ("Dashboard", f"{API}/dashboard/widgets", 200),
    ]
    for label, url, expected_status in api_tests:
        status, data, elapsed = fetch_json(url)
        count = None
        if isinstance(data, dict):
            count = data.get("total") or data.get("count") or data.get("projects") or len(data.get("items", []))
        add_evidence(
            "API Validation", label,
            f"GET {url}", f"HTTP {expected_status}", f"HTTP {status}",
            count if count is not None else 0, [],
            f"Endpoint responded as expected." if status == expected_status else f"Endpoint did not respond as expected (expected {expected_status}, got {status}).",
            "API defect" if status != expected_status else None,
            "PASS" if status == expected_status else "FAIL"
        )

    # ==========================
    # 7. MITRA Integration
    # ==========================

    mitra_tests = [
        ("MITRA Search", f"{API}/search?q=BM454", 200),
        ("MITRA Documents", f"{API}/documents", 200),
        ("MITRA Dashboard", f"{API}/dashboard/widgets", 200),
        ("MITRA Project Viewer", f"{API}/projects/BM454", 200),
    ]
    for label, url, expected_status in mitra_tests:
        status, data, elapsed = fetch_json(url)
        add_evidence(
            "MITRA Integration", label,
            f"GET {url}", f"HTTP {expected_status}", f"HTTP {status}",
            0, [],
            f"MITRA endpoint mapped correctly." if status == expected_status else f"MITRA calls endpoint that does not exist in EKL (expected {expected_status}, got {status}).",
            "Integration defect" if status != expected_status else None,
            "PASS" if status == expected_status else "FAIL"
        )

    conn.close()

    # Save evidence
    with open(r"D:\Mitra3.0\acceptance_evidence.json", "w") as f:
        json.dump(evidence, f, indent=2, default=str)

    # Calculate exact metrics
    pass_count = sum(1 for e in evidence if e["status"] == "PASS")
    fail_count = sum(1 for e in evidence if e["status"] == "FAIL")
    total = len(evidence)

    # Verdict
    fail_evidence = [e for e in evidence if e["status"] == "FAIL"]
    critical_fail = any(e["status"] == "FAIL" for e in evidence if e["category"] in ["Database Integrity", "Database Integrity / Orphans", "Orphan Validation", "Duplicate Validation", "MITRA Integration"])

    verdict = "REJECTED" if critical_fail or fail_count > 0 else "ACCEPTED"

    summary = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_checks": total,
        "pass": pass_count,
        "fail": fail_count,
        "verdict": verdict,
    }
    with open(r"D:\Mitra3.0\acceptance_summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
