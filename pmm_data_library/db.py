"""
PMM Data Library — Database Interface
======================================
SQLite-backed data access layer with query methods for each entity.
"""
import sqlite3
import os
from typing import List, Optional, Dict, Any
from .models import BlowMold, InjectionMold, JobWork, ALPLAStdPart, CommercialMold, PartListSummary, PartListDetail

# Default path: sibling to this package
DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "pmm_database.db")


class _BaseDB:
    """Base database class with connection management."""
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or DEFAULT_DB_PATH
        self._conn = None
    
    def connect(self):
        if self._conn is None:
            self._conn = sqlite3.connect(self.db_path)
            self._conn.row_factory = sqlite3.Row
        return self._conn
    
    def close(self):
        if self._conn:
            self._conn.close()
            self._conn = None
    
    def __enter__(self):
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def _execute(self, sql: str, params: tuple = ()) -> List[sqlite3.Row]:
        conn = self.connect()
        cursor = conn.execute(sql, params)
        return cursor.fetchall()


class BlowMoldDB(_BaseDB):
    """Database interface for Blow Mold records."""
    
    TABLE = "blow_molds"
    
    def _row_to_model(self, row: sqlite3.Row) -> BlowMold:
        return BlowMold(
            original_tool_no=row["Original_Tool_No"],
            normalized_project_no=row["Normalized_Project_No"],
            project_type=row["Project_Type"],
            description=row["Description"],
            cavity=row["Cavity"] if "Cavity" in row.keys() else None,
            machine=row["Machine"] if "Machine" in row.keys() else None,
            volume=row["Volume"] if "Volume" in row.keys() else None,
            neck_type=row["Neck_Type"] if "Neck_Type" in row.keys() else None,
            end_customer=row["End_Customer"] if "End_Customer" in row.keys() else None,
            neck_material=row["Neck_Material"] if "Neck_Material" in row.keys() else None,
            body_material=row["Body_Material"] if "Body_Material" in row.keys() else None,
            base_material=row["Base_Material"] if "Base_Material" in row.keys() else None,
            inserts_cost=row["Inserts_Cost"] if "Inserts_Cost" in row.keys() else None,
            mask_parts_cost=row["Mask_Parts_Cost"] if "Mask_Parts_Cost" in row.keys() else None,
            mold_base_cost=row["Mold_Base_Cost"] if "Mold_Base_Cost" in row.keys() else None,
            std_part_cost=row["STD_Part_Cost"] if "STD_Part_Cost" in row.keys() else None,
            fasteners_cost=row["Fasteners_Cost"] if "Fasteners_Cost" in row.keys() else None,
            elec_cost=row["Elec_Cost"] if "Elec_Cost" in row.keys() else None,
            alpla_std_parts=row["ALPLA_STD_Parts"] if "ALPLA_STD_Parts" in row.keys() else None,
            wooden_box=row["Wooden_Box"] if "Wooden_Box" in row.keys() else None,
            total_cost=row["Total_Cost"] if "Total_Cost" in row.keys() else None,
            status=row["Status"] if "Status" in row.keys() else None,
            source_file=row["Source_File"] if "Source_File" in row.keys() else None,
            source_sheet=row["Source_Sheet"] if "Source_Sheet" in row.keys() else None,
        )
    
    def get_all(self) -> List[BlowMold]:
        rows = self._execute(f"SELECT * FROM {self.TABLE} ORDER BY Normalized_Project_No")
        return [self._row_to_model(r) for r in rows]
    
    def get_by_project_no(self, project_no: str) -> List[BlowMold]:
        rows = self._execute(
            f"SELECT * FROM {self.TABLE} WHERE Normalized_Project_No = ?",
            (project_no,)
        )
        return [self._row_to_model(r) for r in rows]
    
    def search_by_customer(self, customer: str) -> List[BlowMold]:
        rows = self._execute(
            f"SELECT * FROM {self.TABLE} WHERE End_Customer LIKE ? ORDER BY Normalized_Project_No",
            (f"%{customer}%",)
        )
        return [self._row_to_model(r) for r in rows]
    
    def search_by_description(self, keyword: str) -> List[BlowMold]:
        rows = self._execute(
            f"SELECT * FROM {self.TABLE} WHERE Description LIKE ? ORDER BY Normalized_Project_No",
            (f"%{keyword}%",)
        )
        return [self._row_to_model(r) for r in rows]
    
    def search_by_machine(self, machine: str) -> List[BlowMold]:
        rows = self._execute(
            f"SELECT * FROM {self.TABLE} WHERE Machine LIKE ? ORDER BY Normalized_Project_No",
            (f"%{machine}%",)
        )
        return [self._row_to_model(r) for r in rows]
    
    def get_by_status(self, status: str) -> List[BlowMold]:
        rows = self._execute(
            f"SELECT * FROM {self.TABLE} WHERE Status LIKE ? ORDER BY Normalized_Project_No",
            (f"%{status}%",)
        )
        return [self._row_to_model(r) for r in rows]
    
    def count(self) -> int:
        rows = self._execute(f"SELECT COUNT(*) as cnt FROM {self.TABLE}")
        return rows[0]["cnt"]
    
    def get_customers(self) -> List[str]:
        rows = self._execute(f"SELECT DISTINCT End_Customer FROM {self.TABLE} WHERE End_Customer IS NOT NULL AND End_Customer != '' ORDER BY End_Customer")
        return [r["End_Customer"] for r in rows]
    
    def get_machines(self) -> List[str]:
        rows = self._execute(f"SELECT DISTINCT Machine FROM {self.TABLE} WHERE Machine IS NOT NULL AND Machine != '' ORDER BY Machine")
        return [r["Machine"] for r in rows]


