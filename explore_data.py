import sqlite3, json
DB = r"D:\MitraEngineeringLibrary\database\mekb.sqlite"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("=== Projects without products ===")
for r in cur.execute("""
    SELECT p.id, p.project_number, p.project_name FROM project_master p
    WHERE NOT EXISTS (SELECT 1 FROM product_master pr WHERE pr.project_id = p.id)
    LIMIT 20
""").fetchall():
    print(dict(r))

print("\n=== Products sample ===")
for r in cur.execute("SELECT * FROM product_master LIMIT 10").fetchall():
    print(dict(r))

print("\n=== Cycle times sample ===")
for r in cur.execute("SELECT * FROM cycle_time_history LIMIT 10").fetchall():
    print(dict(r))

print("\n=== Source files ===")
for r in cur.execute("""
    SELECT DISTINCT source_file FROM data_sources
""").fetchall():
    print(r[0])

print("\n=== Document source files ===")
for r in cur.execute("""
    SELECT DISTINCT source_file FROM document_index LIMIT 20
""").fetchall():
    print(r[0])

print("\n=== Part list source files ===")
for r in cur.execute("""
    SELECT DISTINCT source_file FROM part_list LIMIT 20
""").fetchall():
    print(r[0])

print("\n=== Product names ===")
for r in cur.execute("""
    SELECT DISTINCT product_name FROM product_master ORDER BY product_name
""").fetchall():
    print(r[0])

conn.close()
