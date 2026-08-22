"""Process Planning Parser — BMxxx_Process planning sheet.xlsx files."""
import re
from pathlib import Path
import pandas as pd

from parsers.base import BaseParser
from models import SessionLocal, ProjectMaster, ProcessPlanning


class ProcessPlanningParser(BaseParser):
    parser_name = "process_planning"
    supported_extensions = [".xlsx"]

    def can_parse(self, file_path: Path) -> bool:
        if not super().can_parse(file_path):
            return False
        return "Process planning" in file_path.name or "Process Planning" in file_path.name

    def parse(self, file_path: Path) -> dict:
        ds_id = self.create_data_source(file_path)
        xl = pd.ExcelFile(file_path)

        # Extract project number from filename
        project_num = self.extract_project_number(file_path.name)
        if not project_num:
            self.warnings.append(f"Cannot extract project number from filename: {file_path.name}")
            return self.get_stats()

        for sheet_name in xl.sheet_names:
            try:
                df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
                self._parse_sheet(df, file_path, sheet_name, ds_id, project_num)
            except Exception as e:
                self.errors.append(f"Sheet {sheet_name}: {e}")

        return self.get_stats()

    def _parse_sheet(self, df: pd.DataFrame, file_path: Path, sheet_name: str, ds_id: int, project_num: str):
        # Find header row with S.NO
        header_row = None
        for idx, row in df.iterrows():
            if any("S.NO" in str(v) or "S.NO" in str(v) for v in row.values if pd.notna(v)):
                header_row = idx
                break
        if header_row is None:
            self.warnings.append(f"No S.NO header in {sheet_name}")
            return

        df_data = pd.read_excel(file_path, sheet_name=sheet_name, header=header_row)
        df_data = df_data.reset_index(drop=True)

        # Find project name from first cell of header row or filename
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

            # Identify step columns (usually after the first "3D modeling" or similar)
            # The structure is typically: S.NO, StepName, [multiple status columns]
            # We treat each row as a process step
            for idx, row in df_data.iterrows():
                s_no = self.clean_value(row.iloc[0])
                step_name = self.clean_value(row.iloc[1]) if len(row) > 1 else None
                if not step_name:
                    continue

                # Check status columns (typically from column 5 onwards)
                status = None
                for col in df_data.columns[2:]:
                    val = self.clean_value(row.get(col))
                    if val and str(val).upper() in ("COMPLETED", "PENDING", "IN-PROGRESS", "DONE"):
                        status = str(val).upper()
                        break

                step_name_str = str(step_name)[:200]
                step_category = None
                if "3D" in step_name_str.upper() or "MODELING" in step_name_str.upper():
                    step_category = "3D MODELING"
                elif "MOLD BASE" in step_name_str.upper():
                    step_category = "MOLD BASE"
                elif "ELECTRODE" in step_name_str.upper():
                    step_category = "ELECTRODE"
                elif "MACHINING" in step_name_str.upper():
                    step_category = "MACHINING"
                elif "ASSEMBLY" in step_name_str.upper():
                    step_category = "ASSEMBLY"
                else:
                    step_category = "GENERAL"

                pp = ProcessPlanning(
                    project_id=project.id,
                    step_number=int(s_no) if s_no is not None else None,
                    step_name=step_name_str,
                    step_category=step_category,
                    status=status or "UNKNOWN",
                    source_file=file_path.name,
                    source_sheet=sheet_name,
                    source_row=idx + 1,
                )
                db.add(pp)
                db.commit()
                db.refresh(pp)
                self.add_provenance(ds_id, "process_planning", pp.id, idx + 1)
                self.imported += 1

        finally:
            db.close()
