import os
import re
from collections import defaultdict

ROOT = r'd:\Mitra3.0\mitra-backend\src'
BASELINE = r'd:\Mitra3.0\mitra-backend\src\module_verification.md'

MODULE_HEADING = re.compile(r'^##\s+(?P<module>\S+)')
TABLE_ROW = re.compile(r'^\|\s*(?P<module>[^|]+)\s*\|\s*(?P<controllers>[^|]*)\|\s*(?P<services>[^|]*)\|\s*(?P<entities>[^|]*)\|\s*(?P<dtos>[^|]*)\|\s*(?P<repositories>[^|]*)\|\s*(?P<guards>[^|]*)\|\s*(?P<interceptors>[^|]*)\|\s*(?P<middleware>[^|]*)\|\s*(?P<background_jobs>[^|]*)\|\s*(?P<queues>[^|]*)\|\s*(?P<events>[^|]*)\|\s*(?P<files>[^|]*)\|')
ITEM_PATTERN = re.compile(r"\*\*(?P<name>[^*]+)\*\* \((?P<file>[^)]+) line (?P<line>\d+)\)")
LITEM_PATTERN = re.compile(r"(?P<name>[A-Za-z0-9_]+) \((?P<file>[^)]+) line (?P<line>\d+)\)")
LINEITEM_PATTERN = re.compile(r"(?P<name>[A-Za-z0-9_]+) \((?P<file>[^)]+) line (?P<line>\d+)\)")

# helper functions

