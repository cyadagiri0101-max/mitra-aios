import os, re

root = r'd:\Mitra3.0\mitra-backend\src'
modules = ['ai','ai-usage','audit','bom-analysis','cache','collaboration','commercial','cps','customer','design','dispatch','document','drawing-analysis','ecr-eco','engineering-file-indexer','engineering-library','folder-intelligence','health','knowledge','machine','machine-status','manufacturing','metrics','mold','planning','platform','product','project','quality','search','service','storage','supplier','tool-master','workflow','common','database']

route_decor = re.compile(r'@Controller\s*\(\s*([`\"\']?)(.*?)\1\s*\)')
route_method = re.compile(r'@(Get|Post|Put|Patch|Delete|Options|Head|All)\s*\(\s*([`\"\']?)(.*?)\2\s*\)')
use_guards = re.compile(r'@UseGuards\s*\(([^)]*)\)')
use_pipes = re.compile(r'@UsePipes\s*\(([^)]*)\)')
class_re = re.compile(r'export\s+class\s+([A-Za-z0-9_]+)')
entity_re = re.compile(r'@Entity\s*\(\s*([`\"\']?)(.*?)\1\s*\)')
column_re = re.compile(r'@(PrimaryColumn|PrimaryGeneratedColumn|Column|CreateDateColumn|UpdateDateColumn|DeleteDateColumn|VersionColumn|ManyToOne|OneToMany|OneToOne|ManyToMany|JoinColumn|JoinTable)\b')
relation_re = re.compile(r'@(OneToOne|OneToMany|ManyToOne|ManyToMany|JoinColumn|JoinTable|JoinColumns|RelationId)\b')
index_re = re.compile(r'@Index\s*\(([^)]*)\)')
processor_re = re.compile(r'@Processor\s*\(\s*([`\"\']?)(.*?)\1\s*\)')
cron_re = re.compile(r'@(Cron|Interval|Timeout)\s*\(\s*([`\"\']?)(.*?)\2\s*\)')
event_re = re.compile(r'@EventPattern\s*\(\s*([`\"\']?)(.*?)\1\s*\)|@OnEvent\s*\(\s*([`\"\']?)(.*?)\3\s*\)')
queue_re = re.compile(r'BullModule\.registerQueue\(|QueueModule\.register\(|registerQueue\(|new\s+Queue\(|Queue<|BullModule\.forRoot|BullModule\.register')
service_dep_re = re.compile(r'(?:(?:private|public|protected)\s+readonly\s+)?([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_<>\[\]]+)')
method_re = re.compile(r'^(?:\s*(?:public|private|protected|async|static|readonly|abstract)\s+)*([A-Za-z0-9_]+)\s*\(([^)]*)\)')
param_type_re = re.compile(r':\s*([A-Za-z0-9_<>\[\]]+)')


def read_lines(path):
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        return f.readlines()


def read_text(path):
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()


def parse_controller(path):
    ls = read_lines(path)
    controllers = []
    current = None
    route_prefix = ''
    for idx, line in enumerate(ls, 1):
        m = route_decor.search(line)
        if m:
            route_prefix = m.group(2) or ''
        cr = class_re.search(line)
        if cr and 'Controller' in cr.group(1):
            current = {'controller': cr.group(1), 'route_prefix': route_prefix, 'methods': [], 'file': os.path.relpath(path, root).replace('\\', '/'), 'line': idx}
            controllers.append(current)
        rm = route_method.search(line)
        if rm and current:
            http = rm.group(1)
            route = rm.group(3) or ''
            guard = ''
            validation_pipe = ''
            dto = ''
            for prev in range(max(0, idx - 6), idx):
                pl = ls[prev]
                gu = use_guards.search(pl)
                if gu:
                    guard = gu.group(1).strip()
                up = use_pipes.search(pl)
                if up and 'ValidationPipe' in up.group(1):
                    validation_pipe = 'ValidationPipe'
            sig = ''
            for j in range(idx, min(idx + 8, len(ls))):
                line2 = ls[j].strip()
                sig += ' ' + line2
                if '{' in line2:
                    break
            m2 = method_re.search(sig)
            handler = m2.group(1) if m2 else ''
            if m2:
                params = m2.group(2)
                for part in params.split(','):
                    t = param_type_re.search(part)
                    if t and t.group(1).endswith('Dto'):
                        dto = t.group(1)
                        break
            current['methods'].append({'http_method': http, 'route': route, 'handler': handler, 'dto': dto or 'None', 'guard': guard or 'None', 'validation_pipe': validation_pipe or 'None', 'line': idx})
    return controllers


