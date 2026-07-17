import ast
import re
from pathlib import Path

VALIDATOR_PATH = Path('D:/Mitra3.0/acceptance_evidence.py')
SCHEMA_MD_PATH = Path('d:/Mitra3.0/docs/DatabaseSchemaInventory.md')
OUTPUT_PATH = Path('d:/Mitra3.0/docs/ValidatorVerificationReport.md')

SQL_ID_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def parse_schema(md_path):
    text = md_path.read_text(encoding='utf-8')
    schema = {}
    current_table = None
    for line in text.splitlines():
        line = line.strip()
        if line.startswith('## '):
            current_table = line[3:].strip()
            schema[current_table] = {'columns': set(), 'types': {}}
            continue
        if current_table and line.startswith('|') and not line.startswith('| Name') and not line.startswith('| ----'):
            parts = [p.strip() for p in line.split('|')[1:-1]]
            if len(parts) >= 5:
                col_name = parts[0]
                col_type = parts[1]
                if col_name and col_type:
                    schema[current_table]['columns'].add(col_name)
                    schema[current_table]['types'][col_name] = col_type
    return schema


def extract_queries(py_path):
    source = py_path.read_text(encoding='utf-8')
    tree = ast.parse(source, filename=str(py_path))
    queries = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == 'sql':
                    value = node.value
                    if isinstance(value, ast.Constant) and isinstance(value.value, str):
                        queries.append((node.lineno, value.value.strip()))
                    elif isinstance(value, ast.JoinedStr):
                        text = ''
                        for part in value.values:
                            if isinstance(part, ast.Constant) and isinstance(part.value, str):
                                text += part.value
                        queries.append((node.lineno, text.strip()))
    return queries


def find_tables_and_aliases(sql):
    tokens = re.findall(r"[A-Za-z_][A-Za-z0-9_]*|\.|\*|=|\(|\)|,|AS|as", sql)
    tables = []
    aliases = {}
    # simpler scanning for FROM and JOIN
    words = re.findall(r"\bFROM\b|\bJOIN\b|\bAS\b|\bLEFT\b|\bINNER\b|\bOUTER\b|\bRIGHT\b|\bFULL\b|\bON\b|\bWHERE\b|\bGROUP\b|\bHAVING\b|\bORDER\b|\bSELECT\b", sql, flags=re.IGNORECASE)
    parts = re.split(r"\b(FROM|JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN)\b", sql, flags=re.IGNORECASE)
    for i in range(len(parts)):
        part = parts[i]
        if re.match(r"\b(FROM|JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN)\b", part, flags=re.IGNORECASE):
            continue
        prev = parts[i-1] if i > 0 else ''
        if re.search(r"\bFROM\b|\bJOIN\b", prev, flags=re.IGNORECASE):
            # parse table and optional alias
            seg = part.strip()
            if not seg:
                continue
            seg = re.split(r"\bWHERE\b|\bON\b|\bGROUP\b|\bHAVING\b|\bORDER\b|\bLIMIT\b", seg, flags=re.IGNORECASE)[0].strip()
            tokens = seg.split()
            if tokens:
                table = tokens[0].strip(',')
                alias = None
                if len(tokens) >= 2 and tokens[1].upper() != 'ON' and tokens[1].upper() != 'AS':
                    alias = tokens[1].strip(',')
                elif len(tokens) >= 3 and tokens[1].upper() == 'AS':
                    alias = tokens[2].strip(',')
                tables.append((table, alias))
                if alias:
                    aliases[alias] = table
    return tables, aliases


def find_column_references(sql, aliases):
    # naive select / where / group by / order by scan for identifiers with dot or standalone columns
    cols = set()
    # find qualified identifiers x.y
    for match in re.finditer(r"\b([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\b", sql):
        cols.add((match.group(1), match.group(2)))
    # unqualified identifiers in WHERE/GROUP/ORDER/HAVING clauses maybe columns, but hard to know if table alias or column alias
    return cols


def alias_is_valid(alias):
    return bool(SQL_ID_PATTERN.match(alias))


def classify_query(line, sql, schema):
    table_refs, alias_map = find_tables_and_aliases(sql)
    cols = find_column_references(sql, alias_map)
    invalid_tables = []
    invalid_columns = []
    alias_issues = []
    for table, alias in table_refs:
        if table.upper() == 'SELECT' or table.upper() == 'FROM' or table.upper() == 'WHERE':
            continue
        if table not in schema:
            invalid_tables.append(table)
        if alias and not alias_is_valid(alias):
            alias_issues.append(alias)
    for prefix, col in cols:
        # prefix may be alias or bare table
        if prefix in alias_map:
            table = alias_map[prefix]
        else:
            table = prefix
        if table not in schema:
            invalid_tables.append(table)
        else:
            if col not in schema[table]['columns']:
                invalid_columns.append((table, col))
    integrity = 'VALID'
    if invalid_tables or invalid_columns or alias_issues:
        integrity = 'VERIFIED DEFECT'
    return {
        'line': line,
        'sql': sql,
        'tables': table_refs,
        'aliases': alias_map,
        'invalid_tables': sorted(set(invalid_tables)),
        'invalid_columns': sorted(set(invalid_columns)),
        'alias_issues': alias_issues,
        'classification': integrity,
    }


def generate_report():
    schema = parse_schema(SCHEMA_MD_PATH)
    queries = extract_queries(VALIDATOR_PATH)
    report_lines = [
        '# Validator Verification Report',
        '',
        '## Validator SQL Query Cross-Reference',
        '',
    ]
    defects = []
    false_positives = []
    not_verifiable = []
    valid = []
    for line, sql in queries:
        result = classify_query(line, sql, schema)
        if result['classification'] == 'VALID':
            valid.append(result)
        else:
            defects.append(result)
        report_lines.append(f"### Query at line {line}")
        report_lines.append('')
        report_lines.append(f"SQL: ```sql
{sql}
```")
        report_lines.append(f"Tables: {result['tables']}")
        report_lines.append(f"Aliases: {result['aliases']}")
        report_lines.append(f"Invalid tables: {result['invalid_tables']}")
        report_lines.append(f"Invalid columns: {result['invalid_columns']}")
        report_lines.append(f"Alias issues: {result['alias_issues']}")
        report_lines.append(f"Classification: {result['classification']}")
        report_lines.append('')
    report_lines.append('## Summary')
    report_lines.append('')
    report_lines.append(f"Total SQL queries: {len(queries)}")
    report_lines.append(f"VALID: {len(valid)}")
    report_lines.append(f"VERIFIED DEFECT: {len(defects)}")
    report_lines.append(f"FALSE POSITIVE: {len(false_positives)}")
    report_lines.append(f"NOT VERIFIABLE: {len(not_verifiable)}")
    report_lines.append('')
    OUTPUT_PATH.write_text('\n'.join(report_lines), encoding='utf-8')
    print(f"Generated {OUTPUT_PATH}")

if __name__ == '__main__':
    generate_report()
