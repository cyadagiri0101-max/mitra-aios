---
id: AIOS-RC1.1-001
title: AIOS RC1.1 Architecture Review
version: 1.1.0
status: APPROVED
created: 2026-07-09
---

# AIOS RC1.1 Architecture Review

## Executive Summary

The AIOS codebase contains **two parallel implementations** of the same functionality: a compact runtime (`aios/`, 11 files, ~350 lines) and a richer tooling layer (`tooling/scripts/`, 13 files, ~3,364 lines). Neither system is canonical. The runtime plugins are stubs; the tooling scripts are more capable but disconnected. State files were stale (5% vs 38% actual). Architecture documents are empty scaffolding. This review identifies every inconsistency and prescribes a single-owner architecture.

---

## 1. Inventory

### 1.1 Runtime (`aios/`)

| File | Lines | Purpose |
|------|-------|---------|
| `__init__.py` | 3 | Package version |
| `__main__.py` | 5 | CLI entry point |
| `runtime.py` | 145 | Orchestrator + CLI parser |
| `config.py` | 146 | Configuration loading (JSON/YAML/env) |
| `logging.py` | 35 | Structured logging |
| `plugins/base.py` | 35 | Abstract plugin contract |
| `plugins/scanner/repository_scanner.py` | 129 | File tree walker + index generator |
| `plugins/state/state_plugin.py` | 35 | Writes `runtime-state.json` only |
| `plugins/context/context_plugin.py` | 37 | Writes empty context cache |
| `plugins/validator/validation_plugin.py` | 23 | Returns `{"status": "ok"}` |
| `plugins/reporting/reporting_plugin.py` | 32 | Dumps upstream context as JSON |
| **Total** | **~625** | |

### 1.2 Tooling (`tooling/scripts/`)

| File | Lines | Purpose |
|------|-------|---------|
| `orchestrate.py` | 135 | Subprocess-based script runner |
| `repository-scanner/scan-repository.py` | 302 | Full scanner with metadata extraction |
| `repository-scanner/scan-repository.ps1` | 227 | PowerShell reimplementation |
| `repository-scanner/generate-document-registry.py` | 265 | Document metadata extraction |
| `repository-scanner/generate-framework-registry.py` | 218 | Framework detection |
| `repository-scanner/consolidate-index.py` | 236 | Multi-index merger |
| `repository-scanner/generate-health-report.py` | 337 | Health scoring |
| `state-generator/generate-state.py` | 479 | Static state boilerplate generator |
| `context-loader/load-context.py` | 173 | State+index+knowledge loader |
| `context-loader/smart-loader.py` | 298 | Mode-based context loader with token budgets |
| `validate/validate-repository.py` | 253 | Structure/state/index/integrity checks |
| `analyze-optimization.py` | 441 | Context optimization analyzer (hardcoded data) |
| **Total** | **~3,364** | |

### 1.3 Tests

| File | Lines | Tests |
|------|-------|-------|
| `tests/test_aios_runtime.py` | 73 | 5 tests |

### 1.4 Architecture Documents

| Document | Status | Content |
|----------|--------|---------|
| AIOS-000 through AIOS-009 | Scaffolding | Headers only, no specifications |
| SVP-000 through SVP-009 | Scaffolding | Headers only, no specifications |

### 1.5 State Files

| File | Status |
|------|--------|
| `project.yaml/json` | Regenerated (was stale) |
| `framework.yaml/json` | Regenerated (was stale) |
| `repository.yaml/json` | Regenerated (was stale) |
| `session.yaml/json` | Regenerated (was stale) |
| `engagement.yaml` | Regenerated (was empty) |
| `next_task.yaml/json` | Regenerated (was stale) |
| `runtime-state.json` | Regenerated |
| `current-engagement.yaml` | Created (new) |
| `next-task.md/yaml` | **Orphan** — duplicates `next_task.*` |
| `project.md` | **Orphan** — duplicates `project.yaml` |
| `repository.md` | **Orphan** — duplicates `repository.yaml` |
| `session.md` | **Orphan** — duplicates `session.yaml` |
| `framework.md` | **Orphan** — duplicates `framework.yaml` |

---

## 2. Inconsistencies Found

### 2.1 Dual-System Architecture (CRITICAL)

Every capability exists in both runtime and tooling with divergent implementations:

| Capability | Runtime Plugin | Tooling Script | Gap |
|-----------|---------------|----------------|-----|
| Repository scanning | `RepositoryScannerPlugin` (129 lines) | `scan-repository.py` (302 lines) | Tooling has metadata extraction, markdown parsing, file classification |
| State generation | `StatePlugin` (35 lines) | `generate-state.py` (479 lines) | Tooling generates 5 state files; runtime generates 1 |
| Context loading | `ContextPlugin` (37 lines) | `load-context.py` (173 lines) + `smart-loader.py` (298 lines) | Tooling has mode-based loading, token budgets, cost estimation |
| Validation | `ValidationPlugin` (23 lines) | `validate-repository.py` (253 lines) | Tooling checks structure, state, index, integrity |
| Reporting | `ReportingPlugin` (32 lines) | `generate-health-report.py` (337 lines) | Tooling scores structure, documentation, state, index |
| Orchestration | `AIOSRuntime` (145 lines) | `orchestrate.py` (135 lines) | Runtime uses plugin lifecycle; tooling uses subprocess |

