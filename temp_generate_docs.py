import ast
import json
import pathlib
import re
import sqlite3

ROOT = pathlib.Path(__file__).resolve().parent
DB_PATH = pathlib.Path(r'D:/MitraEngineeringLibrary/database/mekb.sqlite')
SRC_PATH = ROOT / 'acceptance_evidence.py'
DOCS_DIR = ROOT / 'docs'
DOCS_DIR.mkdir(exist_ok=True)

TABLE_QUERY = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"

KEYWORDS = {
    'select', 'from', 'where', 'join', 'left', 'right', 'inner', 'outer', 'on',
    'group', 'by', 'having', 'order', 'limit', 'offset', 'as', 'count', 'distinct',
    'sum', 'avg', 'min', 'max', 'and', 'or', 'not', 'in', 'is', 'null', 'like',
    'exists', 'case', 'when', 'then', 'else', 'end', 'union', 'all', 'asc',
    'desc', 'into', 'values', 'update', 'delete', 'insert', 'replace', 'create',
    'table', 'alter', 'add', 'drop', 'view', 'cast', 'coalesce', 'with'
}

SQL_TOKEN_RE = re.compile(r"\b([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?)\b")
FROM_JOIN_RE = re.compile(
    r"\bfrom\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(?:as\s+)?([A-Za-z_][A-Za-z0-9_]*))?"
    r"|\bjoin\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(?:as\s+)?([A-Za-z_][A-Za-z0-9_]*))?",
    re.IGNORECASE,
)


def get_schema():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    tables = [r[0] for r in cur.execute(TABLE_QUERY).fetchall()]
    schema = {}
    for table in tables:
        cols = [dict(r) for r in cur.execute(f"PRAGMA table_info('{table}')")]
        fks = [dict(r) for r in cur.execute(f"PRAGMA foreign_key_list('{table}')")]
        idxs = []
        for row in cur.execute(f"PRAGMA index_list('{table}')"):
            idx = dict(row)
            idx['columns'] = [r['name'] for r in cur.execute(f"PRAGMA index_info('{idx['name']}')")]
            idxs.append(idx)
        count = cur.execute(f"SELECT COUNT(*) AS c FROM '{table}'").fetchone()['c']
        schema[table] = {
            'columns': cols,
            'foreign_keys': fks,
            'indexes': idxs,
            'row_count': count,
        }
    conn.close()
    return schema


def get_sql_queries():
    source = SRC_PATH.read_text(encoding='utf-8')
    module = ast.parse(source)
    queries = []

    def string_value(node):
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            return node.value
        if isinstance(node, ast.JoinedStr):
            parts = []
            for value in node.values:
                if isinstance(value, ast.Constant) and isinstance(value.value, str):
                    parts.append(value.value)
                elif isinstance(value, ast.FormattedValue):
                    try:
                        parts.append('{' + ast.unparse(value.value) + '}')
                    except Exception:
                        parts.append('{expr}')
            return ''.join(parts)
        return None

    for node in ast.walk(module):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == 'sql':
                    sql_text = string_value(node.value)
                    if sql_text is not None:
                        queries.append({'line': node.lineno, 'sql': sql_text.strip(), 'purpose': 'sql assignment'})
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            if node.func.attr == 'execute' and node.args:
                sql_text = string_value(node.args[0])
                if sql_text is not None:
                    queries.append({'line': node.lineno, 'sql': sql_text.strip(), 'purpose': 'execute call'})

    list_names = [
        'orphan_checks', 'rel_checks', 'dup_checks', 'null_fk_checks',
        'orphan_validation', 'feature_completeness'
    ]
    for node in module.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            name = node.targets[0].id
            if name in list_names and isinstance(node.value, ast.List):
                for elt in node.value.elts:
                    if isinstance(elt, ast.Tuple) and len(elt.elts) >= 2:
                        label = string_value(elt.elts[0])
                        sql_text = string_value(elt.elts[1])
                        if sql_text is not None:
                            purpose = f'{name}: {label}' if label else name
                            queries.append({'line': elt.lineno, 'sql': sql_text.strip(), 'purpose': purpose})

    return queries


def find_tables(sql):
    sql_lower = sql.lower()
    tables = []
    aliases = {}
    for match in FROM_JOIN_RE.finditer(sql_lower):
        tbl = match.group(1) or match.group(3)
        alias = match.group(2) or match.group(4)
        if tbl:
            tables.append(tbl)
            if alias:
                aliases[alias] = tbl
            else:
                aliases[tbl] = tbl
    return tables, aliases


