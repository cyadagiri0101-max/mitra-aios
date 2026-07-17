import os, re, codecs
from collections import defaultdict, namedtuple

ROOT = r'd:\Mitra3.0\mitra-backend\src'
VER = os.path.join(ROOT, 'verification_usage.md')

# simple scanner
ClassInfo = namedtuple('ClassInfo', ['name','type','file','line','decorators'])

classes = {}
files = []
for dp, dn, fns in os.walk(ROOT):
    for fn in fns:
        if fn.endswith('.ts'):
            files.append(os.path.join(dp,fn))

# read files and detect classes and decorators
for path in files:
    rel = os.path.relpath(path, ROOT).replace('\\','/')
    try:
        text = codecs.open(path,'r','utf-8','ignore').read()
        lines = text.splitlines()
    except Exception:
        continue
    for idx, line in enumerate(lines,1):
        m = re.search(r'export\s+class\s+([A-Za-z0-9_]+)', line)
        if m:
            name = m.group(1)
            # look back for decorators up to 8 lines
            decs = []
            for j in range(max(0, idx-8), idx-1):
                l = lines[j].strip()
                if l.startswith('@'):
                    decs.append(l)
            ctype = 'Unknown'
            if any(d.startswith('@Controller') for d in decs) or name.endswith('Controller'):
                ctype = 'Controller'
            elif any(d.startswith('@Injectable') for d in decs) or name.endswith('Service'):
                ctype = 'Service'
            elif any(d.startswith('@Entity') for d in decs) or name.endswith('Entity'):
                ctype = 'Entity'
            elif name.endswith('Dto'):
                ctype = 'DTO'
            elif name.endswith('Repository'):
                ctype = 'Repository'
            elif name.endswith('Guard'):
                ctype = 'Guard'
            elif name.endswith('Interceptor'):
                ctype = 'Interceptor'
            elif name.endswith('Middleware'):
                ctype = 'Middleware'
            elif name.endswith('Subscriber'):
                ctype = 'Subscriber'
            classes[name] = ClassInfo(name=name,type=ctype,file=rel,line=idx,decorators=';'.join(decs))

# parse verification_usage.md
reported = []
with codecs.open(VER,'r','utf-16-le') as f:
    for line in f.read().splitlines():
        if line.startswith('\ufeff'):
            line=line.lstrip('\ufeff')
        if not (line.startswith('| ') and not line.startswith('| ---')):
            continue
        parts=[p.strip() for p in line.strip('| ').split(' | ')]
        if parts[0]=='Object':
            headers=parts
            continue
        if len(parts)!=len(headers):
            continue
        rec = dict(zip(headers, parts))
        reported.append(rec)

# build lookup by object name
reported_by_name = {r['Object']: r for r in reported}

