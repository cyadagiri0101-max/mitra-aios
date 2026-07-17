import ast
import sqlite3
from pathlib import Path
import re

DB_PATH = Path("D:/MitraEngineeringLibrary/database/mekb.sqlite")
MODEL_PATH = Path("D:/MitraEngineeringLibrary/models/entities.py")
OUTPUT_PATH = Path("docs/ModelSchemaComparison.md")

if not DB_PATH.exists():
    raise FileNotFoundError(f"Database file not found: {DB_PATH}")
if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")


def ast_name(node):
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return f"{ast_name(node.value)}.{node.attr}"
    if isinstance(node, ast.Subscript):
        return ast_name(node.value)
    return None


def parse_default(node):
    if node is None:
        return None
    if isinstance(node, ast.Constant):
        return repr(node.value)
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return ast_name(node)
    if isinstance(node, ast.Call):
        func = ast_name(node.func)
        args = [parse_default(a) for a in node.args]
        kwargs = [f"{kw.arg}={parse_default(kw.value)}" for kw in node.keywords]
        return f"{func}({', '.join([x for x in args + kwargs if x is not None])})"
    return ast.dump(node)


def parse_string(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    return None


def parse_column_args(node):
    result = {
        "type": None,
        "primary_key": False,
        "nullable": None,
        "default": None,
        "foreign_key": None,
        "unique": False,
        "index": False,
    }
    if not isinstance(node, ast.Call):
        return result
    for idx, arg in enumerate(node.args):
        if idx == 0:
            t = ast_name(arg)
            if t:
                result["type"] = t
        else:
            if isinstance(arg, ast.Call) and ast_name(arg.func) == "ForeignKey":
                fk_arg = arg.args[0] if arg.args else None
                if isinstance(fk_arg, ast.Constant) and isinstance(fk_arg.value, str):
                    result["foreign_key"] = fk_arg.value
    for kw in node.keywords:
        if kw.arg == "primary_key" and isinstance(kw.value, ast.Constant):
            result["primary_key"] = bool(kw.value.value)
        elif kw.arg == "nullable" and isinstance(kw.value, ast.Constant):
            result["nullable"] = bool(kw.value.value)
        elif kw.arg == "default":
            result["default"] = parse_default(kw.value)
        elif kw.arg == "server_default":
            result["default"] = parse_default(kw.value)
        elif kw.arg == "unique" and isinstance(kw.value, ast.Constant):
            result["unique"] = bool(kw.value.value)
        elif kw.arg == "index" and isinstance(kw.value, ast.Constant):
            result["index"] = bool(kw.value.value)
        elif kw.arg == "primary_key" and isinstance(kw.value, ast.UnaryOp) and isinstance(kw.value.op, ast.USub):
            result["primary_key"] = False
    return result


def parse_models(path):
    source = path.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(path))
    models = {}
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            tablename = None
            columns = {}
            fks = []
            relationships = {}
            for stmt in node.body:
                if isinstance(stmt, ast.Assign):
                    targets = stmt.targets
                    if len(targets) != 1 or not isinstance(targets[0], ast.Name):
                        continue
                    name = targets[0].id
                    if name == "__tablename__" and isinstance(stmt.value, ast.Constant):
                        tablename = stmt.value.value
                        continue
                    if isinstance(stmt.value, ast.Call) and ast_name(stmt.value.func) == "Column":
                        info = parse_column_args(stmt.value)
                        info["name"] = name
                        info["line"] = stmt.lineno
                        columns[name] = info
                        if info["foreign_key"]:
                            fks.append({"column": name, "ref": info["foreign_key"], "line": stmt.lineno})
                    elif isinstance(stmt.value, ast.Call) and ast_name(stmt.value.func) == "relationship":
                        rel_target = None
                        if stmt.value.args:
                            rel_target = parse_string(stmt.value.args[0]) or ast_name(stmt.value.args[0])
                        rel_kwargs = {kw.arg: parse_default(kw.value) for kw in stmt.value.keywords}
                        relationships[name] = {"target": rel_target, "kwargs": rel_kwargs, "line": stmt.lineno}
            if tablename:
                models[tablename] = {
                    "class": node.name,
                    "columns": columns,
                    "foreign_keys": fks,
                    "relationships": relationships,
                }
    return models


def sqlite_schema(path):
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys = ON")
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    tables = [row[0] for row in cur.fetchall()]
    schema = {}
    for table in tables:
        cur.execute(f"PRAGMA table_info('{table}')")
        cols = [dict(row) for row in cur.fetchall()]
        cur.execute(f"PRAGMA foreign_key_list('{table}')")
        fks = [dict(row) for row in cur.fetchall()]
        cur.execute(f"PRAGMA index_list('{table}')")
        idxs = [dict(row) for row in cur.fetchall()]
        idx_details = []
        for idx in idxs:
            cur.execute(f"PRAGMA index_info('{idx['name']}')")
            idx_details.append({"name": idx["name"], "unique": bool(idx["unique"]), "columns": [r["name"] for r in cur.fetchall()]})
        schema[table] = {
            "columns": cols,
            "foreign_keys": fks,
            "indexes": idx_details,
        }
    conn.close()
    return schema