def parse_service(path):
    ls = read_lines(path)
    services = []
    current = None
    for idx, line in enumerate(ls, 1):
        cr = class_re.search(line)
        if cr and 'Service' in cr.group(1):
            current = {'service': cr.group(1), 'dependencies': [], 'methods': [], 'file': os.path.relpath(path, root).replace('\\', '/'), 'line': idx}
            services.append(current)
        if current and 'constructor(' in line:
            txt = line
            j = idx
            while ')' not in txt and j < len(ls):
                txt += ls[j]
                j += 1
            for m in service_dep_re.findall(txt):
                if m[0] == 'constructor':
                    continue
                current['dependencies'].append(m[0])
        if current:
            m = method_re.search(line)
            if m:
                name = m.group(1)
                if name != 'constructor' and not name.startswith('_'):
                    current['methods'].append({'name': name, 'line': idx})
    return services


def parse_entity(path):
    ls = read_lines(path)
    entities = []
    current = None
    for idx, line in enumerate(ls, 1):
        ent = entity_re.search(line)
        if ent:
            current = {'entity': None, 'table': ent.group(2) or '', 'columns': [], 'relations': [], 'indexes': [], 'file': os.path.relpath(path, root).replace('\\', '/'), 'line': idx}
            entities.append(current)
        cr = class_re.search(line)
        if cr and current and current['entity'] is None:
            current['entity'] = cr.group(1)
        if current:
            if column_re.search(line):
                current['columns'].append({'definition': line.strip(), 'line': idx})
            if relation_re.search(line):
                current['relations'].append({'definition': line.strip(), 'line': idx})
            if index_re.search(line):
                current['indexes'].append({'definition': line.strip(), 'line': idx})
    return entities


def parse_dto(path):
    txt = read_text(path)
    return [n for n in class_re.findall(txt) if n.endswith('Dto')]


def parse_suffix_items(path):
    txt = read_text(path)
    items = {'repositories': [], 'guards': [], 'interceptors': [], 'middleware': [], 'subscribers': [], 'providers': [], 'queues': [], 'events': []}
    for idx, line in enumerate(txt.splitlines(), 1):
        cr = class_re.search(line)
        if cr:
            name = cr.group(1)
            if name.endswith('Repository'):
                items['repositories'].append({'name': name, 'line': idx})
            if name.endswith('Guard'):
                items['guards'].append({'name': name, 'line': idx})
            if name.endswith('Interceptor'):
                items['interceptors'].append({'name': name, 'line': idx})
            if name.endswith('Middleware'):
                items['middleware'].append({'name': name, 'line': idx})
            if name.endswith('Subscriber'):
                items['subscribers'].append({'name': name, 'line': idx})
            if name.endswith('Provider'):
                items['providers'].append({'name': name, 'line': idx})
    if queue_re.search(txt):
        items['queues'].append({'name': os.path.relpath(path, root).replace('\\', '/'), 'line': 0})
    if event_re.search(txt):
        items['events'].append({'name': os.path.relpath(path, root).replace('\\', '/'), 'line': 0})
    return items


def parse_background_jobs(path):
    txt = read_text(path)
    jobs = []
    for idx, line in enumerate(txt.splitlines(), 1):
        m = processor_re.search(line)
        if m:
            jobs.append({'type': 'processor', 'value': m.group(2) or '', 'file': os.path.relpath(path, root).replace('\\', '/'), 'line': idx})
        m2 = cron_re.search(line)
        if m2:
            jobs.append({'type': m2.group(1), 'value': m2.group(3) or '', 'file': os.path.relpath(path, root).replace('\\', '/'), 'line': idx})
    return jobs


def format_named_list(items):
    if not items:
        return 'None'
    return '<br>'.join(f"{i['name']} ({i['file']} line {i['line']})" if 'file' in i else f"{i['name']} (line {i['line']})" for i in items)


def format_controller_details(controllers):
    if not controllers:
        return 'None'
    lines = []
    for c in controllers:
        lines.append(f"**{c['controller']}** ({c['file']} line {c['line']})")
        for m in c['methods']:
            lines.append(f"- {m['http_method']} `{c['route_prefix']}/{m['route']}` -> {m['handler']} (line {m['line']}) DTO={m['dto']} Guard={m['guard']} ValidationPipe={m['validation_pipe']}")
    return '<br>'.join(lines)


