"""Component Details Parser — component Details.xlsx"""
import re
from pathlib import Path
import pandas as pd

from parsers.base import BaseParser
from models import SessionLocal, ProjectMaster, ComponentDetail


class ComponentParser(BaseParser):
    parser_name = "component_details"
    supported_extensions = [".xlsx"]

    def can_parse(self, file_path: Path) -> bool:
        if not super().can_parse(file_path):
            return False
        return "component Details" in file_path.name or "Component Details" in file_path.name

    def parse(self, file_path: Path) -> dict:
        ds_id = self.create_data_source(file_path)
        xl = pd.ExcelFile(file_path)

        for sheet_name in xl.sheet_names:
            try:
                df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
                self._parse_sheet(df, file_path, sheet_name, ds_id)
            except Exception as e:
                self.errors.append(f"Sheet {sheet_name}: {e}")

        return self.get_stats()

    def _parse_sheet(self, df: pd.DataFrame, file_path: Path, sheet_name: str, ds_id: int):
        # Find header row with "Tool No"
        header_row = None
        for idx, row in df.iterrows():
            if any("Tool No" in str(v) for v in row.values if pd.notna(v)):
                header_row = idx
                break
        if header_row is None:
            self.warnings.append(f"No Tool No header in {sheet_name}")
            return

        df_data = pd.read_excel(file_path, sheet_name=sheet_name, header=header_row)
        df_data = df_data.reset_index(drop=True)

        # Find column indices flexibly
        cols = {str(c).lower().strip(): c for c in df_data.columns}

        def get_col(*names):
            for n in names:
                if n in cols:
                    return cols[n]
            return None

        tool_col = get_col("tool no", "tool_no", "toolno")
        desc_col = get_col("description", "desc")
        cavity_col = get_col("cavity", "cavities")
        mat_col = get_col("material", "resin")
        weight_col = get_col("component weight", "component_weight", "weight")
        volume_col = get_col("volume", "vol")
        shape_col = get_col("shape")
        ma_col = get_col("ma")
        mi_col = get_col("mi")
        th_col = get_col("th")

        db = SessionLocal()
        try:
            for idx, row in df_data.iterrows():
                tool_no_raw = self.clean_value(row.get(tool_col)) if tool_col else None
                if not tool_no_raw:
                    continue

                project_num = self.extract_project_number(str(tool_no_raw))
                # Fallback: bare numbers like "276" are likely BM276
                if not project_num and str(tool_no_raw).strip().isdigit():
                    project_num = f"BM{tool_no_raw}"
                project_id = None
                if project_num:
                    prefix = re.match(r"([A-Z]+)", project_num).group(1)
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
                    project_id = project.id
                else:
                    self.unmapped.append(f"Row {idx}: tool_no '{tool_no_raw}' not parseable")

                description = self.clean_value(row.get(desc_col)) if desc_col else None
                cavity = self._to_int(row.get(cavity_col)) if cavity_col else None
                material = self.clean_value(row.get(mat_col)) if mat_col else None
                weight = self._to_float(row.get(weight_col)) if weight_col else None
                volume = self._to_float(row.get(volume_col)) if volume_col else None
                shape = self.clean_value(row.get(shape_col)) if shape_col else None
                ma = self.clean_value(row.get(ma_col)) if ma_col else None
                mi = self.clean_value(row.get(mi_col)) if mi_col else None
                th = self.clean_value(row.get(th_col)) if th_col else None

                cd = ComponentDetail(
                    project_id=project_id,
                    tool_no=str(tool_no_raw)[:50],
                    description=str(description)[:500] if description else None,
                    cavity=cavity,
                    material=str(material)[:100] if material else None,
                    component_weight_gm=weight,
                    volume_ml=volume,
                    shape=str(shape)[:50] if shape else None,
                    ma=str(ma)[:50] if ma else None,
                    mi=str(mi)[:50] if mi else None,
                    th=str(th)[:50] if th else None,
                    source_file=file_path.name,
                    source_sheet=sheet_name,
                    source_row=idx + 1,
                )
                db.add(cd)
                db.commit()
                db.refresh(cd)
                self.add_provenance(ds_id, "component_detail", cd.id, idx + 1)
                self.imported += 1

        finally:
            db.close()

    def _to_float(self, val):
        val = self.clean_value(val)
        if val is None:
            return None
        try:
            s = str(val).replace(",", ".").replace("g", "").replace("ml", "").replace(" ", "").strip()
            return float(s)
        except (ValueError, TypeError):
            return None

    def _to_int(self, val):
        val = self.clean_value(val)
        if val is None:
            return None
        try:
            return int(float(str(val).replace(",", "").strip()))
        except (ValueError, TypeError):
            return None
