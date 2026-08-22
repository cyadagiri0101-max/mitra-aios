import sys
from pathlib import Path

sys.path.insert(0, "D:/MitraEngineeringLibrary")

from models import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    logs = db.execute(text("SELECT batch_id, error_log, errors_count FROM import_log ORDER BY id DESC LIMIT 1")).fetchall()
    for log in logs:
        print("Batch: " + log[0])
        print("Errors: " + str(log[2]))
        print("Error log:")
        print(log[1])
    
    count = db.execute(text("SELECT COUNT(*) FROM part_list")).scalar()
    print("\nPart list count: " + str(count))
    
    prov = db.execute(text("SELECT COUNT(*) FROM provenance WHERE table_name = 'part_list'")).scalar()
    print("Part list provenance: " + str(prov))
finally:
    db.close()

print("Done")