class InjectionMoldDB(_BaseDB):
    """Database interface for Injection Mold records."""
    
    TABLE = "injection_molds"
    
    def _row_to_model(self, row: sqlite3.Row) -> InjectionMold:
        return InjectionMold(
            original_tool_no=row["Original_Tool_No"],
            normalized_project_no=row["Normalized_Project_No"],
            project_type=row["Project_Type"],
            description=row["Description"],
            end_customer=row["End_Customer"] if "End_Customer" in row.keys() else None,
            status=row["Status"] if "Status" in row.keys() else None,
            mold_dispatch_date=row["Mold_Dispatch_Date"] if "Mold_Dispatch_Date" in row.keys() else None,
            source_file=row["Source_File"] if "Source_File" in row.keys() else None,
            source_sheet=row["Source_Sheet"] if "Source_Sheet" in row.keys() else None,
        )
    
    def get_all(self) -> List[InjectionMold]:
        rows = self._execute(f"SELECT * FROM {self.TABLE} ORDER BY Normalized_Project_No")
        return [self._row_to_model(r) for r in rows]
    
    def get_by_project_no(self, project_no: str) -> List[InjectionMold]:
        rows = self._execute(
            f"SELECT * FROM {self.TABLE} WHERE Normalized_Project_No = ?",
            (project_no,)
        )
        return [self._row_to_model(r) for r in rows]
    
    def search_by_customer(self, customer: str) -> List[InjectionMold]:
        rows = self._execute(
            f"SELECT * FROM {self.TABLE} WHERE End_Customer LIKE ? ORDER BY Normalized_Project_No",
            (f"%{customer}%",)
        )
        return [self._row_to_model(r) for r in rows]
    
    def search_by_description(self, keyword: str) -> List[InjectionMold]:
        rows = self._execute(
            f"SELECT * FROM {self.TABLE} WHERE Description LIKE ? ORDER BY Normalized_Project_No",
            (f"%{keyword}%",)
        )
        return [self._row_to_model(r) for r in rows]
    
    def count(self) -> int:
        rows = self._execute(f"SELECT COUNT(*) as cnt FROM {self.TABLE}")
        return rows[0]["cnt"]


class JobWorkDB(_BaseDB):
    """Database interface for Job Work records."""
    
    TABLE = "job_works"
    
    def _row_to_model(self, row: sqlite3.Row) -> JobWork:
        return JobWork(
            job_no=row["Job_No"],
            description=row["Description"],
            project_description=row["Project_Description"] if "Project_Description" in row.keys() else None,
            status=row["Status"] if "Status" in row.keys() else None,
            source_file=row["Source_File"] if "Source_File" in row.keys() else None,
            source_sheet=row["Source_Sheet"] if "Source_Sheet" in row.keys() else None,
        )
    
    def get_all(self) -> List[JobWork]:
        rows = self._execute(f"SELECT * FROM {self.TABLE} ORDER BY Job_No")
        return [self._row_to_model(r) for r in rows]
    
    def get_by_job_no(self, job_no: str) -> List[JobWork]:
        rows = self._execute(
            f"SELECT * FROM {self.TABLE} WHERE Job_No = ?",
            (job_no,)
        )
        return [self._row_to_model(r) for r in rows]
    
    def search_by_description(self, keyword: str) -> List[JobWork]:
        rows = self._execute(
            f"SELECT * FROM {self.TABLE} WHERE Description LIKE ? OR Project_Description LIKE ? ORDER BY Job_No",
            (f"%{keyword}%", f"%{keyword}%")
        )
        return [self._row_to_model(r) for r in rows]
    
    def count(self) -> int:
        rows = self._execute(f"SELECT COUNT(*) as cnt FROM {self.TABLE}")
        return rows[0]["cnt"]


