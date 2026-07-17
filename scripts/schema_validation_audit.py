import ast
import pathlib
import re
import sqlite3

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / 'D:/MitraEngineeringLibrary/database/mekb.sqlite'
SRC_PATH = BASE_DIR / 'acceptance_evidence.py'
DOCS_DIR = BASE_DIR / 'docs'
DOCS_DIR.mkdir(parents=True, exist_ok=True)

KEYWORDS = {
    'select', 'from', 'where', 'join', 'left', 'right', 'inner', 'outer', 'on', 'group', 'by', 'having',
    'order', 'limit', 'offset', 'as', 'count', 'distinct', 'sum', 'avg', 'min', 'max', 'and', 'or', 'not',
    'in', 'is', 'null', 'like', 'exists', 'case', 'when', 'then', 'else', 'end', 'union', 'all', 'asc',
    'desc', 'into', 'values', 'update', 'delete', 'insert', 'replace', 'create', 'table', 'alter', 'add',
    'drop', 'view', 'cast', 'coalesce', 'limit', 'offset', 'order', 'by'
}

SQL_TOKEN_RE = re.compile(r"\b([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?)\b")
FROM_JOIN_RE = re.compile(r"\bfrom\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(?:as\s+)?([A-Za-z_][A-Za-z0-9_]*))?|\bjoin\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(?:as\s+)?([A-Za-z_][A-Za-z0-9_]*))?", re.IGNORECASE)


def extract_queries(source_text):
    module = ast.parse(source_text)
    queries = []

    def get_string(node):
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            return node.value
        return None

    class QueryCollector(ast.NodeVisitor):
        def __init__(self):
            self.queries = []
            self.named_lists = set(['orphan_checks', 'rel_checks', 'dup_checks', 'null_fk_checks', 'orphan_validation', 'feature_completeness'])

        def visit_Assign(self, node):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    if target.id == 'sql':
                        text = get_string(node.value)
                        if text is not None:
                            self.queries.append(('sql assignment', text, node.lineno))
                    elif target.id in self.named_lists and isinstance(node.value, ast.List):
                        self._extract_list_queries(target.id, node.value)
            self.generic_visit(node)

        def visit_AnnAssign(self, node):
            target = node.target
            if isinstance(target, ast.Name) and target.id == 'sql':
                text = get_string(node.value)
                if text is not None:
                    self.queries.append(('sql assignment', text, node.lineno))
            self.generic_visit(node)

        def _extract_list_queries(self, list_name, list_node):
            for elt in list_node.elts:
                if isinstance(elt, ast.Tuple) and len(elt.elts) >= 2:
                    label = get_string(elt.elts[0])
                    query = get_string(elt.elts[1])
                    if label is not None and query is not None:
                        self.queries.append((list_name, query, elt.lineno))

        def generic_visit(self, node):
            super().generic_visit(node)

    collector = QueryCollector()
    collector.visit(module)

    # extract named lists manually from source text to preserve labels
    named_lists = ['orphan_checks', 'rel_checks', 'dup_checks', 'null_fk_checks', 'orphan_validation', 'feature_completeness']
    for name in named_lists:
        pattern = re.compile(rf"^{name}\s*=\s*\[", re.MULTILINE)
        match = pattern.search(source_text)
        if not match:
            continue
        start = match.end()
        bracket = 1
        i = start
        while i < len(source_text) and bracket > 0:
            if source_text[i] == '[':
                bracket += 1
            elif source_text[i] == ']':
                bracket -= 1
            i += 1
        list_text = source_text[start:i]
        try:
            list_node = ast.parse(f'LIST={list_text}')
            assign = list_node.body[0]
            if isinstance(assign, ast.Assign) and isinstance(assign.value, ast.List):
                for elt in assign.value.elts:
                    if isinstance(elt, ast.Tuple) and len(elt.elts) >= 2:
                        label = get_string(elt.elts[0])
                        query = get_string(elt.elts[1])
                        if label is not None and query is not None:
                            queries.append((name, query, elt.lineno))
        except SyntaxError:
            continue

    return collector.queries + queries


def clean_sql_string(sql):
    return sql.strip()


def find_tables_and_aliases(sql):
    aliases = {}
    tables = []
    for match in FROM_JOIN_RE.finditer(sql):
        tbl = match.group(1) or match.group(3)
        alias = match.group(2) or match.group(4)
        if tbl:
            tables.append(tbl)
            if alias:
                aliases[alias] = tbl
            else:
                aliases[tbl] = tbl
    return tables, aliases


def extract_column_tokens(sql):
    stripped = re.sub(r"'(?:''|[^'])*'|\"(?:\"\"|[^\"])*\"", ' ', sql)
    tokens = SQL_TOKEN_RE.findall(stripped)
    cols = []
    for token in tokens:
        normal = token.lower()
        if normal in KEYWORDS:
            continue
        if normal == '*' or normal.isdigit():
            continue
        cols.append(token)
    return cols


def resolve_column(token, aliases, table_columns):
    if '.' in token:
        alias, col = token.split('.', 1)
        table = aliases.get(alias)
        return table, col
    candidate_tables = [t for t in aliases.values() if token in table_columns.get(t, [])]
    if len(candidate_tables) == 1:
        return candidate_tables[0], token
    return None, token


