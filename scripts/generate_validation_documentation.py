import ast
import pathlib
import re
import sqlite3

BASE = pathlib.Path(r'D:\Mitra3.0')
DB = pathlib.Path(r'D:\MitraEngineeringLibrary\database\mekb.sqlite')
DOCS = BASE / 'docs'
DOCS.mkdir(exist_ok=True)

source_path = BASE / 'acceptance_evidence.py'
source = source_path.read_text(encoding='utf-8')

list_names = {
    'orphan_checks',
    'rel_checks',
    'dup_checks',
    'null_fk_checks',
    'orphan_validation',
    'feature_completeness',
}


def get_string(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.Str):
        return node.s
    if isinstance(node, ast.JoinedStr):
        parts = []
        for value in node.values:
            if isinstance(value, ast.Constant):
                parts.append(str(value.value))
            else:
                return None
        return ''.join(parts)
    return None


class QueryCollector(ast.NodeVisitor):
    def __init__(self):
        self.queries = []

    def visit_Assign(self, node):
        for target in node.targets:
            if isinstance(target, ast.Name):
                if target.id == 'sql':
                    value = get_string(node.value)
                    if value is not None:
                        self.queries.append(('sql assignment', None, value.strip(), node.lineno))
                elif target.id in list_names and isinstance(node.value, ast.List):
                    for elt in node.value.elts:
                        if isinstance(elt, ast.Tuple) and len(elt.elts) >= 2:
                            label = get_string(elt.elts[0])
                            sql = get_string(elt.elts[1])
                            if label and sql:
                                self.queries.append((target.id, label, sql.strip(), elt.lineno))
        self.generic_visit(node)

    def visit_AnnAssign(self, node):
        target = node.target
        if isinstance(target, ast.Name) and target.id == 'sql':
            value = get_string(node.value)
            if value is not None:
                self.queries.append(('sql assignment', None, value.strip(), node.lineno))
        self.generic_visit(node)


def parse_tables(sql):
    table_re = re.compile(
        r"\bfrom\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(?:as\s+)?([A-Za-z_][A-Za-z0-9_]*))?"
        r"|\bjoin\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(?:as\s+)?([A-Za-z_][A-Za-z0-9_]*))?",
        re.IGNORECASE,
    )
    tables = []
    aliases = {}
    for m in table_re.finditer(sql):
        tbl = m.group(1) or m.group(3)
        alias = m.group(2) or m.group(4)
        if tbl:
            tables.append(tbl)
            aliases[alias or tbl] = tbl
    return sorted(set(tables)), aliases


def format_markdown_block(lines):
    return '\n'.join(lines) + '\n'


def build_schema_inventory(conn):
    cursor = conn.cursor()
    tables = [row[0] for row in cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").fetchall()]
    output = [
        '# Database Schema Inventory',
        '',
        f'**Database file:** {DB}',
        '',
    ]
    for table in tables:
        columns = [dict(row) for row in cursor.execute(f"PRAGMA table_info('{table}')")]
        fks = [dict(row) for row in cursor.execute(f"PRAGMA foreign_key_list('{table}')")]
        indexes = []
        for idx_row in cursor.execute(f"PRAGMA index_list('{table}')"):
            idx = dict(idx_row)
            index_columns = [row['name'] for row in cursor.execute(f"PRAGMA index_info('{idx['name']}')")]
            idx['columns'] = index_columns
            indexes.append(idx)
        count = cursor.execute(f"SELECT COUNT(*) AS c FROM '{table}'").fetchone()[0]

        output.extend([
            f'## Table: {table}',
            '',
            '| Column | Type | PK | Nullable |',
            '|--------|------|----|----------|',
        ])
        for col in columns:
            output.append(f"| {col['name']} | {col['type']} | {'YES' if col['pk'] else ''} | {'NO' if col['notnull'] else 'YES'} |")
        output.extend(['',])
        if fks:
            output.extend([
                '**Foreign keys:**',
                '',
                '| From Column | References Table | References Column | On Update | On Delete |',
                '|-------------|------------------|-------------------|-----------|-----------|',
            ])
            for fk in fks:
                output.append(f"| {fk['from']} | {fk['table']} | {fk['to']} | {fk['on_update']} | {fk['on_delete']} |")
            output.extend(['',])
        if indexes:
            output.extend([
                '**Indexes:**',
                '',
                '| Index Name | Unique | Columns |',
                '|------------|--------|---------|',
            ])
            for idx in indexes:
                output.append(f"| {idx['name']} | {'YES' if idx['unique'] else 'NO'} | {', '.join(idx['columns'])} |")
            output.extend(['',])
        output.extend([
            f'**Row count:** {count}',
            '',
            '---',
            '',
        ])
    return '\n'.join(output)


def build_validation_query_audit():
    tree = ast.parse(source)
    collector = QueryCollector()
    collector.visit(tree)
    collector.queries.sort(key=lambda item: item[3])

    output = [
        '# Validation Query Audit',
        '',
        f'**Acceptance validator:** {source_path}',
        '',
    ]
    for idx, (category, label, sql, lineno) in enumerate(collector.queries, 1):
        tables, _ = parse_tables(sql)
        output.extend([
            f'## Query ID: Q{idx}',
            '',
            f'**Category:** {category}',
        ])
        if label:
            output.append(f'**Label:** {label}')
        output.extend([
            f'**Source line:** {lineno}',
            '',
            '**SQL:**',
            '```sql',
        ])
        output.extend(sql.splitlines())
        output.extend([
            '```',
            '',
            f'**Tables referenced:** {", ".join(tables) if tables else "None parsed"}',
            '',
            '---',
            '',
        ])
    return '\n'.join(output)


def main():
    conn = sqlite3.connect(str(DB))
    conn.row_factory = sqlite3.Row
    schema_doc = build_schema_inventory(conn)
    audit_doc = build_validation_query_audit()
    (DOCS / 'DatabaseSchemaInventory.md').write_text(schema_doc, encoding='utf-8')
    (DOCS / 'ValidationQueryAudit.md').write_text(audit_doc, encoding='utf-8')


if __name__ == '__main__':
    main()
