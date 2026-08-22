import sys
from pathlib import Path

sys.path.insert(0, "D:/MitraEngineeringLibrary")

from models.database import engine, SessionLocal
from sqlalchemy import text
from models import Base

# Drop all tables and recreate
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

print("Database cleared and recreated.")

from importers.pipeline import ImportPipeline
from importers.validator import ValidationReport

pipeline = ImportPipeline()
result = pipeline.run()

print("-" * 60)
print(f"Status:     {result['status']}")
print(f"Files:      {result['files_processed']}")
print(f"Imported:   {result['records_imported']}")
print(f"Updated:    {result['records_updated']}")
print(f"Duplicates: {result['duplicates_found']}")
print(f"Errors:     {result['errors']}")
print(f"Warnings:   {result['warnings']}")
print("-" * 60)

for detail in result.get('details', []):
    p = detail.get('parser', 'N/A')
    i = detail.get('imported', 0)
    s = detail.get('skipped', False)
    r = detail.get('reason', '')
    if s:
        print(f"  {detail['file']:<60} | SKIPPED: {r}")
    else:
        print(f"  {detail['file']:<60} | parser={p:<25} | imported={i}")

report = ValidationReport(result['batch_id'])
report_path = report.generate(result)
print(f"\nReport: {report_path}")

db = SessionLocal()
try:
    print("\n--- Final Database Record Counts ---")
    tables = [
        "project_master", "product_master", "bottle_family", "machine_master",
        "material_master", "cycle_time_history", "process_planning", "part_list",
        "component_detail", "document_index", "data_sources", "provenance",
        "customer_master", "project_customer_link"
    ]
    for t in tables:
        c = db.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
        print(f"  {t:<30} : {c}")
    
    print("\n--- Relationship Counts ---")
    projects_with_products = db.execute(text("SELECT COUNT(DISTINCT project_id) FROM product_master WHERE project_id IS NOT NULL")).scalar()
    projects_with_customers = db.execute(text("SELECT COUNT(DISTINCT project_id) FROM project_customer_link")).scalar()
    projects_with_machines = db.execute(text("SELECT COUNT(DISTINCT project_id) FROM cycle_time_history WHERE project_id IS NOT NULL")).scalar()
    projects_with_parts = db.execute(text("SELECT COUNT(DISTINCT project_id) FROM part_list WHERE project_id IS NOT NULL")).scalar()
    projects_with_docs = db.execute(text("SELECT COUNT(DISTINCT project_id) FROM document_index WHERE project_id IS NOT NULL")).scalar()
    
    print(f"  Projects with products: {projects_with_products}")
    print(f"  Projects with customers: {projects_with_customers}")
    print(f"  Projects with machines: {projects_with_machines}")
    print(f"  Projects with parts: {projects_with_parts}")
    print(f"  Projects with documents: {projects_with_docs}")
    
    print("\n--- Product Variant Check ---")
    variants = db.execute(text("SELECT COUNT(*) FROM product_master WHERE product_variant IS NOT NULL")).scalar()
    total_products = db.execute(text("SELECT COUNT(*) FROM product_master")).scalar()
    print(f"  Products with variant: {variants}/{total_products}")
    
    sample = db.execute(text("SELECT project_id, product_name, product_variant FROM product_master WHERE product_variant IS NOT NULL LIMIT 5")).fetchall()
    for s in sample:
        print(f"    {s[0]}: {s[1]} | variant={s[2]}")
    
    families = db.execute(text("SELECT id, family_name FROM bottle_family")).fetchall()
    print(f"\n--- Bottle Families ---")
    for f in families:
        print(f"  {f[0]}: {f[1]}")
    
    customers = db.execute(text("SELECT id, customer_code, customer_name FROM customer_master")).fetchall()
    print(f"\n--- Customers ---")
    for c in customers:
        print(f"  {c[0]}: {c[1]} = {c[2]}")
    
finally:
    db.close()

print("\nClean import complete.")