def audit_queries(queries, table_columns):
    audits = []
    for idx, (label, sql, lineno) in enumerate(queries, 1):
        sql_clean = clean_sql_string(sql)
        tables, aliases = find_tables_and_aliases(sql_clean.lower())
        if not tables:
            # maybe single table with no alias and no FROM due to pragma or count
            pass
        columns = extract_column_tokens(sql_clean)
        col_report = []
        invalid = []
        assumptions = []
        for col in columns:
            if '.' in col:
                table_key, colname = col.split('.', 1)
                actual_table = aliases.get(table_key)
                if actual_table is None:
                    invalid.append(col)
                elif colname not in table_columns.get(actual_table, []):
                    invalid.append(col)
                else:
                    col_report.append((table_key, colname))
            else:
                if len(tables) == 1:
                    table = tables[0]
                    if col not in table_columns.get(table, []):
                        invalid.append(col)
                    else:
                        col_report.append((table, col))
                else:
                    possible = [t for t in tables if col in table_columns.get(t, [])]
                    if len(possible) == 1:
                        col_report.append((possible[0], col))
                        assumptions.append(f"Unqualified column '{col}' assumed to belong to table '{possible[0]}'")
                    elif len(possible) == 0:
                        invalid.append(col)
                    else:
                        assumptions.append(f"Unqualified column '{col}' appears in multiple referenced tables: {possible}; ambiguity exists")
                        col_report.append((None, col))
        audits.append({
            'id': f'Q{idx}',
            'label': label,
            'line': lineno,
            'sql': sql_clean,
            'tables': tables,
            'aliases': aliases,
            'columns': col_report,
            'invalid_columns': invalid,
            'assumptions': assumptions,
        })
    return audits


def generate_docs(schema, audits):
    inv = ['# Database Schema Inventory', '', f'**Database file:** {DB_PATH}', '']
    for table, meta in schema.items():
        inv.append(f'## Table: {table}')
        inv.append('')
        inv.append('| Column | Type | PK | Nullable |')
        inv.append('|--------|------|----|----------|')
        for col in meta['columns']:
            inv.append(f"| {col['name']} | {col['type']} | {'YES' if col['pk'] else ''} | {'NO' if col['notnull'] else 'YES'} |")
        inv.append('')
        if meta['fks']:
            inv.append('**Foreign keys:**')
            inv.append('')
            inv.append('| From Column | References Table | References Column | On Update | On Delete |')
            inv.append('|-------------|------------------|-------------------|-----------|-----------|')
            for fk in meta['fks']:
                inv.append(f"| {fk['from']} | {fk['table']} | {fk['to']} | {fk['on_update']} | {fk['on_delete']} |")
            inv.append('')
        if meta['indexes']:
            inv.append('**Indexes:**')
            inv.append('')
            inv.append('| Index Name | Unique | Columns |')
            inv.append('|------------|--------|---------|')
            for idx in meta['indexes']:
                inv.append(f"| {idx['name']} | {'YES' if idx['unique'] else 'NO'} | {', '.join(idx['columns'])} |")
            inv.append('')
        inv.append(f"**Row count:** {meta['row_count']}")
        inv.append('')
        inv.append('---')
        inv.append('')
    with open(DOCS_DIR / 'DatabaseSchemaInventory.md', 'w', encoding='utf-8') as f:
        f.write('\n'.join(inv))

    audit_lines = ['# Validation Query Audit', '', f'**Acceptance validator:** {SRC_PATH}', '']
    for audit in audits:
        audit_lines.append(f"## Query ID: {audit['id']}")
        audit_lines.append('')
        audit_lines.append(f"**Label:** {audit['label']}")
        audit_lines.append(f"**Source line:** {audit['line']}")
        audit_lines.append('')
        audit_lines.append('**SQL:**')
        audit_lines.append('```sql')
        audit_lines.append(audit['sql'])
        audit_lines.append('```')
        audit_lines.append('')
        audit_lines.append(f"**Tables used:** {', '.join(audit['tables']) if audit['tables'] else 'None parsed'}")
        audit_lines.append('')
        parsed_columns = [f"{table+'.' if table else ''}{col}" for table, col in audit['columns']]
        audit_lines.append(f"**Columns referenced:** {', '.join(parsed_columns)}")
        audit_lines.append('')
        audit_lines.append(f"**All referenced columns exist:** {'YES' if not audit['invalid_columns'] else 'NO'}")
        if audit['invalid_columns']:
            audit_lines.append(f"**Invalid columns:** {', '.join(audit['invalid_columns'])}")
        audit_lines.append('')
        if audit['assumptions']:
            audit_lines.append('**Assumptions:**')
            for item in audit['assumptions']:
                audit_lines.append(f'- {item}')
            audit_lines.append('')
        audit_lines.append('---')
        audit_lines.append('')
    with open(DOCS_DIR / 'ValidationQueryAudit.md', 'w', encoding='utf-8') as f:
        f.write('\n'.join(audit_lines))


def main():
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found at {DB_PATH}")
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").fetchall()]
    schema = {}
    for table in tables:
        cols = [dict(r) for r in cur.execute(f"PRAGMA table_info('{table}')")]
        fks = [dict(r) for r in cur.execute(f"PRAGMA foreign_key_list('{table}')")]
        indexes = []
        for idx in cur.execute(f"PRAGMA index_list('{table}')"):
            idx = dict(idx)
            cols_info = [row['name'] for row in cur.execute(f"PRAGMA index_info('{idx['name']}')")]
            idx['columns'] = cols_info
            indexes.append(idx)
        row_count = cur.execute(f"SELECT COUNT(*) AS c FROM '{table}'").fetchone()['c']
        schema[table] = {'columns': cols, 'fks': fks, 'indexes': indexes, 'row_count': row_count}
    source_text = SRC_PATH.read_text(encoding='utf-8')
    queries = extract_queries(source_text)
    audits = audit_queries(queries, {t: [c['name'] for c in schema[t]['columns']] for t in schema})
    generate_docs(schema, audits)
    conn.close()
    print('Generated docs/DatabaseSchemaInventory.md and docs/ValidationQueryAudit.md')

if __name__ == '__main__':
    main()