def extract_columns(sql, tables=None, aliases=None):
    stripped = re.sub(r"'(?:''|[^'])*'|\"(?:\"\"|[^"])*\"", ' ', sql)
    alias_names = set(re.findall(r'\bAS\s+([A-Za-z_][A-Za-z0-9_]*)\b', stripped, flags=re.IGNORECASE))
    tokens = SQL_TOKEN_RE.findall(stripped)
    columns = []
    for token in tokens:
        normal = token.lower()
        if normal in KEYWORDS or normal == '*' or normal.isdigit():
            continue
        if tables and normal in {t.lower() for t in tables}:
            continue
        if aliases and normal in {a.lower() for a in aliases}:
            continue
        if normal in {a.lower() for a in alias_names}:
            continue
        columns.append(token)
    return columns


def audit_query(query, schema):
    sql = query['sql']
    tables, aliases = find_tables(sql)
    columns = extract_columns(sql, tables=tables, aliases=aliases)
    valid = True
    invalid_columns = []
    assumptions = []
    resolved = []

    table_columns = {t: [c['name'] for c in schema[t]['columns']] for t in schema}
    for token in columns:
        if '.' in token:
            alias, col = token.split('.', 1)
            actual_table = aliases.get(alias)
            if actual_table is None:
                invalid_columns.append(token)
                valid = False
            elif col not in table_columns.get(actual_table, []):
                invalid_columns.append(token)
                valid = False
            else:
                resolved.append((actual_table, col))
        else:
            if len(tables) == 1:
                table = tables[0]
                if token not in table_columns.get(table, []):
                    invalid_columns.append(token)
                    valid = False
                else:
                    resolved.append((table, token))
            elif len(tables) == 0:
                if token not in KEYWORDS:
                    assumptions.append(f"No table context for unqualified token '{token}'")
                    invalid_columns.append(token)
                    valid = False
            else:
                candidates = [t for t in tables if token in table_columns.get(t, [])]
                if len(candidates) == 1:
                    resolved.append((candidates[0], token))
                    assumptions.append(f"Unqualified column '{token}' assumed to belong to table '{candidates[0]}'")
                elif len(candidates) == 0:
                    invalid_columns.append(token)
                    valid = False
                else:
                    assumptions.append(f"Unqualified column '{token}' appears in multiple referenced tables: {candidates}")
                    resolved.append((None, token))
    return {
        'query_id': None,
        'purpose': query['purpose'],
        'sql': sql,
        'tables': tables,
        'columns': columns,
        'column_exists': 'YES' if valid else 'NO',
        'invalid_columns': invalid_columns,
        'assumptions': assumptions,
    }

