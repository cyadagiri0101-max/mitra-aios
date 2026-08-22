"""Cycle Time Parser — 029_Blow Molds Cycle Times.xlsx"""
import re
from pathlib import Path
import pandas as pd

from parsers.base import BaseParser
from models import SessionLocal, ProjectMaster, MachineMaster, CycleTimeHistory


class CycleTimeParser(BaseParser):
    parser_name = "cycle_times"
    supported_extensions = [".xlsx"]

    def can_parse(self, file_path: Path) -> bool:
        if not super().can_parse(file_path):
            return False
        return "Cycle Times" in file_path.name

    def parse(self, file_path: Path) -> dict:
        ds_id = self.create_data_source(file_path)
        df = pd.read_excel(file_path, sheet_name=0, header=None)

        # Find the data area (skip empty rows)
        data_start = None
        for idx, row in df.iterrows():
            if any("MACHINE" in str(v) for v in row.values if pd.notna(v)):
                data_start = idx
                break
        if data_start is None:
            self.warnings.append("No MACHINE header found")
            return self.get_stats()

        # Read with header
        df = pd.read_excel(file_path, sheet_name=0, header=data_start)
        df = df.reset_index(drop=True)

        db = SessionLocal()
        try:
            for idx, row in df.iterrows():
                machine_raw = self.clean_value(row.get("MACHINE", None))
                weight = self._to_float(row.get("PRODUCT WEIGHT", None))
                cavitation = self.clean_value(row.get("CAVITATION", None))
                cycle_time = self._to_float(row.get("CYCLE TIME", None))
                remarks = self.clean_value(row.get("REMARKS", None))

                if not machine_raw:
                    continue

                # Skip text notes that are not machine names
                machine_str = str(machine_raw).strip()
                if any(machine_str.startswith(x) for x in ["1.", "2.", "Notes", "Machine performance", "Running", "Quoted", "time even"]):
                    self.warnings.append(f"Skipped text note: '{machine_str[:50]}'")
                    continue
                if len(machine_str) > 50 and ("." in machine_str or ":" in machine_str):
                    self.warnings.append(f"Skipped long text entry: '{machine_str[:50]}...'")
                    continue

                # Upsert machine
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

                ct = CycleTimeHistory(
                    machine_id=machine.id,
                    product_weight_gm=weight,
                    cavitation=str(cavitation)[:50] if cavitation else None,
                    cycle_time_sec=cycle_time,
                    remarks=str(remarks)[:500] if remarks else None,
                    source_file=file_path.name,
                    source_sheet="Sheet1",
                    source_row=idx + 1,
                )
                db.add(ct)
                db.commit()
                db.refresh(ct)
                self.add_provenance(ds_id, "cycle_time_history", ct.id, idx + 1)
                self.imported += 1

        finally:
            db.close()

        return self.get_stats()

    def _to_float(self, val):
        val = self.clean_value(val)
        if val is None:
            return None
        try:
            s = str(val).replace(",", ".").replace("sec", "").replace("Sec", "").strip()
            return float(s)
        except (ValueError, TypeError):
            return None