### 2.2 Duplicated Functions (CRITICAL)

| Function | Copies | Locations |
|----------|--------|-----------|
| MD5 hash | 4 | `repository_scanner.py:106-111`, `scan-repository.py:48-57`, `generate-document-registry.py:227-236`, `scan-repository.ps1:11-19` |
| File walker | 2 | `repository_scanner.py:45-79`, `scan-repository.py:63-108` |
| Reference extractor | 2 | `repository_scanner.py:113-120`, `scan-repository.py:168-189` |
| Broken reference detector | 2 | `repository_scanner.py:122-129`, `scan-repository.py:231-251` |
| YAML fallback writer | 1 | `generate-state.py:438-460` (fragile custom serializer) |

### 2.3 Dead Code

| Item | Location |
|------|----------|
| `ProviderConfig` class | `config.py:16-18` — defined, never used by any plugin |
| `BasePlugin.results` attribute | `base.py:14` — initialized, never read |
| `BasePlugin.name` attribute | `base.py:10` — defined, runtime uses dict keys instead |
| `ContextLoader.get_project_context()` | `load-context.py:132-139` — defined, never called |
| `ContextLoader.get_repository_context()` | `load-context.py:141-147` — defined, never called |
| `ContextLoader.get_framework_context()` | `load-context.py:149-155` — defined, never called |
| `StateGenerator._write_yaml_manually()` | `generate-state.py:438-460` — fragile fallback |
| `analyze-optimization.py` hardcoded data | Lines 111-143 — fake optimization sizes |

### 2.4 Missing `__init__.py` Files

| Directory | Has `__init__.py` |
|-----------|-------------------|
| `aios/plugins/` | No |
| `aios/plugins/scanner/` | No |
| `aios/plugins/state/` | No |
| `aios/plugins/context/` | No |
| `aios/plugins/validator/` | No |
| `aios/plugins/reporting/` | No |

Works via PEP 420 implicit namespace packages but is fragile.

### 2.5 State File Redundancy

19 files in `.ai/state/` with:
- 5 YAML+JSON duplicate pairs (same content, two formats)
- 5 `.md` orphan files duplicating YAML content
- 2 naming inconsistencies (`next-task` vs `next_task`)

### 2.6 Architecture Documents

All 20 architecture documents (`AIOS-000` through `AIOS-009`, `SVP-000` through `SVP-009`) are empty scaffolding templates with only section headers and bullet-point placeholders. They describe no actual architecture.

### 2.7 CLI Issues

| Issue | Severity |
|-------|----------|
| Exit code always 0 on partial failure | HIGH |
| No `--verbose`/`--quiet` flags | MEDIUM |
| Commands are string literals, not enums | LOW |
| `scan`, `refresh`, `all` all do the same thing | MEDIUM |

### 2.8 Security Issues

| Issue | Severity | Location |
|-------|----------|----------|
| MD5 for file hashing (cryptographically broken) | MEDIUM | 4 locations |
| No file size limits in scanner | MEDIUM | `repository_scanner.py:45` |
| `errors='ignore'` in file reading | LOW | `repository_scanner.py:117` |
| Bare `except:` in tooling scripts | MEDIUM | 5+ locations |

---

## 3. Architecture Violations

| # | Architecture Doc | Describes | Implemented |
|---|-----------------|-----------|-------------|
| A-1 | AIOS-005 | Agent types, lifecycle, coordination | No agent concept — only plugins |
| A-2 | AIOS-007 | Task classification, model selection | No routing logic |
| A-3 | AIOS-004 | Knowledge retrieval, ranking | Knowledge dir has 6 JSON stubs |
| A-4 | AIOS-002 | Checkpoint mechanisms, recovery | No recovery capability |
| A-5 | AIOS-008 | Policy enforcement, compliance | None implemented |
| A-6 | None | Plugin system (actual architecture) | Not documented anywhere |

---

## 4. Verdict

| Dimension | Grade |
|-----------|-------|
| Runtime design | B- (clean lifecycle, compact) |
| Plugin implementation | D (stubs, no real logic) |
| Tooling quality | C+ (functional but duplicated) |
| Architecture documentation | F (empty templates) |
| State management | D (stale, redundant, no validation) |
| Test coverage | F (5 tests, happy path only) |
| Code duplication | F (3,364 lines parallel code) |
| **Overall** | **D** — Foundation exists, significant debt |

---

**End of Architecture Review**
