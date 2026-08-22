"""Base Parser — all parsers extend this."""
import re
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Any, Optional, List
import pandas as pd

from models import DataSource, Provenance, SessionLocal
from config import settings


class BaseParser:
    """Base class for all file parsers with provenance tracking."""

    # Override in subclasses
    parser_name: str = "base"
    supported_extensions: List[str] = []

    def __init__(self, batch_id: str):
        self.batch_id = batch_id
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.unmapped: List[str] = []
        self.imported = 0
        self.updated = 0
        self.duplicates = 0

    def can_parse(self, file_path: Path) -> bool:
        return file_path.suffix.lower() in self.supported_extensions

    def compute_hash(self, file_path: Path) -> str:
        h = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()

    def create_data_source(self, file_path: Path, sheet: Optional[str] = None) -> int:
        """Record the source file in the database. Returns data_source_id."""
        db = SessionLocal()
        try:
            ds = DataSource(
                source_file=str(file_path.name),
                source_sheet=sheet,
                import_date=datetime.utcnow(),
                import_batch_id=self.batch_id,
                file_hash=self.compute_hash(file_path),
                file_size=file_path.stat().st_size,
            )
            db.add(ds)
            db.commit()
            db.refresh(ds)
            return ds.id
        finally:
            db.close()

    def add_provenance(self, data_source_id: int, table_name: str, record_id: int, row_number: Optional[int] = None):
        db = SessionLocal()
        try:
            prov = Provenance(
                data_source_id=data_source_id,
                table_name=table_name,
                record_id=record_id,
                source_row_number=row_number,
            )
            db.add(prov)
            db.commit()
        finally:
            db.close()

    def extract_project_number(self, text: str) -> Optional[str]:
        """Extract project number like BM454, IM123, etc."""
        if not text:
            return None
        text = str(text).upper().replace("-", "").replace(" ", "")
        # Match BM, IM, IBM, PD, E, O, CMB, F, S followed by digits
        match = re.search(r"(BM|IM|IBM|PD|CMB|F|S|E|O)(\d+)", text)
        if match:
            prefix = match.group(1)
            number = match.group(2)
            return f"{prefix}{number}"
        return None

    def clean_value(self, val: Any) -> Optional[Any]:
        """Normalize NaN, empty strings, etc."""
        if pd.isna(val):
            return None
        if isinstance(val, str):
            val = val.strip()
            if val == "" or val.lower() in ("nan", "none", "null", "na"):
                return None
        return val

    def extract_customer_from_filename(self, file_path: Path) -> Optional[str]:
        """Extract customer name from filename like 'BM454 Veedol 600ml...'"""
        name = file_path.stem
        # Skip obvious non-customer tokens
        skip_tokens = {"PROCESS", "PLANNING", "SHEET", "INDEX", "BLOW", "MOLDS", 
                       "CYCLE", "TIMES", "COMPONENT", "DETAILS", "PARTLIST", "PART",
                       "LIST", "REV", "MOLD", "CAVITY", "ML", "MM", "DATA", "STUDY"}
        parts = name.replace("_", " ").split()
        for part in parts[1:]:  # skip project number (first part)
            p_upper = part.upper()
            if p_upper in skip_tokens or p_upper.startswith("REV") or p_upper.isdigit():
                continue
            if len(part) >= 3 and part.isalpha():
                return part
        return None

    def extract_bottle_family_from_filename(self, file_path: Path) -> Optional[str]:
        """Extract bottle family from filename. Same as customer for now."""
        return self.extract_customer_from_filename(file_path)

    def parse(self, file_path: Path) -> dict:
        """Override in subclasses. Must return a dict with stats."""
        raise NotImplementedError

    def get_stats(self) -> dict:
        return {
            "parser": self.parser_name,
            "imported": self.imported,
            "updated": self.updated,
            "duplicates": self.duplicates,
            "errors": len(self.errors),
            "warnings": len(self.warnings),
            "unmapped": self.unmapped[:20],  # cap
        }
