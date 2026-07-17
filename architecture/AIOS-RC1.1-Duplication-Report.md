---
id: AIOS-RC1.1-004
title: AIOS RC1.1 Duplication Report
version: 1.1.0
status: APPROVED
created: 2026-07-09
---

# AIOS RC1.1 Duplication Report

## Summary

| Category | Duplicates | Lines Wasted |
|----------|-----------|--------------|
| MD5 hash function | 4 copies | ~40 lines |
| Repository scanner | 3 copies (Python×2 + PowerShell) | ~750 lines |
| State generation | 2 copies | ~514 lines |
| Context loading | 3 copies | ~508 lines |
| Validation | 2 copies | ~276 lines |
| Reporting | 2 copies | ~369 lines |
| Orchestration | 2 copies | ~280 lines |
| State files | 5 YAML+JSON pairs + 5 orphans | 10 redundant files |
| **Total** | **~23 duplicate units** | **~2,737 lines** |

---

## 1. MD5 Hash Function — 4 Copies

### Copy 1: `aios/plugins/scanner/repository_scanner.py:106-111`
```python
def _hash(self, file_path: Path) -> str:
    md5 = hashlib.md5()
    with open(file_path, "rb") as handle:
        for chunk in iter(lambda: handle.read(4096), b""):
            md5.update(chunk)
    return md5.hexdigest()
```

### Copy 2: `tooling/scripts/repository-scanner/scan-repository.py:48-57`
```python
def calculate_hash(self, file_path):
    try:
        md5 = hashlib.md5()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                md5.update(chunk)
        return md5.hexdigest()
    except:
        return None
```

### Copy 3: `tooling/scripts/repository-scanner/generate-document-registry.py:227-236`
Identical logic, third location.

### Copy 4: `tooling/scripts/repository-scanner/scan-repository.ps1:11-19`
PowerShell reimplementation of the same MD5 logic.

### Resolution
Single `aios/utils/hashing.py` with SHA-256 (MD5 is cryptographically broken).

---

## 2. Repository Scanner — 3 Copies

| Implementation | File | Lines | Capabilities |
|---------------|------|-------|-------------|
| Runtime plugin | `repository_scanner.py` | 129 | Walk, hash, detect duplicates/broken/orphans |
| Standalone Python | `scan-repository.py` | 302 | Walk, hash, metadata extraction, file classification, markdown parsing |
| Standalone PowerShell | `scan-repository.ps1` | 227 | Walk, hash (PowerShell reimplementation) |

### Shared Logic (duplicated)
- `os.walk` with directory filtering (`.startswith('.')`, `node_modules`)
- File stat collection (size, mtime)
- Path normalization (`replace('\\', '/')`)
- Hash calculation
- Reference extraction
- Broken reference detection
- Orphan detection
- Duplicate detection by hash

### Unique to Standalone
- Markdown metadata extraction (title, section count)
- File type classification (markdown/yaml/json/script)
- Per-extension file type tracking in `data.fileTypes`

### Resolution
Merge into single `ScannerPlugin` in `aios/plugins/scanner/`. Include all standalone capabilities.

---

## 3. State Generation — 2 Copies

| Implementation | File | Lines | Output |
|---------------|------|-------|--------|
| Runtime plugin | `state_plugin.py` | 35 | `runtime-state.json` (1 file, 5 fields) |
| Standalone script | `generate-state.py` | 479 | `project`, `framework`, `repository`, `session`, `next_task` (5 files, YAML+JSON) |

### Problem
- Runtime plugin generates only `runtime-state.json` — a minimal timestamp file
- Standalone script generates 5 state files but with **hardcoded static boilerplate** — no actual repository analysis
- Neither system derives state from repository evidence
- This is why state files were stale (5% vs 38%)

### Resolution
Replace both with `StateEngine` that derives state from repository evidence (indexes, reports, framework documents).

---

## 4. Context Loading — 3 Copies

| Implementation | File | Lines | Capabilities |
|---------------|------|-------|-------------|
| Runtime plugin | `context_plugin.py` | 37 | Writes empty context cache |
| Basic loader | `load-context.py` | 173 | Loads state + indexes + knowledge |
| Smart loader | `smart-loader.py` | 298 | Mode-based loading, token budgets, cost estimation |