class ALPLAStdPartsDB(_BaseDB):
    """Database interface for ALPLA Standard Parts records."""
    
    TABLE = "alpla_std_parts"
    
    def _row_to_model(self, row: sqlite3.Row) -> ALPLAStdPart:
        return ALPLAStdPart(
            original_tool_no=row["Original_Tool_No"] if "Original_Tool_No" in row.keys() else None,
            normalized_project_no=row["Normalized_Project_No"] if "Normalized_Project_No" in row.keys() else None,
            project_type=row["Project_Type"] if "Project_Type" in row.keys() else None,
            description=row["Description"] if "Description" in row.keys() else None,
            m_c_plat_form=row["M_C_Plat_Form"] if "M_C_Plat_Form" in row.keys() else None,
            neck_type=row["Neck_Type"] if "Neck_Type" in row.keys() else None,
            std_parts_status=row["STD_Parts_Status"] if "STD_Parts_Status" in row.keys() else None,
            mold_status=row["Mold_Status"] if "Mold_Status" in row.keys() else None,
            po_number=row["PO_Number"] if "PO_Number" in row.keys() else None,
            po_release_date=row["PO_Release_Date"] if "PO_Release_Date" in row.keys() else None,
            alpla_quote_no=row["ALPLA_Quote_No"] if "ALPLA_Quote_No" in row.keys() else None,
            remarks=row["Remarks"] if "Remarks" in row.keys() else None,
            source_file=row["Source_File"] if "Source_File" in row.keys() else None,
            source_sheet=row["Source_Sheet"] if "Source_Sheet" in row.keys() else None,
        )
    
    def get_all(self) -> List[ALPLAStdPart]:
        rows = self._execute(f"SELECT * FROM {self.TABLE} ORDER BY Normalized_Project_No")
        return [self._row_to_model(r) for r in rows]
    
    def get_by_project_no(self, project_no: str) -> List[ALPLAStdPart]:
        rows = self._execute(
            f"SELECT * FROM {self.TABLE} WHERE Normalized_Project_No = ?",
            (project_no,)
        )
        return [self._row_to_model(r) for r in rows]
    
    def count(self) -> int:
        rows = self._execute(f"SELECT COUNT(*) as cnt FROM {self.TABLE}")
        return rows[0]["cnt"]


class CommercialMoldDB(_BaseDB):
    """Database interface for Commercial Mold Base records."""
    
    TABLE = "commercial_molds"
    
    def _row_to_model(self, row: sqlite3.Row) -> CommercialMold:
        return CommercialMold(
            prathiraj_mold_no=row["Prathiraj_Mold_No"],
            customer_mold_no=row["Customer_Mold_No"] if "Customer_Mold_No" in row.keys() else None,
            supplied_to=row["Supplied_To"] if "Supplied_To" in row.keys() else None,
            description=row["Description"] if "Description" in row.keys() else None,
            source_file=row["Source_File"] if "Source_File" in row.keys() else None,
            source_sheet=row["Source_Sheet"] if "Source_Sheet" in row.keys() else None,
        )
    
    def get_all(self) -> List[CommercialMold]:
        rows = self._execute(f"SELECT * FROM {self.TABLE} ORDER BY Prathiraj_Mold_No")
        return [self._row_to_model(r) for r in rows]
    
    def count(self) -> int:
        rows = self._execute(f"SELECT COUNT(*) as cnt FROM {self.TABLE}")
        return rows[0]["cnt"]


