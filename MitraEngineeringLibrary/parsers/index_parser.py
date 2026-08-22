"""Index Sheet Parser — BM-xxx INDEX SHEET.xlsx"""
import re
from pathlib import Path
import pandas as pd

from parsers.base import BaseParser
from models import SessionLocal, ProjectMaster, DocumentIndex


class IndexParser(BaseParser):
    parser_name = "index_sheet"
    supported_extensions = [".xlsx"]

    def can_parse(self, file_path: Path) -> bool:
        if not super().can_parse(file_path):
            return False
        return "INDEX SHEET" in file_path.name.upper()

    def parse(self, file_path: Path) -> dict:
        ds_id = self.create_data_source(file_path)
        project_num = self.extract_project_number(file_path.name)
        if not project_num:
            self.warnings.append(f"Cannot extract project number from {file_path.name}")
            return self.get_stats()

        df = pd.read_excel(file_path, sheet_name=0, header=None)

        # Find header row with S.NO
        header_row = None
        for idx, row in df.iterrows():
            if any("S.NO" in str(v) for v in row.values if pd.notna(v)):
                header_row = idx
                break
        if header_row is None:
            self.warnings.append("No S.NO header found")
            return self.get_stats()

        df_data = pd.read_excel(file_path, sheet_name=0, header=header_row)
        df_data = df_data.reset_index(drop=True)

        prefix = re.match(r"([A-Z]+)", project_num).group(1)

        db = SessionLocal()
        try:
            project = db.query(ProjectMaster).filter_by(project_number=project_num).first()
            if not project:
                project = ProjectMaster(
                    project_number=project_num,
                    project_prefix=prefix,
                    project_name=project_num,
                )
                db.add(project)
                db.commit()
                db.refresh(project)
                self.imported += 1
            else:
                self.duplicates += 1

            for idx, row in df_data.iterrows():
                s_no = self._to_int(row.iloc[0]) if len(row) > 0 else None
                if s_no is None:
                    continue

                desc = self.clean_value(row.iloc[1]) if len(row) > 1 else None
                sub_desc = self.clean_value(row.iloc[2]) if len(row) > 2 else None
                page_no = self.clean_value(row.iloc[3]) if len(row) > 3 else None
                remarks = self.clean_value(row.iloc[4]) if len(row) > 4 else None

                di = DocumentIndex(
                    project_id=project.id,
                    serial_no=s_no,
                    description=str(desc)[:500] if desc else None,
                    sub_description=str(sub_desc)[:500] if sub_desc else None,
                    page_no=str(page_no)[:50] if page_no else None,
                    remarks=str(remarks)[:500] if remarks else None,
                    source_file=file_path.name,
                    source_sheet="Sheet1",
                    source_row=idx + 1,
                )
                db.add(di)
                db.commit()
                db.refresh(di)
                self.add_provenance(ds_id, "document_index", di.id, idx + 1)
                self.imported += 1

        finally:
            db.close()

        return self.get_stats()

    def _to_int(self, val):
        val = self.clean_value(val)
        if val is None:
            return None
        try:
            return int(float(str(val).strip()))
        except (ValueError, TypeError):
            return None
