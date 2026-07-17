import sqlite3, re
DB = r"D:\MitraEngineeringLibrary\database\mekb.sqlite"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Find all source files that might contain customer names
for table in ["document_index", "part_list", "process_planning", "cycle_time_history"]:
    print(f"\n=== {table} source files ===")
    for r in cur.execute(f"SELECT DISTINCT source_file FROM {table} WHERE source_file IS NOT NULL").fetchall():
        print(r[0])

# Find product names that look like Customer + product
print("\n=== Product names with potential customer prefix ===")
for r in cur.execute("SELECT DISTINCT product_name FROM product_master").fetchall():
    name = r[0]
    parts = name.split()
    if len(parts) >= 2 and not re.search(r'\d', parts[0]):
        print(name)

conn.close()
