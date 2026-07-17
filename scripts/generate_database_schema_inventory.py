import sqlite3
from pathlib import Path

DB_PATH = Path("D:/MitraEngineeringLibrary/database/mekb.sqlite")
OUTPUT_PATH = Path("docs/DatabaseSchemaInventory.md")

if not DB_PATH.exists():
    raise FileNotFoundError(f"Database file not found: {DB_PATH}")

OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

with sqlite3.connect(DB_PATH) as conn:
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("select sqlite_version()")
    sqlite_version = cur.fetchone()[0]

    cur.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name")
    tables = [row[0] for row in cur.fetchall()]

    lines = [
        "# Database Schema Inventory",
        "",
        f"**Database file:** {DB_PATH.resolve()}",
        f"**Database file size:** {DB_PATH.stat().st_size} bytes",
        f"**SQLite version:** {sqlite_version}",
        "",
    ]

    total_cols = 0
    total_fks = 0
    total_idxs = 0

    for table in tables:
        cur.execute(f"SELECT COUNT(*) as cnt FROM '{table}'")
        row_count = cur.fetchone()[0]

        lines.extend([
            f"## {table}",
            "",
            f"Row Count: {row_count}",
            "",
            "### Columns",
            "",
            "| Name | Type | PK | Nullable | Default |",
            "| ---- | ---- | -- | -------- | ------- |",
        ])

        cur.execute(f"PRAGMA table_info('{table}')")
        cols = cur.fetchall()
        total_cols += len(cols)
        for c in cols:
            name = c[1]
            typ = c[2]
            pk = "Yes" if c[5] else ""
            nullable = "No" if c[3] else "Yes"
            default = c[4] if c[4] is not None else ""
            lines.append(f"| {name} | {typ} | {pk} | {nullable} | {default} |")

        lines.extend(["", "### Foreign Keys", "", "| Column | References | On Update | On Delete | Match |", "| ------ | ---------- | --------- | --------- | ----- |"])
        cur.execute(f"PRAGMA foreign_key_list('{table}')")
        fks = cur.fetchall()
        if fks:
            total_fks += len(fks)
            for fk in fks:
                lines.append(f"| {fk['from']} | {fk['table']}({fk['to']}) | {fk['on_update']} | {fk['on_delete']} | {fk['match']} |")
        else:
            lines.append("| (none) | | | | |")

        lines.extend(["", "### Indexes", "", "| Index | Unique | Columns | Origin | Partial |", "| ----- | ------ | ------- | ------ | ------- |"])
        cur.execute(f"PRAGMA index_list('{table}')")
        idxs = cur.fetchall()
        if idxs:
            total_idxs += len(idxs)
            for idx in idxs:
                cur.execute(f"PRAGMA index_info('{idx['name']}')")
                cols_info = [ri['name'] for ri in cur.fetchall()]
                cols_text = ", ".join(cols_info)
                unique = "Yes" if idx['unique'] else "No"
                origin = idx['origin']
                partial = "Yes" if idx['partial'] else "No"
                lines.append(f"| {idx['name']} | {unique} | {cols_text} | {origin} | {partial} |")
        else:
            lines.append("| (none) | | | | |")

        lines.extend(["", "---", ""])

    lines.extend([
        f"Total Tables: {len(tables)}",
        f"Total Columns: {total_cols}",
        f"Total Foreign Keys: {total_fks}",
        f"Total Indexes: {total_idxs}",
        "",
        f"Database File Size: {DB_PATH.stat().st_size} bytes",
        f"SQLite Version: {sqlite_version}",
    ])

with OUTPUT_PATH.open("w", encoding="utf-8") as out_file:
    out_file.write("\n".join(lines))

print(f"Generated {OUTPUT_PATH}")
