import sqlite3
conn = sqlite3.connect(r'D:\Mitra3.0\pmm_data_library\pmm_database.db')
cur = conn.cursor()
for table in ['blow_molds','injection_molds','job_works','commercial_molds','alpla_std_parts']:
    print('TABLE', table)
    cur.execute(f'SELECT * FROM {table} LIMIT 3')
    cols = [d[0] for d in cur.description]
    print(cols)
    for row in cur.fetchall():
        print(row)
    print()
conn.close()