def normalize_type(type_name):
    if not type_name:
        return None
    return type_name.replace("sqlalchemy.", "").replace("types.", "")


models = parse_models(MODEL_PATH)
schema = sqlite_schema(DB_PATH)

# Build direct foreign key references for relationship verification
model_fk_targets = {}
for table_name, model in models.items():
    model_fk_targets[table_name] = [fk["ref"].split(".")[0] for fk in model["foreign_keys"] if "ref" in fk and fk["ref"]]

matched_tables = []
missing_tables = []
extra_tables = []
column_mismatches = []
type_mismatches = []
pk_diff = []
fk_diff = []
nullable_diff = []
relationship_diff = []

all_tables = set(models) | set(schema)
for table in sorted(all_tables):
    if table in models and table in schema:
        matched_tables.append(table)
        model_cols = models[table]["columns"]
        db_cols = {col["name"]: col for col in schema[table]["columns"]}
        for col_name, col_info in model_cols.items():
            if col_name not in db_cols:
                column_mismatches.append({
                    "table": table,
                    "model_column": col_name,
                    "issue": "Missing column in database",
                    "model": col_info,
                    "db": None,
                    "severity": "High",
                    "verified": "YES",
                })
                continue
            db_col = db_cols[col_name]
            model_type = normalize_type(col_info["type"])
            db_type = db_col["type"].upper() if db_col["type"] else None
            if model_type and (model_type.upper() not in db_type and db_type not in model_type.upper()):
                type_mismatches.append({
                    "table": table,
                    "column": col_name,
                    "model_type": model_type,
                    "db_type": db_type,
                    "severity": "Medium",
                    "verified": "YES",
                })
            model_pk = col_info["primary_key"]
            db_pk = bool(db_col["pk"])
            if model_pk != db_pk:
                pk_diff.append({
                    "table": table,
                    "column": col_name,
                    "model_pk": model_pk,
                    "db_pk": db_pk,
                    "severity": "High",
                    "verified": "YES",
                })
            if col_info["nullable"] is not None:
                model_null = col_info["nullable"]
            else:
                model_null = False if col_info["primary_key"] else True
            db_null = not bool(db_col["notnull"])
            if model_null != db_null:
                nullable_diff.append({
                    "table": table,
                    "column": col_name,
                    "model_nullable": model_null,
                    "db_nullable": db_null,
                    "severity": "Medium",
                    "verified": "YES",
                })
            model_default = col_info["default"]
            db_default = db_col["dflt_value"]
            if model_default is not None:
                normalized_model_default = model_default.strip()
            else:
                normalized_model_default = None
            if db_default is not None:
                normalized_db_default = str(db_default).strip()
            else:
                normalized_db_default = None
            if normalized_model_default != normalized_db_default:
                # Only report if model has an explicit default or database has one
                if normalized_model_default is not None or normalized_db_default is not None:
                    column_mismatches.append({
                        "table": table,
                        "model_column": col_name,
                        "issue": "Default mismatch",
                        "model": normalized_model_default,
                        "db": normalized_db_default,
                        "severity": "Low",
                        "verified": "YES",
                    })
        for col_name, db_col in db_cols.items():
            if col_name not in model_cols:
                column_mismatches.append({
                    "table": table,
                    "db_column": col_name,
                    "issue": "Extra column in database",
                    "model": None,
                    "db": db_col,
                    "severity": "High",
                    "verified": "YES",
                })
        model_fk_map = {fk["column"]: fk for fk in models[table]["foreign_keys"]}
        db_fks = schema[table]["foreign_keys"]
        for fk_col, fk_info in model_fk_map.items():
            if fk_col not in db_cols:
                continue
            matched = False
            for db_fk in db_fks:
                expected = fk_info["ref"].split(".")
                if db_fk["from"] == fk_col and db_fk["table"] == expected[0] and db_fk["to"] == expected[1]:
                    matched = True
                    break
            if not matched:
                fk_diff.append({
                    "table": table,
                    "column": fk_col,
                    "model_fk": fk_info["ref"],
                    "db_fks": db_fks,
                    "severity": "High",
                    "verified": "YES",
                })
        for db_fk in db_fks:
            if db_fk["from"] not in model_fk_map:
                fk_diff.append({
                    "table": table,
                    "column": db_fk["from"],
                    "model_fk": None,
                    "db_fk": f"{db_fk['table']}.{db_fk['to']}",
                    "severity": "High",
                    "verified": "YES",
                })
        for rel_name, rel_info in models[table]["relationships"].items():
            target = rel_info["target"]
            if not target:
                relationship_diff.append({
                    "table": table,
                    "relationship": rel_name,
                    "issue": "Unable to resolve relationship target",
                    "severity": "Low",
                    "verified": "NOT VERIFIABLE",
                })
                continue
            target_table = None
            if target.startswith("\"") or target.startswith("\'"):
                target = target.strip('"\'')
            if target in models:
                target_table = target
            else:
                maybe = "".join([c if c.islower() else f"_{c.lower()}" for c in target]).strip("_")
                if maybe in models:
                    target_table = maybe
            if not target_table:
                relationship_diff.append({
                    "table": table,
                    "relationship": rel_name,
                    "issue": f"Relationship target {target} not resolved to known model table",
                    "severity": "Medium",
                    "verified": "NOT VERIFIABLE",
                })
                continue
            direct_fks = [fk for fk in models[table]["foreign_keys"] if fk["ref"].startswith(target_table + ".")]
            if direct_fks:
                continue
            reverse_fks = [src for src, targets in model_fk_targets.items() if table in targets and src == target_table]
            if reverse_fks:
                continue
            relationship_diff.append({
                "table": table,
                "relationship": rel_name,
                "issue": f"Relationship target {target} not supported by direct foreign key in model or reverse foreign key on target table",
                "severity": "Medium",
                "verified": "YES",
            })
    elif table in models:
        missing_tables.append(table)
    else:
        extra_tables.append(table)