# compute verified data
verified_rows = []
missing_objects=[]
duplicates=[]
seen=set()
for r in reported:
    name=r['Object']
    typ=r['Type']
    rep_status=r['Status']
    rep_file=r['Implementation File']
    rep_line=r['Line Number']

    # check duplicates
    if name in seen:
        duplicates.append(name)
    seen.add(name)

    # existence
    exists = name in classes
    impl_ok = os.path.exists(os.path.join(ROOT, rep_file.replace('/','\\')))
    correct_type = (classes[name].type==typ) if exists else False
    correct_line = (str(classes[name].line)==rep_line) if exists else False
    correct_file = (classes[name].file==rep_file) if exists else False
    # determine verified status
    if not exists:
        verified_status='MISSING'
        missing_objects.append(name)
        reason='Class not found in source'
    else:
        # basic checks of registration
        # for controllers: check @Controller and registration in module files
        vstatus='IMPLEMENTED'
        reason_parts=[]
        ci = classes[name]
        if typ=='Controller':
            if '@Controller' not in ci.decorators and not name.endswith('Controller'):
                reason_parts.append('Missing @Controller')
                vstatus='PARTIAL'
            # check module registration - search for controllers: [Name]
            reg=False
            for fn in files:
                if fn.endswith('.module.ts'):
                    t=open(fn,'r',encoding='utf-8',errors='ignore').read()
                    if re.search(r'controllers\s*:\s*\[[^\]]*\b'+re.escape(name)+r'\b', t):
                        reg=True; break
            if not reg:
                reason_parts.append('Not registered in any module')
                vstatus='PARTIAL'
        elif typ=='Service':
            if '@Injectable' not in ci.decorators and not name.endswith('Service'):
                reason_parts.append('Missing @Injectable')
                vstatus='PARTIAL'
            # check providers registration
            reg=False
            for fn in files:
                if fn.endswith('.module.ts'):
                    t=open(fn,'r',encoding='utf-8',errors='ignore').read()
                    if re.search(r'providers\s*:\s*\[[^\]]*\b'+re.escape(name)+r'\b', t):
                        reg=True; break
            if not reg:
                reason_parts.append('Not in providers')
                vstatus='PARTIAL'
        elif typ=='Entity':
            if '@Entity' not in ci.decorators and not name.endswith('Entity'):
                reason_parts.append('Missing @Entity')
                vstatus='PARTIAL'
            # check TypeORM registration forFeature
            reg=False
            for fn in files:
                if fn.endswith('.module.ts'):
                    t=open(fn,'r',encoding='utf-8',errors='ignore').read()
                    if re.search(r'forFeature\s*\(\s*\[[^\]]*\b'+re.escape(name)+r'\b', t):
                        reg=True; break
            if not reg:
                reason_parts.append('Not registered in TypeORM forFeature')
                # don't mark partial necessarily
        elif typ=='DTO':
            # check usage in controllers
            used=False
            for fn in files:
                if fn.endswith('.controller.ts'):
                    t=open(fn,'r',encoding='utf-8',errors='ignore').read()
                    if re.search(r'\b'+re.escape(name)+r'\b', t):
                        used=True; break
            if not used:
                reason_parts.append('DTO not referenced in controllers')
                vstatus='PARTIAL'
        # finalize
        verified_status=vstatus
        reason='; '.join(reason_parts) or 'Matches implementation'
    verified_rows.append({'Object':name,'Reported Status':rep_status,'Verified Status':verified_status,'Reason':reason,'Reported File':rep_file,'Reported Line':rep_line,'Exists': 'Yes' if exists else 'No'})

# compute reported vs verified counts
rep_counts=defaultdict(int)
ver_counts=defaultdict(int)
for r in reported:
    rep_counts[r['Type']]+=1
for vr in verified_rows:
    # use classes dict to get type
    name=vr['Object']
    if name in classes:
        ver_counts[classes[name].type]+=1

# prepare missing objects list and incorrect status assignments
incorrect_status=[]
for vr in verified_rows:
    rs=vr['Reported Status']
    vs=vr['Verified Status']
    if rs!=vs:
        incorrect_status.append(vr)

# write audit report
out = []
# Table1
out.append('| Reported Count | Verified Count | Difference |')
out.append('|---:|---:|---:|')
all_types = sorted(set(list(rep_counts.keys())+list(ver_counts.keys())))
for t in all_types:
    out.append(f'| {t}: {rep_counts.get(t,0)} | {ver_counts.get(t,0)} | {ver_counts.get(t,0)-rep_counts.get(t,0)} |')

# Table2
out.append('\n| Object | Reported Status | Verified Status | Reason |')
out.append('|---|---|---|---|')
for vr in verified_rows:
    out.append(f"| {vr['Object']} | {vr['Reported Status']} | {vr['Verified Status']} | {vr['Reason']} |")

# Table3 Verification Errors (where Exists No)
out.append('\n| Verification Errors |')
out.append('|---|')
for vr in verified_rows:
    if vr['Exists']=='No':
        out.append(f"| {vr['Object']} referenced but class missing ({vr['Reported File']}:{vr['Reported Line']}) |")

# Table4 Duplicates
out.append('\n| Duplicate Objects |')
out.append('|---|')
for d in sorted(set(duplicates)):
    out.append(f'| {d} |')

# Table5 Missing Objects (same as verification errors)
out.append('\n| Missing Objects |')
out.append('|---|')
for m in missing_objects:
    out.append(f'| {m} |')

# Table6 Incorrect Status Assignments
out.append('\n| Incorrect Status Assignments | Reported | Verified | Reason |')
out.append('|---|---|---|---|')
for vr in incorrect_status:
    out.append(f"| {vr['Object']} | {vr['Reported Status']} | {vr['Verified Status']} | {vr['Reason']} |")

# Final Confidence
final_confidence = 'VERIFIED' if len(missing_objects)==0 and len(incorrect_status)==0 else 'NOT VERIFIED'
out.append('\n| Final Confidence |')
out.append('|---|')
out.append(f'| {final_confidence} |')

report = '\n'.join(out)
print(report)
with open(os.path.join(ROOT,'audit_report.md'),'w',encoding='utf-8') as f:
    f.write(report)
print('WROTE', os.path.join(ROOT,'audit_report.md'))
