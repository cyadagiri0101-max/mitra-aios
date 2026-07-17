import sqlite3, os
p = r'D:\Mitra3.0\pmm_data_library\pmm_database.db'
print('exists', os.path.exists(p))
conn = sqlite3.connect(p)
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
for row in cur.fetchall():
    print(row[0])
conn.close()
