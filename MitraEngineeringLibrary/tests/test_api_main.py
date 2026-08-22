import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from api.main import app, get_db
from models.database import Base
from models.entities import (
    ProjectMaster, ProductMaster, DocumentIndex, ImportLog,
    BottleFamily, CustomerMaster, MachineMaster, MaterialMaster,
    NeckTypeMaster, ProjectCustomerLink,
)


class EKLApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=cls.engine)
        cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)

        def override_get_db():
            db = cls.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    def setUp(self):
        self.db = self.SessionLocal()
        self.db.query(ProjectCustomerLink).delete()
        self.db.query(ImportLog).delete()
        self.db.query(DocumentIndex).delete()
        self.db.query(ProductMaster).delete()
        self.db.query(BottleFamily).delete()
        self.db.query(CustomerMaster).delete()
        self.db.query(MachineMaster).delete()
        self.db.query(MaterialMaster).delete()
        self.db.query(NeckTypeMaster).delete()
        self.db.query(ProjectMaster).delete()
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_search_invalid_query_returns_400(self):
        response = self.client.get("/api/v1/search?q=")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"detail": "Invalid search query"})

    def test_search_empty_database_returns_200(self):
        response = self.client.get("/api/v1/search?q=anything")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["query"], "anything")
        self.assertEqual(body["project_results"], [])
        self.assertEqual(body["document_results"], [])

    def test_document_list_returns_items(self):
        project = ProjectMaster(project_number="BM123", project_prefix="BM", project_name="Test Project")
        self.db.add(project)
        self.db.commit()
        document = DocumentIndex(
            project_id=project.id,
            serial_no=1,
            description="Doc desc",
            sub_description="Sub desc",
            page_no="A1",
            remarks="Test remark",
            source_file="file.pdf",
            source_sheet="Sheet1",
            source_row=5,
        )
        self.db.add(document)
        self.db.commit()

        response = self.client.get("/api/v1/documents")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["total"], 1)
        self.assertEqual(len(body["items"]), 1)
        self.assertEqual(body["items"][0]["id"], document.id)

    def test_document_detail_returns_200(self):
        project = ProjectMaster(project_number="BM124", project_prefix="BM", project_name="Another Project")
        self.db.add(project)
        self.db.commit()
        document = DocumentIndex(
            project_id=project.id,
            serial_no=2,
            description="Doc two",
            sub_description="Sub two",
            page_no="B2",
        )
        self.db.add(document)
        self.db.commit()

        response = self.client.get(f"/api/v1/documents/{document.id}")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["id"], document.id)
        self.assertEqual(body["project_id"], project.id)
        self.assertEqual(body["serial_no"], document.serial_no)

    def test_document_detail_unknown_returns_404(self):
        response = self.client.get("/api/v1/documents/999")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "Document not found"})

    def test_dashboard_widgets_empty_database_returns_200(self):
        response = self.client.get("/api/v1/dashboard/widgets")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["projectCount"], 0)
        self.assertEqual(body["productCount"], 0)
        self.assertEqual(body["documentCount"], 0)
        self.assertEqual(body["recentImports"], [])
        self.assertEqual(body["databaseHealth"]["status"], "healthy")
        self.assertEqual(body["importStatus"]["status"], "unknown")

    def test_search_matches_project_and_document(self):
        project = ProjectMaster(project_number="BM999", project_prefix="BM", project_name="SearchMatch")
        self.db.add(project)
        self.db.commit()
        document = DocumentIndex(project_id=project.id, serial_no=3, description="SearchMatch document")
        self.db.add(document)
        self.db.commit()

        response = self.client.get("/api/v1/search?q=SearchMatch")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(any(item["project_number"] == "BM999" for item in body["project_results"]))
        self.assertTrue(any(item["description"] == "SearchMatch document" for item in body["document_results"]))


if __name__ == "__main__":
    unittest.main()
