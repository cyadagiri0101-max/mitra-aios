"""Blow Mold Data Parser — Internal Study sheets."""
import re
from pathlib import Path
from datetime import datetime
from typing import Optional
import pandas as pd

from parsers.base import BaseParser
from models import SessionLocal, ProjectMaster, ProductMaster, BottleFamily, MachineMaster, MaterialMaster


class BlowMoldParser(BaseParser):
    parser_name = "blow_mold_internal_study"
    supported_extensions = [".xlsx"]

    def can_parse(self, file_path: Path) -> bool:
        if not super().can_parse(file_path):
            return False
        return "Blow Molds Data for Internal Study" in file_path.name

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
        # Find header row (row with "Tool No")
        header_row = None
        for idx, row in df.iterrows():
            if any("Tool No" in str(v) for v in row.values if pd.notna(v)):
                header_row = idx
                break
        if header_row is None:
            self.warnings.append(f"No header row found in {sheet_name}")
            return

        # Use header row to read data
        df_data = pd.read_excel(file_path, sheet_name=sheet_name, header=header_row)
        df_data = df_data.reset_index(drop=True)

        # Find the "Tool No" column (may be Unnamed: 0)
        tool_no_col = None
        for c in df_data.columns:
            if "Tool No" in str(c):
                tool_no_col = c
                break
        if tool_no_col is None:
            tool_no_col = df_data.columns[0]

        db = SessionLocal()
        try:
            for idx, row in df_data.iterrows():
                tool_no_raw = self.clean_value(row.get(tool_no_col))
                if not tool_no_raw:
                    continue

                project_num = self.extract_project_number(str(tool_no_raw))
                if not project_num:
                    self.unmapped.append(f"Row {idx}: cannot parse tool_no '{tool_no_raw}'")
                    continue

                # Upsert project
                prefix = re.match(r"([A-Z]+)", project_num).group(1)
                project = db.query(ProjectMaster).filter_by(project_number=project_num).first()
                if not project:
                    project = ProjectMaster(
                        project_number=project_num,
                        project_prefix=prefix,
                        project_name=str(self.clean_value(row.get("Mold Name", row.get(df_data.columns[1], ""))) or "")[:300],
                    )
                    db.add(project)
                    db.commit()
                    db.refresh(project)
                    self.imported += 1
                else:
                    self.duplicates += 1

                # Extract fields
                mold_name = self.clean_value(row.get("Mold Name", row.get(df_data.columns[1] if len(df_data.columns) > 1 else None, None)))
                cavitation = self.clean_value(row.get("Cavitation", None))
                machine_raw = self.clean_value(row.get("Machine", None))
                process = self.clean_value(row.get("Process", None))
                product_type = self.clean_value(row.get("Product Type", None))
                weight = self._to_float(row.get("product Weight (gm)", None))
                flash_weight = self._to_float(row.get("Product+Flash (gm)", None))
                parison_len = self._to_float(row.get("Calucualted parision lenth (mm)", None))
                resin = self.clean_value(row.get("Resin", None))
                height = self._to_float(row.get("Product Height (mm)", None))
                volume = self._to_float(row.get("Product Volume(ml)", None))
                size = self.clean_value(row.get("Product Size", None))
                remarks = self.clean_value(row.get("Remarks", None))

                # Upsert machine
                machine_id = None
                if machine_raw:
                    machine = db.query(MachineMaster).filter_by(machine_code=str(machine_raw)[:50]).first()
                    if not machine:
                        machine = MachineMaster(
                            machine_code=str(machine_raw)[:50],
                            machine_name=str(machine_raw)[:200],
                            machine_type="Blow",
                        )
                        db.add(machine)
                        db.commit()
                        db.refresh(machine)
                    machine_id = machine.id

                # Upsert material
                material_id = None
                if resin:
                    mat = db.query(MaterialMaster).filter_by(material_code=str(resin)[:50]).first()
                    if not mat:
                        mat = MaterialMaster(
                            material_code=str(resin)[:50],
                            material_name=str(resin)[:200],
                            material_type=str(resin)[:100],
                        )
                        db.add(mat)
                        db.commit()
                        db.refresh(mat)
                    material_id = mat.id

                # Upsert product with project link and variant
                product_name = str(mold_name or product_type or "Unknown")[:300]
                product_variant = str(product_type)[:100] if product_type else None
                product = db.query(ProductMaster).filter_by(
                    product_name=product_name, project_id=project.id
                ).first()
                if not product:
                    product = ProductMaster(
                        project_id=project.id,
                        product_name=product_name,
                        product_variant=product_variant,
                        volume_ml=volume,
                        weight_gm=weight,
                        height_mm=height,
                        material=resin,
                        description=remarks,
                    )
                    db.add(product)
                    db.commit()
                    db.refresh(product)

                # Create product record only (NOT cycle_time — this is product data, not cycle time data)
                self.imported += 1

        finally:
            db.close()

    def _to_float(self, val) -> Optional[float]:
        val = self.clean_value(val)
        if val is None:
            return None
        try:
            # Handle commas as decimal separators and European formats
            s = str(val).replace(",", ".").replace(" ", "")
            return float(s)
        except (ValueError, TypeError):
            return None