def sections(name, entries):
    lines = [f"## {name}", ""]
    if not entries:
        lines.append("None")
        lines.append("")
        return lines
    for entry in entries:
        if name == "Matched Tables":
            lines.append(f"- {entry}")
        elif name == "Missing Tables":
            lines.append(f"- {entry}")
        elif name == "Extra Tables":
            lines.append(f"- {entry}")
        else:
            lines.append(f"- Table: {entry.get('table')} | Issue: {entry.get('issue', entry.get('column') or entry.get('relationship'))} | Severity: {entry.get('severity')} | Verified: {entry.get('verified')}")
            if entry.get('model') is not None or entry.get('db') is not None:
                lines.append(f"  - Model: {entry.get('model')}")
                lines.append(f"  - DB: {entry.get('db')}")
            if entry.get('model_type') is not None:
                lines.append(f"  - Model Type: {entry.get('model_type')}")
                lines.append(f"  - DB Type: {entry.get('db_type')}")
            if entry.get('model_pk') is not None:
                lines.append(f"  - Model PK: {entry.get('model_pk')} | DB PK: {entry.get('db_pk')}")
            if entry.get('model_nullable') is not None:
                lines.append(f"  - Model Nullable: {entry.get('model_nullable')} | DB Nullable: {entry.get('db_nullable')}")
            if entry.get('model_fk') is not None or entry.get('db_fk') is not None or entry.get('db_fks') is not None:
                lines.append(f"  - Model FK: {entry.get('model_fk')} | DB FK: {entry.get('db_fk') or entry.get('db_fks')}")
            if entry.get('relationship'):
                lines.append(f"  - Relationship: {entry.get('relationship')}")
            lines.append("")
    return lines

output = [
    "# Model Schema Comparison",
    "",
    "## Summary",
    "",
    f"Database: {DB_PATH}",
    f"Model definitions: {MODEL_PATH}",
    f"Total model tables: {len(models)}",
    f"Total database tables: {len(schema)}",
    "",
    f"Matched tables: {len(matched_tables)}",
    f"Missing model tables in database: {len(missing_tables)}",
    f"Extra database tables: {len(extra_tables)}",
    f"Column mismatches: {len(column_mismatches)}",
    f"Type mismatches: {len(type_mismatches)}",
    f"PK differences: {len(pk_diff)}",
    f"FK differences: {len(fk_diff)}",
    f"Nullable differences: {len(nullable_diff)}",
    f"Relationship differences: {len(relationship_diff)}",
    "",
]

output += sections("Matched Tables", matched_tables)
output += sections("Missing Tables", missing_tables)
output += sections("Extra Tables", extra_tables)
output += sections("Column Mismatches", column_mismatches)
output += sections("Type Mismatches", type_mismatches)
output += sections("PK Differences", pk_diff)
output += sections("FK Differences", fk_diff)
output += sections("Nullable Differences", nullable_diff)
output += sections("Relationship Differences", relationship_diff)

consistency = "PASS" if not (missing_tables or extra_tables or column_mismatches or type_mismatches or pk_diff or fk_diff or nullable_diff or relationship_diff) else "FAIL"
output += ["## Overall Model Consistency", "", f"Consistency Status: {consistency}", ""]

OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
OUTPUT_PATH.write_text("\n".join(output), encoding="utf-8")
print(f"Generated {OUTPUT_PATH}")