def read_baseline():
    with open(BASELINE, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read().splitlines()


def all_ts_files():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        for fn in filenames:
            if fn.endswith('.ts'):
                yield os.path.join(dirpath, fn)


def read_file(path):
    try:
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    except FileNotFoundError:
        return ''


# search helpers

def contains_symbol(symbol, text):
    return re.search(r'\b' + re.escape(symbol) + r'\b', text) is not None


def find_in_files(symbols, paths, patterns):
    found = set()
    for path in paths:
        text = read_file(path)
        for label, pattern in patterns.items():
            if re.search(pattern, text, re.MULTILINE):
                found.add((label, path))
    return found


def parse_items(text, named=True):
    items = []
    fragments = [p.strip() for p in text.split('<br>') if p.strip()]
    for frag in fragments:
        m = ITEM_PATTERN.search(frag) if named else None
        if not m:
            m = LITEM_PATTERN.search(frag)
        if m:
            items.append({'name': m.group('name').strip(), 'file': m.group('file').strip(), 'line': int(m.group('line')), 'text': frag})
    return items


def parse_row(line):
    m = TABLE_ROW.match(line)
    if not m:
        return None
    data = m.groupdict()
    module = data['module'].strip()
    return {
        'module': module,
        'controllers': parse_items(data['controllers']),
        'services': parse_items(data['services']),
        'entities': parse_items(data['entities']),
        'dtos': parse_items(data['dtos']),
        'repositories': parse_items(data['repositories']),
        'guards': parse_items(data['guards']),
        'interceptors': parse_items(data['interceptors']),
        'middleware': parse_items(data['middleware']),
        'background_jobs': parse_items(data['background_jobs']),
        'queues': parse_items(data['queues']),
        'events': parse_items(data['events']),
        'files': [p.strip() for p in data['files'].split('<br>') if p.strip()]
    }


# verification logic

def find_module_files(module_name):
    base = os.path.join(ROOT, module_name) if module_name in ['common', 'database'] else os.path.join(ROOT, 'modules', module_name)
    if not os.path.isdir(base):
        return []
    return [os.path.join(dp, fn) for dp, dns, fns in os.walk(base) for fn in fns if fn.endswith('.ts')]


def verify_controller(obj, module_files, all_files):
    status = 'NOT VERIFIABLE'
    defined = os.path.exists(os.path.join(ROOT, obj['file'].replace('/', os.sep)))
    registered = False
    used = False
    file_path = os.path.join(ROOT, obj['file'].replace('/', os.sep))
    if not defined:
        return {'Defined': 'No', 'Registered': 'No', 'Used': 'No', 'Consumers': '', 'Implementation File': obj['file'], 'Line Number': obj['line'], 'Status': 'REFERENCED BUT MISSING'}
    text = read_file(file_path)
    if contains_symbol(obj['name'], text):
        used = True
    # find registration in module files within same module
    for fn in module_files:
        mod_text = read_file(fn)
        if re.search(re.escape(obj['name']) + r'\b', mod_text) and 'controllers' in mod_text:
            # require controllers: [ ... ] or includes name
            if re.search(r'controllers\s*:\s*\[[^\]]*' + re.escape(obj['name']) + r'[^\]]*\]', mod_text):
                registered = True
                break
    status = 'IMPLEMENTED' if defined and registered and used else 'DEFINED BUT UNUSED' if defined and not registered and not used else 'IMPLEMENTED' if defined and registered else 'DEFINED BUT UNUSED'
    return {'Defined': 'Yes', 'Registered': 'Yes' if registered else 'No', 'Used': 'Yes' if used else 'No', 'Consumers': '', 'Implementation File': obj['file'], 'Line Number': obj['line'], 'Status': status}


def verify_service(obj, module_files, all_files):
    defined = os.path.exists(os.path.join(ROOT, obj['file'].replace('/', os.sep)))
    registered = False
    used = False
    consumers = set()
    file_path = os.path.join(ROOT, obj['file'].replace('/', os.sep))
    if not defined:
        return {'Defined': 'No', 'Registered': 'No', 'Used': 'No', 'Consumers': '', 'Implementation File': obj['file'], 'Line Number': obj['line'], 'Status': 'REFERENCED BUT MISSING'}
    for fn in module_files:
        text = read_file(fn)
        if re.search(r'\b' + re.escape(obj['name']) + r'\b', text) and 'providers' in text:
            if re.search(r'providers\s*:\s*\[[^\]]*' + re.escape(obj['name']) + r'[^\]]*\]', text):
                registered = True
                break
    for fn in all_files:
        text = read_file(fn)
        # constructor injection or @Inject
        if re.search(r'\b(private|public|protected)\s+[^:]+:\s*' + re.escape(obj['name']) + r'\b', text) or re.search(r'@Inject\(.*' + re.escape(obj['name']) + r'.*\)', text):
            used = True
            # derive consumer name from file path
            consumer = os.path.splitext(os.path.basename(fn))[0]
            consumers.add(consumer)
    status = 'IMPLEMENTED' if defined and registered and used else 'DEFINED BUT UNUSED' if defined and not used else 'REFERENCED BUT MISSING' if not defined else 'NOT VERIFIABLE'
    return {'Defined': 'Yes', 'Registered': 'Yes' if registered else 'No', 'Used': 'Yes' if used else 'No', 'Consumers': ', '.join(sorted(consumers)) or 'None', 'Implementation File': obj['file'], 'Line Number': obj['line'], 'Status': status}


def verify_entity(obj, module_files, all_files):
    defined = os.path.exists(os.path.join(ROOT, obj['file'].replace('/', os.sep)))
    registered = False
    used = False
    file_path = os.path.join(ROOT, obj['file'].replace('/', os.sep))
    if not defined:
        return {'Defined': 'No', 'Registered': 'No', 'Used': 'No', 'Consumers': '', 'Implementation File': obj['file'], 'Line Number': obj['line'], 'Status': 'REFERENCED BUT MISSING'}
    for fn in module_files:
        text = read_file(fn)
        if re.search(r'forFeature\s*\(\s*\[([^\]]*\b' + re.escape(obj['name']) + r'\b[^\]]*)\]', text):
            registered = True
            break
    for fn in all_files:
        text = read_file(fn)
        if re.search(r'\b' + re.escape(obj['name']) + r'\b', text):
            if fn != file_path:
                used = True
                break
    status = 'IMPLEMENTED' if defined and registered and used else 'DEFINED BUT UNUSED' if defined and (registered or used) else 'REFERENCED BUT MISSING' if not defined else 'NOT VERIFIABLE'
    return {'Defined': 'Yes', 'Registered': 'Yes' if registered else 'No', 'Used': 'Yes' if used else 'No', 'Consumers': 'Yes' if used else 'None', 'Implementation File': obj['file'], 'Line Number': obj['line'], 'Status': status}


def verify_dto(obj, module_files, all_files):
    defined = os.path.exists(os.path.join(ROOT, obj['file'].replace('/', os.sep)))
    used = False
    if not defined:
        return {'Defined': 'No', 'Registered': 'No', 'Used': 'No', 'Consumers': '', 'Implementation File': obj['file'], 'Line Number': obj['line'], 'Status': 'REFERENCED BUT MISSING'}
    for fn in all_files:
        if fn.endswith('.controller.ts'):
            text = read_file(fn)
            if re.search(r'\b' + re.escape(obj['name']) + r'\b', text):
                used = True
                break
    status = 'IMPLEMENTED' if defined and used else 'DEFINED BUT UNUSED' if defined else 'REFERENCED BUT MISSING'
    return {'Defined': 'Yes', 'Registered': 'Yes' if used else 'No', 'Used': 'Yes' if used else 'No', 'Consumers': 'Controller', 'Implementation File': obj['file'], 'Line Number': obj['line'], 'Status': status}


def verify_guard(obj, module_files, all_files):
    defined = os.path.exists(os.path.join(ROOT, obj['file'].replace('/', os.sep)))
    applied = False
    registered = False
    if not defined:
        return {'Defined': 'No', 'Registered': 'No', 'Used': 'No', 'Consumers': '', 'Implementation File': obj['file'], 'Line Number': obj['line'], 'Status': 'REFERENCED BUT MISSING'}
    for fn in all_files:
        text = read_file(fn)
        if re.search(r'@UseGuards\([^)]*' + re.escape(obj['name']) + r'[^)]*\)', text) or re.search(r'APP_GUARD', text) and re.search(r'\b' + re.escape(obj['name']) + r'\b', text):
            applied = True
            break
    status = 'IMPLEMENTED' if defined and applied else 'DEFINED BUT UNUSED'
    return {'Defined': 'Yes', 'Registered': 'Yes' if applied else 'No', 'Used': 'Yes' if applied else 'No', 'Consumers': 'None', 'Implementation File': obj['file'], 'Line Number': obj['line'], 'Status': status}


def verify_interceptor(obj, module_files, all_files):
    defined = os.path.exists(os.path.join(ROOT, obj['file'].replace('/', os.sep)))
    applied = False
    if not defined:
        return {'Defined': 'No', 'Registered': 'No', 'Used': 'No', 'Consumers': '', 'Implementation File': obj['file'], 'Line Number': obj['line'], 'Status': 'REFERENCED BUT MISSING'}
    for fn in all_files:
        text = read_file(fn)
        if re.search(r'@UseInterceptors\([^)]*' + re.escape(obj['name']) + r'[^)]*\)', text) or re.search(r'APP_INTERCEPTOR', text) and re.search(r'\b' + re.escape(obj['name']) + r'\b', text) or re.search(r'useGlobalInterceptors\([^)]*' + re.escape(obj['name']) + r'[^)]*\)', text, re.IGNORECASE):
            applied = True
            break
    status = 'IMPLEMENTED' if defined and applied else 'DEFINED BUT UNUSED'
    return {'Defined': 'Yes', 'Registered': 'Yes' if applied else 'No', 'Used': 'Yes' if applied else 'No', 'Consumers': 'None', 'Implementation File': obj['file'], 'Line Number': obj['line'], 'Status': status}


def verify_middleware(obj, module_files, all_files):
    defined = os.path.exists(os.path.join(ROOT, obj['file'].replace('/', os.sep)))
    registered = False
    if not defined:
        return {'Defined': 'No', 'Registered': 'No', 'Used': 'No', 'Consumers': '', 'Implementation File': obj['file'], 'Line Number': obj['line'], 'Status': 'REFERENCED BUT MISSING'}
    for fn in all_files:
        text = read_file(fn)
        if re.search(r'\b' + re.escape(obj['name']) + r'\b', text) and re.search(r'consumer\.apply\([^)]*' + re.escape(obj['name']) + r'[^)]*\)', text):
            registered = True
            break
    status = 'IMPLEMENTED' if defined and registered else 'DEFINED BUT UNUSED'
    return {'Defined': 'Yes', 'Registered': 'Yes' if registered else 'No', 'Used': 'Yes' if registered else 'No', 'Consumers': 'None', 'Implementation File': obj['file'], 'Line Number': obj['line'], 'Status': status}


def verify_background_job(obj, module_files, all_files):
    defined = os.path.exists(os.path.join(ROOT, obj['file'].replace('/', os.sep)))
    registered = False
    used = False
    if not defined:
        return {'Defined': 'No', 'Registered': 'No', 'Used': 'No', 'Consumers': '', 'Implementation File': obj['file'], 'Line Number': obj['line'], 'Status': 'REFERENCED BUT MISSING'}
    file_path = os.path.join(ROOT, obj['file'].replace('/', os.sep))
    text = read_file(file_path)
    if '@Processor' in text or '@Cron' in text or '@Interval' in text or '@Timeout' in text:
        used = True
    for fn in module_files:
        mod_text = read_file(fn)
        if re.search(re.escape(obj['file']), mod_text) or re.search(r'\b' + re.escape(obj['name']) + r'\b', mod_text):
            registered = True
            break
    status = 'IMPLEMENTED' if defined and used else 'DEFINED BUT UNUSED'
    return {'Defined': 'Yes', 'Registered': 'Yes' if registered else 'No', 'Used': 'Yes' if used else 'No', 'Consumers': 'None', 'Implementation File': obj['file'], 'Line Number': obj['line'], 'Status': status}


def verify_queue_event(obj, all_files, key):
    defined = os.path.exists(os.path.join(ROOT, obj['file'].replace('/', os.sep)))
    registered = False
    used = False
    if not defined:
        return {'Defined': 'No', 'Registered': 'No', 'Used': 'No', 'Consumers': '', 'Implementation File': obj['file'], 'Line Number': obj['line'], 'Status': 'REFERENCED BUT MISSING'}
    file_path = os.path.join(ROOT, obj['file'].replace('/', os.sep))
    text = read_file(file_path)
    if key == 'queues':
        used = bool(re.search(r'BullModule\.registerQueue|QueueModule\.register|registerQueue\(|new\s+Queue|BullModule\.forRoot|BullModule\.register', text))
    elif key == 'events':
        used = bool(re.search(r'@EventPattern|@OnEvent', text))
    for fn in all_files:
        mod_text = read_file(fn)
        if re.search(re.escape(obj['file']), mod_text) or re.search(re.escape(obj['name']), mod_text):
            registered = True
            break
    status = 'IMPLEMENTED' if defined and used else 'DEFINED BUT UNUSED'
    return {'Defined': 'Yes', 'Registered': 'Yes' if registered else 'No', 'Used': 'Yes' if used else 'No', 'Consumers': 'None', 'Implementation File': obj['file'], 'Line Number': obj['line'], 'Status': status}


def main():
    lines = read_baseline()
    entries = []
    current_module = None
    for line in lines:
        h = MODULE_HEADING.match(line)
        if h:
            current_module = h.group('module').strip()
            continue
        row = parse_row(line)
        if not row or row['module'].strip() != current_module:
            continue
        row['module'] = current_module
        entries.append(row)

    all_files = list(all_ts_files())
    output = []
    headers = ['Object', 'Type', 'Defined', 'Registered', 'Used', 'Consumers', 'Implementation File', 'Line Number', 'Status']
    output.append('| ' + ' | '.join(headers) + ' |')
    output.append('| ' + ' | '.join(['---'] * len(headers)) + ' |')
    for row in entries:
        module = row['module']
        module_files = find_module_files(module)
        for category, items in [('Controller', row['controllers']), ('Service', row['services']), ('Entity', row['entities']), ('DTO', row['dtos']), ('Guard', row['guards']), ('Interceptor', row['interceptors']), ('Middleware', row['middleware']), ('Background Job', row['background_jobs']), ('Queue', row['queues']), ('Event', row['events'])]:
            for item in items:
                if category == 'Controller':
                    v = verify_controller(item, module_files, all_files)
                elif category == 'Service':
                    v = verify_service(item, module_files, all_files)
                elif category == 'Entity':
                    v = verify_entity(item, module_files, all_files)
                elif category == 'DTO':
                    v = verify_dto(item, module_files, all_files)
                elif category == 'Guard':
                    v = verify_guard(item, module_files, all_files)
                elif category == 'Interceptor':
                    v = verify_interceptor(item, module_files, all_files)
                elif category == 'Middleware':
                    v = verify_middleware(item, module_files, all_files)
                elif category == 'Background Job':
                    v = verify_background_job(item, module_files, all_files)
                elif category in ('Queue', 'Event'):
                    v = verify_queue_event(item, all_files, category.lower())
                output.append(f"| {item['name']} | {category} | {v['Defined']} | {v['Registered']} | {v['Used']} | {v['Consumers']} | {v['Implementation File']} | {v['Line Number']} | {v['Status']} |")
    print('\n'.join(output))

if __name__ == '__main__':
    main()
