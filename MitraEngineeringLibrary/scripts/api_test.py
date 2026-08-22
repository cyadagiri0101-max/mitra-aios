import sys
from pathlib import Path

sys.path.insert(0, "D:/MitraEngineeringLibrary")

from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

r = client.get("/health")
print("Health:", r.status_code, r.json())

r = client.get("/api/v1/projects/BM454")
print("Project BM454:", r.status_code)
if r.status_code == 200:
    data = r.json()
    print(" ", data['project_number'], ":", data['project_name'])

r = client.get("/api/v1/projects/BM454/cycle-times")
print("BM454 cycle-times:", r.status_code, r.json().get('count', 0))

r = client.get("/api/v1/projects/BM454/process-planning")
print("BM454 process-planning:", r.status_code, r.json().get('count', 0))

r = client.get("/api/v1/projects/BM454/part-list")
print("BM454 part-list:", r.status_code, r.json().get('count', 0))

r = client.get("/api/v1/projects/BM454/documents")
print("BM454 documents:", r.status_code, r.json().get('count', 0))

r = client.get("/api/v1/sync/all")
print("Sync All:", r.status_code)
if r.status_code == 200:
    print(" Counts:", r.json()['counts'])

print("Done")
