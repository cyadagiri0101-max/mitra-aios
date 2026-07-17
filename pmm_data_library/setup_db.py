#!/usr/bin/env python3
"""
PMM Data Library — Setup / Rebuild Script
=========================================
Rebuilds the SQLite database from the master Excel file.

Usage:
    python setup_db.py
    python setup_db.py --excel path/to/PMM_Master_Data_Library.xlsx

This will regenerate pmm_database.db from the Excel source.
"""
import argparse
import sqlite3
import os
import pandas as pd


def build_database(excel_path: str, db_path: str):
    """Build SQLite database from the master Excel file."""
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"Removed old database: {db_path}")

    conn = sqlite3.connect(db_path)
    xl = pd.ExcelFile(excel_path)

    sheet_table_map = {
        'Master_Blow_Molds': 'blow_molds',
        'Master_Injection_Molds': 'injection_molds',
        'Master_Job_Works': 'job_works',
        'Master_ALPLA_STD_Parts': 'alpla_std_parts',
        'Master_Commercial_Molds': 'commercial_molds',
        'Data_Dictionary': 'data_dictionary',
        'Normalization_Rules': 'normalization_rules',
        'Source_Summary': 'source_summary'
    }

    for sheet, table in sheet_table_map.items():
        if sheet not in xl.sheet_names:
            print(f"⚠️ Sheet '{sheet}' not found, skipping.")
            continue
        df = pd.read_excel(excel_path, sheet_name=sheet)
        df.columns = [c.replace(' ', '_').replace('/', '_').replace('.', '_').replace('-', '_') for c in df.columns]
        df.to_sql(table, conn, if_exists='replace', index=False)
        print(f"✅ Table '{table}' ← {sheet}: {len(df)} records")

    conn.commit()
    conn.close()
    print(f"\n🎉 Database ready: {db_path}")


def main():
    parser = argparse.ArgumentParser(description="Rebuild PMM SQLite DB from Excel")
    parser.add_argument("--excel", default=None, help="Path to PMM_Master_Data_Library.xlsx")
    parser.add_argument("--db", default=None, help="Output SQLite DB path")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    excel_path = args.excel or os.path.join(script_dir, "..", "PMM_Master_Data_Library.xlsx")
    db_path = args.db or os.path.join(script_dir, "pmm_database.db")

    excel_path = os.path.abspath(excel_path)
    db_path = os.path.abspath(db_path)

    if not os.path.exists(excel_path):
        print(f"❌ Excel file not found: {excel_path}")
        print("Run with --excel to specify the correct path.")
        return 1

    build_database(excel_path, db_path)
    return 0


if __name__ == "__main__":
    exit(main())
