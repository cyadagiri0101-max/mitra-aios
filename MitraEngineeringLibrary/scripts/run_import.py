"""CLI script to run the full MEKB import."""
import sys
from pathlib import Path

# Add project root to path
root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root))

from importers.pipeline import ImportPipeline
from importers.validator import ValidationReport
from config import settings


def main():
    print("=" * 60)
    print("  Mitra Engineering Knowledge Base (MEKB)")
    print("  Import Pipeline")
    print("=" * 60)
    print(f"Source: {settings.SOURCE_DIR}")
    print(f"Database: {settings.DATABASE_URL}")
    print()

    pipeline = ImportPipeline()
    result = pipeline.run()

    print()
    print("-" * 60)
    print("Import Results:")
    print(f"  Batch ID:      {result['batch_id']}")
    print(f"  Status:        {result['status']}")
    print(f"  Files:         {result['files_processed']}")
    print(f"  Imported:      {result['records_imported']}")
    print(f"  Updated:       {result['records_updated']}")
    print(f"  Duplicates:    {result['duplicates_found']}")
    print(f"  Errors:        {result['errors']}")
    print(f"  Warnings:      {result['warnings']}")
    print("-" * 60)

    # Generate report
    report = ValidationReport(result['batch_id'])
    report_path = report.generate(result)
    print(f"Validation report: {report_path}")
    print()
    print("Done.")


if __name__ == "__main__":
    main()