def format_service_details(services):
    if not services:
        return 'None'
    lines = []
    for s in services:
        deps = ', '.join(sorted(set(s['dependencies']))) or 'None'
        methods = ', '.join(f"{m['name']} (line {m['line']})" for m in s['methods']) or 'None'
        lines.append(f"**{s['service']}** ({s['file']} line {s['line']})<br>Dependencies: {deps}<br>Methods: {methods}")
    return '<br>'.join(lines)


def format_entity_details(entities):
    if not entities:
        return 'None'
    lines = []
    for e in entities:
        cols = '<br>'.join(f"{c['definition']} (line {c['line']})" for c in e['columns']) or 'None'
        rels = '<br>'.join(f"{r['definition']} (line {r['line']})" for r in e['relations']) or 'None'
        idxs = '<br>'.join(f"{i['definition']} (line {i['line']})" for i in e['indexes']) or 'None'
        lines.append(f"**{e['entity']}** ({e['file']} line {e['line']})<br>Table: {e['table'] or 'None'}<br>Columns:<br>{cols}<br>Relations:<br>{rels}<br>Indexes:<br>{idxs}")
    return '<br>'.join(lines)


def format_simple_list(items):
    if not items:
        return 'None'
    return '<br>'.join(items)

out_lines = []
for module in modules:
    if module in ['common','database']:
        base = os.path.join(root, module)
    else:
        base = os.path.join(root, 'modules', module)
    if not os.path.isdir(base):
        continue
    details = {'files': [], 'controllers': [], 'services': [], 'entities': [], 'dtos': [], 'repositories': [], 'guards': [], 'interceptors': [], 'middleware': [], 'subscribers': [], 'providers': [], 'background_jobs': [], 'queues': [], 'events': []}
    for dirpath, dirnames, filenames in os.walk(base):
        for fn in sorted(filenames):
            if not fn.endswith('.ts'):
                continue
            path = os.path.join(dirpath, fn)
            rel = os.path.relpath(path, root).replace('\\', '/')
            details['files'].append(rel)
            if rel.endswith('.controller.ts'):
                details['controllers'].extend(parse_controller(path))
            if rel.endswith('.service.ts'):
                details['services'].extend(parse_service(path))
            if rel.endswith('.entity.ts'):
                details['entities'].extend(parse_entity(path))
            if '/dto/' in rel or rel.endswith('.dto.ts'):
                for n in parse_dto(path):
                    details['dtos'].append({'name': n, 'file': rel, 'line': 0})
            suffix = parse_suffix_items(path)
            for k, v in suffix.items():
                details[k].extend(v)
            details['background_jobs'].extend(parse_background_jobs(path))
    for k in ['controllers','services','entities','dtos','repositories','guards','interceptors','middleware','subscribers','providers','background_jobs','queues','events']:
        seen = set(); uniq = []
        for item in details[k]:
            if isinstance(item, dict):
                key = (item.get('name', item.get('controller', item.get('service', ''))), item.get('file', ''), item.get('line', 0))
            else:
                key = item
            if key not in seen:
                seen.add(key); uniq.append(item)
        details[k] = uniq
    details['files'] = sorted(details['files'])
    out_lines.append(f"## {module}\n")
    out_lines.append("| Module | Controller Classes | Service Classes | Entity Classes | DTOs | Repositories | Guards | Interceptors | Middleware | Background Jobs | Queues | Events | Files |\n")
    out_lines.append("|---|---|---|---|---|---|---|---|---|---|---|---|---|\n")
    out_lines.append(f"| {module} | {format_controller_details(details['controllers'])} | {format_service_details(details['services'])} | {format_entity_details(details['entities'])} | {format_named_list(details['dtos'])} | {format_named_list(details['repositories'])} | {format_named_list(details['guards'])} | {format_named_list(details['interceptors'])} | {format_named_list(details['middleware'])} | {format_named_list(details['subscribers'])} | {format_named_list(details['providers'])} | {format_named_list(details['background_jobs'])} | {format_named_list(details['queues'])} | {format_named_list(details['events'])} | {format_simple_list(details['files'])} |\n")
with open(os.path.join(root, 'module_verification.md'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(out_lines))
print('DONE')