class PartListSummaryDB(_BaseDB):
    """Database interface for Part List Summary records."""
    
    TABLE = "part_list_summaries"
    
    def _row_to_model(self, row: sqlite3.Row) -> PartListSummary:
        return PartListSummary(
            project_no=row["Project_No"],
            revision=row["Revision"],
            file_path=row["File_Path"],
            inserts_cost=row["Inserts_Cost"] if "Inserts_Cost" in row.keys() else None,
            mask_parts_cost=row["Mask_Parts_Cost"] if "Mask_Parts_Cost" in row.keys() else None,
            mold_base_cost=row["Mold_Base_Cost"] if "Mold_Base_Cost" in row.keys() else None,
            standard_parts_cost=row["Standard_Parts_Cost"] if "Standard_Parts_Cost" in row.keys() else None,
            fasteners_cost=row["Fasteners_Cost"] if "Fasteners_Cost" in row.keys() else None,
            electrodes_cost=row["Electrodes_Cost"] if "Electrodes_Cost" in row.keys() else None,
            total_cost=row["Total_Cost"] if "Total_Cost" in row.keys() else None,
        )
    
    def get_all(self) -> List[PartListSummary]:
        rows = self._execute(f"SELECT * FROM {self.TABLE}")
        return [self._row_to_model(r) for r in rows]
    
    def get_by_project(self, project_no: str) -> List[PartListSummary]:
        rows = self._execute(f"SELECT * FROM {self.TABLE} WHERE Project_No = ?", (project_no,))
        return [self._row_to_model(r) for r in rows]
    
    def count(self) -> int:
        rows = self._execute(f"SELECT COUNT(*) as cnt FROM {self.TABLE}")
        return rows[0]["cnt"]


class PartListDetailDB(_BaseDB):
    """Database interface for Part List Detail records."""
    
    TABLE = "part_list_details"
    
    def _row_to_model(self, row: sqlite3.Row) -> PartListDetail:
        return PartListDetail(
            project_no=row["Project_No"],
            revision=row["Revision"],
            part_category=row["Part_Category"],
            description=row["Description"],
            material=row["Material"] if "Material" in row.keys() else None,
            quantity=row["Quantity"] if "Quantity" in row.keys() else None,
            rate=row["Rate"] if "Rate" in row.keys() else None,
            amount=row["Amount"] if "Amount" in row.keys() else None,
            source_file=row["Source_File"] if "Source_File" in row.keys() else None,
            source_sheet=row["Source_Sheet"] if "Source_Sheet" in row.keys() else None,
        )
    
    def get_all(self) -> List[PartListDetail]:
        rows = self._execute(f"SELECT * FROM {self.TABLE}")
        return [self._row_to_model(r) for r in rows]
    
    def get_by_project(self, project_no: str) -> List[PartListDetail]:
        rows = self._execute(f"SELECT * FROM {self.TABLE} WHERE Project_No = ?", (project_no,))
        return [self._row_to_model(r) for r in rows]
    
    def search_by_category(self, category: str) -> List[PartListDetail]:
        rows = self._execute(f"SELECT * FROM {self.TABLE} WHERE Part_Category LIKE ?", (f"%{category}%",))
        return [self._row_to_model(r) for r in rows]
    
    def count(self) -> int:
        rows = self._execute(f"SELECT COUNT(*) as cnt FROM {self.TABLE}")
        return rows[0]["cnt"]


class MasterDataDB(_BaseDB):
    """Unified interface to query across all tables."""
    
    def __init__(self, db_path: str = None):
        super().__init__(db_path)
        self.blow_molds = BlowMoldDB(db_path)
        self.injection_molds = InjectionMoldDB(db_path)
        self.job_works = JobWorkDB(db_path)
        self.alpla_std_parts = ALPLAStdPartsDB(db_path)
        self.commercial_molds = CommercialMoldDB(db_path)
        self.part_list_summaries = PartListSummaryDB(db_path)
        self.part_list_details = PartListDetailDB(db_path)
    
    def stats(self) -> Dict[str, int]:
        return {
            "blow_molds": self.blow_molds.count(),
            "injection_molds": self.injection_molds.count(),
            "job_works": self.job_works.count(),
            "alpla_std_parts": self.alpla_std_parts.count(),
            "commercial_molds": self.commercial_molds.count(),
            "part_list_summaries": self.part_list_summaries.count(),
            "part_list_details": self.part_list_details.count(),
        }
    
    def find_project(self, project_no: str) -> Dict[str, list]:
        """Search for a project number across all relevant tables."""
        return {
            "blow_molds": self.blow_molds.get_by_project_no(project_no),
            "injection_molds": self.injection_molds.get_by_project_no(project_no),
            "alpla_std_parts": self.alpla_std_parts.get_by_project_no(project_no),
            "part_list_summaries": self.part_list_summaries.get_by_project(project_no),
            "part_list_details": self.part_list_details.get_by_project(project_no),
        }