""|[^"])*"', ' ', sql)
    alias_names = set(re.findall(r'\bAS\s+([A-Za-z_][A-Za-z0-9_]*)\b', stripped, flags=re.IGNORECASE))
    tokens = SQL_TOKEN_RE.findall(stripped)
    columns = []
    for token in tokens:
        normal = token.lower()
        if normal in KEYWORDS or normal == '*' or normal.isdigit():
            continue
        if tables and normal in {t.lower() for t in tables}:
            continue
        if aliases and normal in {a.lower() for a in aliases}:
            continue
        if normal in {a.lower() for a in alias_names}:
            continue
        columns.append(token)
    return columns


def audit_query(query, schema):
""|[^"])*"', ' ', sql)
    alias_names = set(re.findall(r'\bAS\s+([A-Za-z_][A-Za-z0-9_]*)\b', stripped, flags=re.IGNORECASE))
    tokens = SQL_TOKEN_RE.findall(stripped)
    columns = []
    for token in tokens:
        normal = token.lower()
        if normal in KEYWORDS or normal == '*' or normal.isdigit():
            continue
        if tables and normal in {t.lower() for t in tables}:
            continue
        if aliases and normal in {a.lower() for a in aliases}:
            continue
        if normal in {a.lower() for a in alias_names}:
            continue
        columns.append(token)
    return columns
""|[^"])*"', ' ', sql)
    tokens = SQL_TOKEN_RE.findall(stripped)
    columns = []
    for token in tokens:
        normal = token.lower()
        if normal in KEYWORDS or normal == '*' or normal.isdigit():
            continue
        columns.append(token)
    return columns


def audit_query(query, schema):
    sql = query['sql']
    tables, aliases = find_tables(sql)
    columns = extract_columns(sql)
    valid = True
    invalid_columns = []
    assumptions = []
    resolved = []

    table_columns = {t: [c['name'] for c in schema[t]['columns']] for t in schema}
    for token in columns:
        if '.' in token:
            alias, col = token.split('.', 1)
            actual_table = aliases.get(alias)
            if actual_table is None:
                invalid_columns.append(token)
                valid = False
            elif col not in table_columns.get(actual_table, []):
                invalid_columns.append(token)
                valid = False
            else:
                resolved.append((actual_table, col))
        else:
            if len(tables) == 1:
                table = tables[0]
                if token not in table_columns.get(table, []):
                    invalid_columns.append(token)
                    valid = False
                else:
                    resolved.append((table, token))
            elif len(tables) == 0:
                if token not in KEYWORDS:
                    assumptions.append(f"No table context for unqualified token '{token}'")
                    invalid_columns.append(token)
                    valid = False
            else:
                candidates = [t for t in tables if token in table_columns.get(t, [])]
                if len(candidates) == 1:
                    resolved.append((candidates[0], token))
                    assumptions.append(f"Unqualified column '{token}' assumed to belong to table '{candidates[0]}'")
                elif len(candidates) == 0:
                    invalid_columns.append(token)
                    valid = False
                else:
                    assumptions.append(f"Unqualified column '{token}' appears in multiple referenced tables: {candidates}")
                    resolved.append((None, token))
    return {
        'query_id': None,
        'purpose': query['purpose'],
        'sql': sql,
        'tables': tables,
        'columns': columns,
        'column_exists': 'YES' if valid else 'NO',
        'invalid_columns': invalid_columns,
        'assumptions': assumptions,
    }


def write_schema_doc(schema):
    lines = ['# Database Schema Inventory', '']
    lines.append(f'**Database file:** {DB_PATH}')
    lines.append('')
    for table, meta in schema.items():
        lines.append(f'## Table: {table}')
        lines.append('')
        lines.append(f'**Row count:** {meta["row_count"]}')
        lines.append('')
        lines.append('| Column | Data type | Primary key | Nullable |')
        lines.append('|--------|-----------|-------------|----------|')
        for col in meta['columns']:
            lines.append(f"| {col['name']} | {col['type']} | {'YES' if col['pk'] else ''} | {'NO' if col['notnull'] else 'YES'} |")
        lines.append('')
        if meta['foreign_keys']:
            lines.append('**Foreign keys:**')
            lines.append('')
            lines.append('| From Column | References Table | References Column | On Update | On Delete |')
            lines.append('|-------------|------------------|-------------------|-----------|-----------|')
            for fk in meta['foreign_keys']:
                lines.append(f"| {fk['from']} | {fk['table']} | {fk['to']} | {fk['on_update']} | {fk['on_delete']} |")
            lines.append('')
        if meta['indexes']:
            lines.append('**Indexes:**')
            lines.append('')
            lines.append('| Index Name | Unique | Columns |')
            lines.append('|------------|--------|---------|')
            for idx in meta['indexes']:
                lines.append(f"| {idx['name']} | {'YES' if idx['unique'] else 'NO'} | {', '.join(idx['columns'])} |")
            lines.append('')
        lines.append('---')
        lines.append('')
    (DOCS_DIR / 'DatabaseSchemaInventory.md').write_text('\n'.join(lines), encoding='utf-8')


def write_query_audit(queries):
    lines = ['# Validation Query Audit', '']
    for i, query in enumerate(queries, 1):
        query['query_id'] = f'Q{i}'
        lines.append(f'## Query ID: {query["query_id"]}')
        lines.append('')
        lines.append(f'**Purpose:** {query["purpose"]}')
        lines.append('')
        lines.append('**SQL:**')
        lines.append('```sql')
        lines.append(query['sql'])
        lines.append('```')
        lines.append('')
        lines.append(f'**Tables referenced:** {", ".join(query["tables"]) if query["tables"] else "None parsed"}')
        lines.append('')
        lines.append(f'**Columns referenced:** {", ".join(query["columns"]) if query["columns"] else "None parsed"}')
        lines.append('')
        lines.append(f'**Column exists:** {query["column_exists"]}')
        lines.append('')
        lines.append(f'**Invalid column names:** {", ".join(query["invalid_columns"]) if query["invalid_columns"] else "None"}')
        lines.append('')
        lines.append(f'**Validator assumptions:** {"; ".join(query["assumptions"]) if query["assumptions"] else "None"}')
        lines.append('')
        lines.append('---')
        lines.append('')
    (DOCS_DIR / 'ValidationQueryAudit.md').write_text('\n'.join(lines), encoding='utf-8')


def main():
    schema = get_schema()
    sql_queries = get_sql_queries()
    reviewed = [audit_query(q, schema) for q in sql_queries]
    write_schema_doc(schema)
    write_query_audit(reviewed)

if __name__ == '__main__':
    main()