### Problem
- Three different output files: `context-cache.json`, `context.json`, `context-{mode}.json`
- Runtime plugin produces `{"nodes": 0, "estimatedTokens": 0}` — always empty
- Smart loader has useful mode profiles but is disconnected from runtime
- `load-context.py` has 3 unused methods (`get_project_context`, `get_repository_context`, `get_framework_context`)

### Resolution
Merge into single `ContextPlugin` with mode-based loading from smart-loader.

---

## 5. Validation — 2 Copies

| Implementation | File | Lines | What it validates |
|---------------|------|-------|------------------|
| Runtime plugin | `validation_plugin.py` | 23 | Nothing — returns `{"status": "ok"}` |
| Standalone script | `validate-repository.py` | 253 | Structure, state, index, integrity |

### Resolution
Merge standalone logic into `ValidatorPlugin`.

---

## 6. Reporting — 2 Copies

| Implementation | File | Lines | What it reports |
|---------------|------|-------|----------------|
| Runtime plugin | `reporting_plugin.py` | 32 | Dumps upstream context as JSON |
| Standalone script | `generate-health-report.py` | 337 | Scores structure, documentation, state, index |

### Resolution
Merge standalone logic into `ReportingPlugin` or new `HealthPlugin`.

---

## 7. Orchestration — 2 Copies

| Implementation | File | Lines | Method |
|---------------|------|-------|--------|
| Runtime | `runtime.py` | 145 | Plugin lifecycle (init→execute→validate→report) |
| Standalone | `orchestrate.py` | 135 | Subprocess calls to individual scripts |

### Resolution
Keep `AIOSRuntime` plugin lifecycle. Eliminate `orchestrate.py`.

---

## 8. State File Redundancy

### YAML+JSON Duplicate Pairs (5)
| YAML File | JSON File | Content |
|-----------|-----------|---------|
| `project.yaml` | `project.json` | Identical |
| `framework.yaml` | `framework.json` | Identical |
| `repository.yaml` | `repository.json` | Identical |
| `session.yaml` | `session.json` | Identical |
| `next_task.yaml` | `next_task.json` | Identical |

### Orphan Markdown Duplicates (5)
| File | Duplicates |
|------|-----------|
| `project.md` | `project.yaml` |
| `framework.md` | `framework.yaml` |
| `repository.md` | `repository.yaml` |
| `session.md` | `session.yaml` |
| `next-task.md` / `next-task.yaml` | `next_task.yaml` |

### Resolution
- YAML is canonical format
- JSON generated as derived artifact (for tools that prefer JSON)
- Markdown duplicates deleted
- Naming standardized to `snake_case`

---

## 9. Configuration Duplication

| System | Config Source |
|--------|-------------|
| Runtime | `AIOSConfig` (JSON/YAML/env) |
| Each tooling script | `sys.argv[1]` for repo_root, hardcoded defaults |

### Resolution
All components use `AIOSConfig`. No script reads `sys.argv` directly.

---

## 10. Logging Duplication

| System | Method |
|--------|--------|
| Runtime | `aios/logging.py` — structured `logging` module |
| Each tooling script | `print()` statements |

### Resolution
All components use `aios/logging.py`.

---

## Lines of Code Impact

| Action | Lines Removed | Lines Added | Net |
|--------|-------------|-------------|-----|
| Merge scanner (3→1) | -531 | +200 | -331 |
| Merge state (2→1) | -514 | +150 | -364 |
| Merge context (3→1) | -508 | +180 | -328 |
| Merge validation (2→1) | -276 | +120 | -156 |
| Merge reporting (2→1) | -369 | +150 | -219 |
| Eliminate orchestrate.py | -135 | 0 | -135 |
| Eliminate analyze-optimization.py | -441 | 0 | -441 |
| Eliminate scan-repository.ps1 | -227 | 0 | -227 |
| Add utils (hashing, walker, serialization) | 0 | +100 | +100 |
| Add StateEngine | 0 | +200 | +200 |
| Add EventEngine | 0 | +100 | +100 |
| Add RecoveryEngine | 0 | +100 | +100 |
| **Total** | **-3,001** | **+1,300** | **-1,701** |

---

**End of Duplication Report**
