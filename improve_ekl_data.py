"""Improve engineering knowledge data quality inside existing EKL."""
import sqlite3
import re
import json
from datetime import datetime, timezone
from collections import defaultdict

DB = r"D:\MitraEngineeringLibrary\database\mekb.sqlite"


def normalize_name(name):
    if not name:
        return ""
    return re.sub(r'\s+', ' ', name.strip()).lower()


def extract_base_family(name):
    """Extract bottle family base name from product name."""
    if not name:
        return None
    # Remove volume/size patterns
    base = re.sub(r'\s+\d+\s*(ml|g|gm|cc|lit|L|Lit\.?)$', '', name, flags=re.IGNORECASE)
    base = re.sub(r'\s+\d+$', '', base)
    base = base.strip()
    return base if base and len(base) > 2 else None


def extract_neck_code(name, variant):
    """Extract neck type from product name/variant."""
    text = f"{name or ''} {variant or ''}"
    m = re.search(r'\bSTD\s*(\d+)', text, re.IGNORECASE)
    if m:
        return f"STD{m.group(1)}"
    m = re.search(r'\b(\d+)\s*mm\b', text, re.IGNORECASE)
    if m:
        return f"{m.group(1)}mm"
    return None


def main():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()

    changes = {
        "projects_renamed": 0,
        "bottle_families_created": 0,
        "products_linked_to_family": 0,
        "customers_created": 0,
        "project_customer_links_created": 0,
        "neck_types_created": 0,
        "products_linked_to_neck_type": 0,
        "cycle_times_linked": 0,
        "project_relationships_created": 0,
        "ai_tags_created": 0,
    }

    # Step 1: Rename generic project names from product names
    cur.execute("""
        SELECT p.id, p.project_number, pr.product_name
        FROM project_master p
        JOIN product_master pr ON pr.project_id = p.id
        WHERE p.project_name = p.project_number
    """)
    for row in cur.fetchall():
        if row["product_name"] and row["product_name"] != row["project_number"]:
            cur.execute(
                "UPDATE project_master SET project_name = ?, updated_at = ? WHERE id = ?",
                (row["product_name"], now, row["id"])
            )
            changes["projects_renamed"] += 1

    # Step 2: Create bottle families from product base names and link products
    cur.execute("SELECT id, project_id, product_name FROM product_master WHERE bottle_family_id IS NULL")
    family_map = {}
    for row in cur.fetchall():
        base = extract_base_family(row["product_name"])
        if not base:
            continue
        if base not in family_map:
            cur.execute("SELECT id FROM bottle_family WHERE LOWER(family_name) = ?", (base.lower(),))
            existing = cur.fetchone()
            if existing:
                family_map[base] = existing["id"]
            else:
                cur.execute(
                    "INSERT INTO bottle_family (family_name, description, created_at) VALUES (?, ?, ?)",
                    (base, f"Auto-derived from product '{row['product_name']}'", now)
                )
                family_map[base] = cur.lastrowid
                changes["bottle_families_created"] += 1
        cur.execute(
            "UPDATE product_master SET bottle_family_id = ?, updated_at = ? WHERE id = ?",
            (family_map[base], now, row["id"])
        )
        changes["products_linked_to_family"] += 1

    # Step 3: Create customer links from source file names
    customer_sources = {
        "veedol": "Veedol",
    }
    cur.execute("""
        SELECT DISTINCT p.id, p.project_number, di.source_file
        FROM project_master p
        JOIN document_index di ON di.project_id = p.id
        WHERE p.id NOT IN (SELECT project_id FROM project_customer_link)
    """)
    for row in cur.fetchall():
        src = (row["source_file"] or "").lower()
        for key, cust_name in customer_sources.items():
            if key in src:
                cur.execute("SELECT id FROM customer_master WHERE LOWER(customer_name) = ?", (cust_name.lower(),))
                cust = cur.fetchone()
                if not cust:
                    cur.execute(
                        "INSERT INTO customer_master (customer_code, customer_name, created_at) VALUES (?, ?, ?)",
                        (cust_name.upper(), cust_name, now)
                    )
                    cust_id = cur.lastrowid
                    changes["customers_created"] += 1
                else:
                    cust_id = cust["id"]
                cur.execute(
                    "INSERT INTO project_customer_link (project_id, customer_id, relationship_type) VALUES (?, ?, ?)",
                    (row["id"], cust_id, "derived_from_source_file")
                )
                changes["project_customer_links_created"] += 1
                break

    # Step 4: Create neck types and link products
    cur.execute("SELECT id, product_name, product_variant FROM product_master WHERE neck_type_id IS NULL")
    neck_map = {}
    for row in cur.fetchall():
        code = extract_neck_code(row["product_name"], row["product_variant"])
        if not code:
            continue
        if code not in neck_map:
            cur.execute("SELECT id FROM neck_type_master WHERE LOWER(neck_code) = ?", (code.lower(),))
            existing = cur.fetchone()
            if existing:
                neck_map[code] = existing["id"]
            else:
                cur.execute(
                    "INSERT INTO neck_type_master (neck_code, neck_name, created_at) VALUES (?, ?, ?)",
                    (code, f"Neck {code}", now)
                )
                neck_map[code] = cur.lastrowid
                changes["neck_types_created"] += 1
        cur.execute(
            "UPDATE product_master SET neck_type_id = ?, updated_at = ? WHERE id = ?",
            (neck_map[code], now, row["id"])
        )
        changes["products_linked_to_neck_type"] += 1

    # Step 5: Link cycle times to projects by matching remarks to product names
    cur.execute("SELECT id, remarks FROM cycle_time_history WHERE project_id IS NULL AND remarks IS NOT NULL")
    for row in cur.fetchall():
        remark = row["remarks"].lower()
        # Try to match remark to product name
        cur.execute("""
            SELECT p.id AS project_id FROM product_master pr
            JOIN project_master p ON pr.project_id = p.id
            WHERE LOWER(pr.product_name) LIKE ?
            LIMIT 1
        """, (f"%{remark}%",))
        match = cur.fetchone()
        if not match:
            # Try partial match by extracting product base from remark
            base = extract_base_family(row["remarks"])
            if base:
                cur.execute("""
                    SELECT p.id AS project_id FROM product_master pr
                    JOIN project_master p ON pr.project_id = p.id
                    WHERE LOWER(pr.product_name) LIKE ?
                    LIMIT 1
                """, (f"%{base}%",))
                match = cur.fetchone()
        if match:
            cur.execute(
                "UPDATE cycle_time_history SET project_id = ? WHERE id = ?",
                (match["project_id"], row["id"])
            )
            changes["cycle_times_linked"] += 1

    # Step 6: Create project relationships for similar products and bottle families
    # Group projects by bottle family
    cur.execute("""
        SELECT p.project_id, bf.id AS family_id, bf.family_name
        FROM product_master p
        JOIN bottle_family bf ON p.bottle_family_id = bf.id
        WHERE p.project_id IS NOT NULL
    """)
    family_projects = defaultdict(list)
    for row in cur.fetchall():
        family_projects[row["family_id"]].append(row["project_id"])

    for family_id, proj_ids in family_projects.items():
        for i in range(len(proj_ids)):
            for j in range(i + 1, len(proj_ids)):
                try:
                    cur.execute(
                        "INSERT INTO project_relationships (parent_project_id, child_project_id, relationship_type) VALUES (?, ?, ?)",
                        (proj_ids[i], proj_ids[j], "same_bottle_family")
                    )
                    changes["project_relationships_created"] += 1
                except sqlite3.IntegrityError:
                    pass

    # Group projects by customer
    cur.execute("SELECT project_id, customer_id FROM project_customer_link")
    customer_projects = defaultdict(list)
    for row in cur.fetchall():
        customer_projects[row["customer_id"]].append(row["project_id"])
    for cust_id, proj_ids in customer_projects.items():
        for i in range(len(proj_ids)):
            for j in range(i + 1, len(proj_ids)):
                try:
                    cur.execute(
                        "INSERT INTO project_relationships (parent_project_id, child_project_id, relationship_type) VALUES (?, ?, ?)",
                        (proj_ids[i], proj_ids[j], "same_customer")
                    )
                    changes["project_relationships_created"] += 1
                except sqlite3.IntegrityError:
                    pass

    # Step 7: Add AI search tags
    # Tag projects with product names, materials, customers
    tag_sql = """
        SELECT p.id AS project_id,
               pr.product_name,
               pr.material,
               bf.family_name,
               cm.customer_name,
               p.project_number
        FROM project_master p
        LEFT JOIN product_master pr ON pr.project_id = p.id
        LEFT JOIN bottle_family bf ON pr.bottle_family_id = bf.id
        LEFT JOIN project_customer_link pcl ON pcl.project_id = p.id
        LEFT JOIN customer_master cm ON pcl.customer_id = cm.id
    """
    cur.execute(tag_sql)
    seen_tags = set()
    for row in cur.fetchall():
        tags = []
        if row["product_name"]:
            tags.append(("product", row["product_name"]))
            # Extract capacity
            m = re.search(r'(\d+)\s*(ml|g|gm|cc|lit|L)', row["product_name"], re.IGNORECASE)
            if m:
                tags.append(("capacity", f"{m.group(1)}{m.group(2).lower()}"))
        if row["material"]:
            tags.append(("material", row["material"]))
        if row["family_name"]:
            tags.append(("bottle_family", row["family_name"]))
        if row["customer_name"]:
            tags.append(("customer", row["customer_name"]))
        tags.append(("project_number", row["project_number"]))

        for tag_name, tag_value in tags:
            key = (row["project_id"], tag_name, tag_value)
            if key in seen_tags:
                continue
            seen_tags.add(key)
            cur.execute(
                "INSERT INTO ai_search_tags (entity_type, entity_id, tag_name, tag_value, source, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                ("project", row["project_id"], tag_name, tag_value, "auto_derived", now)
            )
            changes["ai_tags_created"] += 1

    conn.commit()
    conn.close()

    with open(r"D:\Mitra3.0\data_quality_changes.json", "w") as f:
        json.dump(changes, f, indent=2)
    print(json.dumps(changes, indent=2))


if __name__ == "__main__":
    main()
