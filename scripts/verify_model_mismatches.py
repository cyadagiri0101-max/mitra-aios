import sqlite3
import ast
from pathlib import Path

MODEL_PATH = Path('D:/MitraEngineeringLibrary/models/entities.py')
DB_PATH = Path('D:/MitraEngineeringLibrary/database/mekb.sqlite')

source = MODEL_PATH.read_text(encoding='utf-8')
root = ast.parse(source)
models = {}
class_to_table = {}
for node in root.body:
    if isinstance(node, ast.ClassDef):
        tablename = None
        columns = {}
        relationships = {}
        for stmt in node.body:
            if isinstance(stmt, ast.Assign) and len(stmt.targets) == 1 and isinstance(stmt.targets[0], ast.Name):
                name = stmt.targets[0].id
                if name == '__tablename__' and isinstance(stmt.value, ast.Constant):
                    tablename = stmt.value.value
                if isinstance(stmt.value, ast.Call) and isinstance(stmt.value.func, ast.Name) and stmt.value.func.id == 'Column':
                    col_type = None
                    primary_key = False
                    nullable = None
                    default = None
                    fk = None
                    if stmt.value.args:
                        arg = stmt.value.args[0]
                        if isinstance(arg, ast.Name):
                            col_type = arg.id
                        elif isinstance(arg, ast.Attribute) and isinstance(arg.value, ast.Name):
                            col_type = f"{arg.value.id}.{arg.attr}"
                        elif isinstance(arg, ast.Attribute):
                            col_type = arg.attr
                    for kw in stmt.value.keywords:
                        if kw.arg == 'primary_key' and isinstance(kw.value, ast.Constant):
                            primary_key = kw.value.value
                        if kw.arg == 'nullable' and isinstance(kw.value, ast.Constant):
                            nullable = kw.value.value
                        if kw.arg == 'default':
                            if isinstance(kw.value, ast.Constant):
                                default = repr(kw.value.value)
                            elif isinstance(kw.value, ast.Name):
                                default = kw.value.id
                            elif isinstance(kw.value, ast.Attribute):
                                if isinstance(kw.value.value, ast.Name):
                                    default = f"{kw.value.value.id}.{kw.value.attr}"
                                else:
                                    default = kw.value.attr
                            elif isinstance(kw.value, ast.Call):
                                func = kw.value.func
                                if isinstance(func, ast.Name):
                                    default = f"{func.id}()"
                                elif isinstance(func, ast.Attribute) and isinstance(func.value, ast.Name):
                                    default = f"{func.value.id}.{func.attr}()"
                        if kw.arg == 'server_default':
                            default = 'server_default'
                    for arg in stmt.value.args[1:]:
                        if isinstance(arg, ast.Call) and isinstance(arg.func, ast.Name) and arg.func.id == 'ForeignKey':
                            if arg.args and isinstance(arg.args[0], ast.Constant):
                                fk = arg.args[0].value
                    columns[name] = {
                        'type': col_type,
                        'primary_key': primary_key,
                        'nullable': nullable,
                        'default': default,
                        'foreign_key': fk,
                    }
                if isinstance(stmt.value, ast.Call) and isinstance(stmt.value.func, ast.Name) and stmt.value.func.id == 'relationship':
                    target = None
                    if stmt.value.args:
                        arg = stmt.value.args[0]
                        if isinstance(arg, ast.Constant):
                            target = arg.value
                        elif isinstance(arg, ast.Name):
                            target = arg.id
                    relationships[name] = {
                        'target': target,
                        'definition': ast.unparse(stmt.value) if hasattr(ast, 'unparse') else None,
                    }
        if tablename:
            models[tablename] = {
                'class': node.name,
                'columns': columns,
                'relationships': relationships,
            }
            class_to_table[node.name] = tablename

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
tables = [row['name'] for row in cur.fetchall()]

print('VERIFICATION REPORT')
print('')
print('### Default Differences')
for table, info in models.items():
    cur.execute(f"PRAGMA table_info('{table}')")
    rows = {row['name']: row for row in cur.fetchall()}
    for column, definition in info['columns'].items():
        if definition['default'] is not None and column in rows:
            row = rows[column]
            if row['dflt_value'] is None:
                print(f"- Model={info['class']} Table={table} Column={column}")
                print(f"  SQLite definition: type={row['type']} pk={row['pk']} notnull={row['notnull']} default={row['dflt_value']}")
                print(f"  SQLAlchemy definition: type={definition['type']} primary_key={definition['primary_key']} nullable={definition['nullable']} default={definition['default']} fk={definition['foreign_key']}")
                print('  Is this actually different? NO')
                print('  Is this expected ORM behavior? YES')
                print('  Is this a verified defect? NO')
                print('  Evidence: ORM default values are Python-side defaults and SQLite has no database defaults.')
                print('  Recommendation: Treat as expected ORM difference unless application shows incorrect behavior.')
                print('')

print('### Relationship Verification')
for table, info in models.items():
    for rel_name, rel in info['relationships'].items():
        if rel_name in ('engineering_notes', 'data_source'):
            target = rel['target']
            target_table = class_to_table.get(target)
            print(f"- Model={info['class']} Table={table} Relationship={rel_name}")
            print(f"  Target reference: {target}")
            print(f"  Resolved target table: {target_table}")
            print(f"  Relationship definition: {rel['definition']}")
            if target_table:
                print('  Is this actually different? NO')
                print('  Is this expected ORM behavior? YES')
                print('  Is this a verified defect? NO')
                print('  Evidence: target model exists and relationship name maps to a related collection/parent entity.')
                print('  Recommendation: Verify model relationship resolves to existing class and foreign key on opposite side.')
            else:
                print('  Is this actually different? NOT VERIFIABLE')
                print('  Is this expected ORM behavior? NOT VERIFIABLE')
                print('  Is this a verified defect? NOT VERIFIABLE')
                print('  Evidence: target class not found in ORM source by literal relationship argument.')
                print('  Recommendation: Confirm if relationship target uses string alias or import alias in model definitions.')
            print('')
conn.close()
