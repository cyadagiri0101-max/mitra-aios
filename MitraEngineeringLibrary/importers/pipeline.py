"""Import Pipeline — orchestrates all parsers."""
import uuid
from datetime import datetime
from pathlib import Path
from typing import List

from parsers import (
    BlowMoldParser, CycleTimeParser, ProcessPlanningParser,
    PartListParser, ComponentParser, IndexParser,
)
from models import SessionLocal, ImportLog
from config import settings


class ImportPipeline:
    def __init__(self):
        self.batch_id = f"batch-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"
        self.parsers = [
            BlowMoldParser(self.batch_id),
            CycleTimeParser(self.batch_id),
            ProcessPlanningParser(self.batch_id),
            PartListParser(self.batch_id),
            ComponentParser(self.batch_id),
            IndexParser(self.batch_id),
        ]
        self.stats = []
        self.errors = []
        self.warnings = []

    def run(self, source_dir: Path = None) -> dict:
        if source_dir is None:
            source_dir = settings.SOURCE_DIR

        db = SessionLocal()
        try:
            log = ImportLog(
                batch_id=self.batch_id,
                started_at=datetime.utcnow(),
                status="RUNNING",
            )
            db.add(log)
            db.commit()
        finally:
            db.close()

        files = sorted(source_dir.glob("*.xlsx"))
        if not files:
            self.errors.append(f"No .xlsx files found in {source_dir}")
            return {"status": "FAILED", "errors": self.errors}

        # Deduplicate by file hash (skip identical files with different names)
        seen_hashes = {}
        skipped_duplicates = 0
        for file_path in list(files):
            if file_path.name.startswith("~"):
                files.remove(file_path)
                continue
            h = self._compute_hash(file_path)
            if h in seen_hashes:
                self.warnings.append(f"Skipped duplicate file: {file_path.name} (same as {seen_hashes[h]})")
                skipped_duplicates += 1
                files.remove(file_path)
                continue
            seen_hashes[h] = file_path.name

        for file_path in files:
            print(f"Processing: {file_path.name}")
            parsed = False
            for parser in self.parsers:
                if parser.can_parse(file_path):
                    try:
                        result = parser.parse(file_path)
                        self.stats.append({"file": file_path.name, **result})
                        parsed = True
                        break
                    except Exception as e:
                        self.errors.append(f"{parser.parser_name} on {file_path.name}: {e}")
            if not parsed:
                self.stats.append({"file": file_path.name, "skipped": True, "reason": "no matching parser"})

        # Update log
        total_imported = sum(s.get("imported", 0) for s in self.stats)
        total_updated = sum(s.get("updated", 0) for s in self.stats)
        total_duplicates = sum(s.get("duplicates", 0) for s in self.stats) + skipped_duplicates
        total_errors = len(self.errors) + sum(s.get("errors", 0) for s in self.stats)
        total_warnings = sum(s.get("warnings", 0) for s in self.stats) + skipped_duplicates

        db = SessionLocal()
        try:
            log = db.query(ImportLog).filter_by(batch_id=self.batch_id).first()
            if log:
                log.completed_at = datetime.utcnow()
                log.status = "SUCCESS" if not self.errors else "PARTIAL"
                log.files_processed = len(files)
                log.records_imported = total_imported
                log.records_updated = total_updated
                log.duplicates_found = total_duplicates
                log.errors_count = total_errors
                log.warnings_count = total_warnings
                log.error_log = "\n".join(self.errors)
            db.commit()
        finally:
            db.close()

        return {
            "batch_id": self.batch_id,
            "status": "SUCCESS" if not self.errors else "PARTIAL",
            "files_processed": len(files),
            "records_imported": total_imported,
            "records_updated": total_updated,
            "duplicates_found": total_duplicates,
            "errors": total_errors,
            "warnings": total_warnings,
            "error_list": self.errors,
            "details": self.stats,
        }

    def _compute_hash(self, file_path: Path) -> str:
        import hashlib
        h = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
