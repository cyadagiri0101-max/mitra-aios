import re
from pathlib import Path
import pandas as pd

from parsers.base import BaseParser
from models import SessionLocal, ProjectMaster, PartList, CustomerMaster, BottleFamily, ProductMaster


class PartListParser(BaseParser):
    parser_name = "part_list"
    supported_extensions = [".xlsx"]

    # Map sheet names to part categories
    SHEET_CATEGORIES = {
        "mold and mask parts": "INSERT/MAIN",
        "mold base parts": "MOLD BASE",
        "standard parts": "STANDARD",
        "fastners": "FASTENER",
        "elec": "ELECTRODE",
    }

    def can_parse(self, file_path: Path) -> bool:
        if not super().can_parse(file_path):
            return False
        name = file_path.name
        return "Partlist" in name or "PartList" in name or "Part list" in name.lower()

    def parse(self, file_path: Path) -> dict:
        ds_id = self.create_data_source(file_path)
        xl = pd.ExcelFile(file_path)
        project_num = self.extract_project_number(file_path.name)
        if not project_num:
            self.warnings.append(f"Cannot extract project number from filename: {file_path.name}")
            return self.get_stats()

        prefix = re.match(r"([A-Z]+)", project_num).group(1)

        # Extract customer and family/variant from workbook (highest priority)
        workbook_customer = self._extract_customer_from_workbook_headers(xl)
        family, variant = self._extract_family_and_variant_from_workbook(xl)

        # Fallback to filename (lowest priority)
        filename_customer = self.extract_customer_from_filename(file_path)
        filename_family = self.extract_bottle_family_from_filename(file_path)
        filename_variant = self._extract_variant_from_filename(file_path)

        customer_name = workbook_customer or filename_customer
        family_name = family or filename_family
        product_variant = variant or filename_variant

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

            # Upsert customer
            if customer_name:
                customer = db.query(CustomerMaster).filter_by(customer_code=customer_name.upper()).first()
                if not customer:
                    customer = CustomerMaster(
                        customer_code=customer_name.upper(),
                        customer_name=customer_name,
                    )
                    db.add(customer)
                    db.commit()
                    db.refresh(customer)
                    self.imported += 1

                # Link customer to project
                from models import ProjectCustomerLink
                link = db.query(ProjectCustomerLink).filter_by(project_id=project.id, customer_id=customer.id).first()
                if not link:
                    link = ProjectCustomerLink(project_id=project.id, customer_id=customer.id)
                    db.add(link)
                    db.commit()

            # Upsert bottle family and update product variant
            if family_name:
                family_rec = db.query(BottleFamily).filter_by(family_name=family_name).first()
                if not family_rec:
                    family_rec = BottleFamily(
                        family_name=family_name,
                        description=f"Family derived from {file_path.name}",
                    )
                    db.add(family_rec)
                    db.commit()
                    db.refresh(family_rec)
                    self.imported += 1

                # Update or create product with variant
                product = db.query(ProductMaster).filter_by(project_id=project.id).first()
                if not product:
                    product = ProductMaster(
                        project_id=project.id,
                        product_name=f"{family_name} {product_variant or ''}"[:300],
                        product_variant=product_variant[:100] if product_variant else None,
                        bottle_family_id=family_rec.id,
                    )
                    db.add(product)
                    db.commit()
                    db.refresh(product)
                    self.imported += 1
                else:
                    if product_variant and product.product_variant != product_variant:
                        product.product_variant = product_variant[:100]
                    if product.bottle_family_id is None:
                        product.bottle_family_id = family_rec.id
                    db.commit()

            project_id = project.id
        finally:
            db.close()

        for sheet_name in xl.sheet_names:
            try:
                category = self._detect_category(sheet_name)
                if not category:
                    continue  # skip summary, WQF, etc.
                df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
                self._parse_sheet(df, file_path, sheet_name, ds_id, project_id, category)
            except Exception as e:
                self.errors.append(f"Sheet {sheet_name}: {e}")

        return self.get_stats()

    def _extract_customer_from_workbook_headers(self, xl) -> str:
        """Read TOOL NO header lines from workbook sheets for customer name."""
        for sheet_name in xl.sheet_names:
            try:
                df = pd.read_excel(xl, sheet_name=sheet_name, header=None)
                for idx, row in df.iterrows():
                    for val in row.values:
                        if pd.notna(val) and isinstance(val, str) and "TOOL NO" in val.upper():
                            match = re.search(r"TOOL NO\s*:?\s*([A-Z]+\d+)\s+([A-Za-z]+)", val, re.IGNORECASE)
                            if match:
                                customer = match.group(2)
                                false_positives = {"BLOW", "MOLD", "MOLDS", "CAVITY", "PROCESS", "DATA", "INDEX", "SHEET", "PLANNING", "COMPONENT", "DETAILS", "CYCLE", "TIMES", "ML", "MM", "FN", "STANDARD", "FASTNER", "ELEC", "ELECTRODE", "MAIN", "MASK", "BASE", "PART", "LIST", "REV", "VBL"}
                                if customer.upper() not in false_positives and len(customer) >= 3 and customer.isalpha():
                                    return customer
            except Exception:
                pass
        return None

    def _extract_family_and_variant_from_workbook(self, xl) -> tuple:
        """Extract bottle family and product variant from TOOL NO header."""
        for sheet_name in xl.sheet_names:
            try:
                df = pd.read_excel(xl, sheet_name=sheet_name, header=None)
                for idx, row in df.iterrows():
                    for val in row.values:
                        if pd.notna(val) and isinstance(val, str) and "TOOL NO" in val.upper():
                            # Example: "TOOL NO :BM454 Veedol 600ml M01 08Cavity Mold SEB101 FN"
                            # Family = Veedol, Variant = 600ml
                            match = re.search(r"TOOL NO\s*:?\s*[A-Z]+\d+\s+([A-Za-z]+)\s+([0-9]+(?:\.[0-9]+)?(?:ml|cc|g|gm|l)?)", val, re.IGNORECASE)
                            if match:
                                family = match.group(1)
                                variant = match.group(2)
                                false_positives = {"BLOW", "MOLD", "MOLDS", "CAVITY", "PROCESS", "DATA", "INDEX", "SHEET", "PLANNING", "COMPONENT", "DETAILS", "CYCLE", "TIMES", "ML", "MM", "FN", "STANDARD", "FASTNER", "ELEC", "ELECTRODE", "MAIN", "MASK", "BASE", "PART", "LIST", "REV", "VBL"}
                                if family.upper() not in false_positives and len(family) >= 3 and family.isalpha():
                                    return family, variant
            except Exception:
                pass
        return None, None

    def _extract_variant_from_filename(self, file_path: Path) -> str:
        """Extract product variant (e.g., 600ml) from filename."""
        name = file_path.stem
        parts = name.replace("_", " ").split()
        for part in parts:
            if any(x in part.lower() for x in ["ml", "cc", "l"]):
                return part
            if part.isdigit() and len(part) <= 4:
                return part
        return None

    def _detect_category(self, sheet_name: str) -> str:
        name_lower = sheet_name.lower().strip()
        for key, cat in self.SHEET_CATEGORIES.items():
            if key in name_lower:
                return cat
        return None

    def _parse_sheet(self, df: pd.DataFrame, file_path: Path, sheet_name: str, ds_id: int, project_id: int, category: str):
        # Find header row with "S.NO" or "DESCRIPTION"
        header_row = None
        for idx, row in df.iterrows():
            if any("S.NO" in str(v) or "DESCRIPTION" in str(v) for v in row.values if pd.notna(v)):
                header_row = idx
                break
        if header_row is None:
            self.warnings.append(f"No header row in sheet {sheet_name}")
            return

        df_data = pd.read_excel(file_path, sheet_name=sheet_name, header=header_row)
        df_data = df_data.reset_index(drop=True)

        db = SessionLocal()
        try:
            for idx, row in df_data.iterrows():
                # Try to find description column
                desc_col = None
                for c in df_data.columns:
                    if "DESCRIPTION" in str(c).upper():
                        desc_col = c
                        break
                if desc_col is None:
                    desc_col = df_data.columns[1] if len(df_data.columns) > 1 else None

                description = self.clean_value(row.get(desc_col)) if desc_col else None
                if not description:
                    continue
                desc_str = str(description)[:500]

                # Skip header-like rows
                if desc_str.upper() in ("DESCRIPTION", "ITEM", "S.NO"):
                    continue

                # Extract other fields flexibly
                material = None
                grade = None
                qty = None
                rate = None
                amount = None
                supplier = None
                part_type = None
                weight = None
                total_weight = None
                length = None
                height = None
                width = None
                remarks = None
                part_number = None

                for c in df_data.columns:
                    c_str = str(c).upper()
                    val = self.clean_value(row.get(c))
                    if val is None:
                        continue
                    if "MATERIAL" in c_str and not material:
                        material = str(val)[:200]
                    elif "GRADE" in c_str and not grade:
                        grade = str(val)[:200]
                    elif c_str == "QTY" or "QTY" in c_str and qty is None:
                        qty = self._to_float(val)
                    elif "RATE" in c_str and rate is None:
                        rate = self._to_float(val)
                    elif "AMOUNT" in c_str and amount is None:
                        amount = self._to_float(val)
                    elif "SUPPLIER" in c_str and not supplier:
                        supplier = str(val)[:200]
                    elif "PART TYPE" in c_str and not part_type:
                        part_type = str(val)[:50]
                    elif "PART NUMBER" in c_str and not part_number:
                        part_number = str(val)[:100]
                    elif "WEIGHT" in c_str and "TOTAL" not in c_str and weight is None:
                        weight = self._to_float(val)
                    elif "TOTAL" in c_str and "WEIGHT" in c_str and total_weight is None:
                        total_weight = self._to_float(val)
                    elif ("LENGTH" in c_str or "DIA" in c_str) and length is None:
                        length = self._to_float(val)
                    elif "HEIGHT" in c_str and height is None:
                        height = self._to_float(val)
                    elif "WIDTH" in c_str and width is None:
                        width = self._to_float(val)
                    elif "REMARKS" in c_str and not remarks:
                        remarks = str(val)[:500]

                pl = PartList(
                    project_id=project_id,
                    part_category=category,
                    part_number=part_number,
                    description=desc_str,
                    material=material,
                    grade=grade,
                    quantity=qty,
                    finished_size_l=length,
                    finished_size_h=height,
                    finished_size_w=width,
                    weight=weight,
                    total_weight=total_weight,
                    rate=rate,
                    amount=amount,
                    supplier=supplier,
                    part_type=part_type,
                    remarks=remarks,
                    source_file=file_path.name,
                    source_sheet=sheet_name,
                    source_row=idx + 1,
                )
                db.add(pl)
                db.commit()
                db.refresh(pl)
                self.add_provenance(ds_id, "part_list", pl.id, idx + 1)
                self.imported += 1

        finally:
            db.close()

    def _to_float(self, val):
        val = self.clean_value(val)
        if val is None:
            return None
        try:
            s = str(val).replace(",", "").replace("x", "").replace("ø", "").strip()
            return float(s)
        except (ValueError, TypeError):
            return None
