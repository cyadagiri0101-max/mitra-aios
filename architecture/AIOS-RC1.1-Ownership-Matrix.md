---
id: AIOS-RC1.1-003
title: AIOS RC1.1 Ownership Matrix
version: 1.1.0
status: APPROVED
created: 2026-07-09
---

# AIOS RC1.1 Ownership Matrix

## Principle

Every capability has exactly ONE owner. No parallel implementations. No shared ownership.

---

## Current Ownership (BROKEN)

| Capability | Owner A (Runtime) | Owner B (Tooling) | Conflict |
|-----------|-------------------|--------------------|----------|
| Repository scanning | `RepositoryScannerPlugin` | `scan-repository.py` + `scan-repository.ps1` | Two implementations, different output quality |
| Document registry | None | `generate-document-registry.py` | Orphan — no runtime equivalent |
| Framework registry | None | `generate-framework-registry.py` | Orphan — no runtime equivalent |
| Index consolidation | None | `consolidate-index.py` | Orphan — no runtime equivalent |
| Health reporting | None | `generate-health-report.py` | Orphan — no runtime equivalent |
| State generation | `StatePlugin` (1 file) | `generate-state.py` (5 files) | Two systems, different scope |
| Context loading | `ContextPlugin` | `load-context.py` + `smart-loader.py` | Three files, three outputs |
| Validation | `ValidationPlugin` (stub) | `validate-repository.py` | One does nothing, one works |
| Reporting | `ReportingPlugin` (dump) | `generate-health-report.py` | One dumps context, one scores |
| Orchestration | `AIOSRuntime` | `orchestrate.py` | Plugin lifecycle vs subprocess |
| Configuration | `AIOSConfig` | Hardcoded in each script | One system, ignored by tooling |
| Logging | `aios/logging.py` | `print()` in every script | Structured vs unstructured |
| CLI | `runtime.py:build_parser()` | `sys.argv[1]` in each script | argparse vs positional |
| Hashing | `repository_scanner.py:_hash()` | `scan-repository.py:calculate_hash()` + 2 more | 4 copies of MD5 |
| File walking | `repository_scanner.py:execute()` | `scan-repository.py:scan()` | 2 copies |
| Optimization analysis | None | `analyze-optimization.py` | Orphan with fake data |

---

## Target Ownership (RC1.1)

| Capability | Owner | Module | Notes |
|-----------|-------|--------|-------|
| **Repository scanning** | `ScannerPlugin` | `aios/plugins/scanner/` | Merged from runtime + tooling. Best of both. |
| **Document registry** | `IndexerPlugin` | `aios/plugins/indexer/` | Promoted from tooling. |
| **Framework registry** | `IndexerPlugin` | `aios/plugins/indexer/` | Promoted from tooling. |
| **Index consolidation** | `IndexerPlugin` | `aios/plugins/indexer/` | Promoted from tooling. |
| **State generation** | `StateEngine` | `aios/engines/state_engine.py` | New unified engine. Replaces both. |
| **State validation** | `StateEngine` | `aios/engines/state_engine.py` | `validate()` method. |
| **State diffing** | `StateEngine` | `aios/engines/state_engine.py` | `diff()` method. |
| **State history** | `StateEngine` | `aios/engines/state_engine.py` | `history()` method. |
| **Context loading** | `ContextPlugin` | `aios/plugins/context/` | Merged from runtime + smart-loader. Mode-based. |
| **Token budgeting** | `ContextPlugin` | `aios/plugins/context/` | From smart-loader. |
| **Validation** | `ValidatorPlugin` | `aios/plugins/validator/` | Merged from runtime + tooling. Real checks. |
| **Health scoring** | `HealthPlugin` | `aios/plugins/health/` | Promoted from tooling. |
| **Reporting** | `ReportingPlugin` | `aios/plugins/reporting/` | Merged. Real report generation. |
| **Orchestration** | `AIOSRuntime` | `aios/core/runtime.py` | Single orchestrator. Plugin lifecycle. |
| **Configuration** | `AIOSConfig` | `aios/core/config.py` | Single source. All plugins read from it. |
| **Logging** | `aios.logging` | `aios/core/logging.py` | Single structured logger. |
| **CLI** | `aios.cli` | `aios/cli/cli.py` | Single argparse CLI. All commands. |
| **Event handling** | `EventEngine` | `aios/engines/event_engine.py` | New. Emit/subscribe pattern. |
| **Session recovery** | `RecoveryEngine` | `aios/engines/recovery_engine.py` | New. Checkpoint/resume. |
| **File hashing** | `aios.utils` | `aios/utils/hashing.py` | Single SHA-256 implementation. |
| **File walking** | `aios.utils` | `aios/utils/walker.py` | Single walker with skip rules. |
| **YAML I/O** | `aios.utils` | `aios/utils/serialization.py` | Single JSON+YAML reader/writer. |
| **Optimization analysis** | Deprecated | — | `analyze-optimization.py` had fake data. Remove. |
| **PowerShell scanning** | Deprecated | — | `scan-repository.ps1` is duplicate. Remove. |

---

## Eliminated Components

| Component | Reason | Replacement |
|-----------|--------|-------------|
| `tooling/scripts/orchestrate.py` | Duplicate orchestrator | `AIOSRuntime` |
| `tooling/scripts/repository-scanner/scan-repository.py` | Duplicate scanner | `ScannerPlugin` |
| `tooling/scripts/repository-scanner/scan-repository.ps1` | Duplicate in PowerShell | `ScannerPlugin` |
| `tooling/scripts/repository-scanner/generate-document-registry.py` | Standalone script | `IndexerPlugin` |
| `tooling/scripts/repository-scanner/generate-framework-registry.py` | Standalone script | `IndexerPlugin` |
| `tooling/scripts/repository-scanner/consolidate-index.py` | Standalone script | `IndexerPlugin` |
| `tooling/scripts/repository-scanner/generate-health-report.py` | Standalone script | `HealthPlugin` |
| `tooling/scripts/state-generator/generate-state.py` | Static boilerplate | `StateEngine` |
| `tooling/scripts/context-loader/load-context.py` | Duplicate loader | `ContextPlugin` |
| `tooling/scripts/context-loader/smart-loader.py` | Standalone loader | `ContextPlugin` |
| `tooling/scripts/validate/validate-repository.py` | Standalone validator | `ValidatorPlugin` |
| `tooling/scripts/analyze-optimization.py` | Fake data | Deprecated |
| `.ai/state/next-task.md` | Orphan duplicate | `next_task.yaml` |
| `.ai/state/next-task.yaml` | Orphan duplicate | `next_task.yaml` |
| `.ai/state/project.md` | Orphan duplicate | `project.yaml` |
| `.ai/state/repository.md` | Orphan duplicate | `repository.yaml` |
| `.ai/state/session.md` | Orphan duplicate | `session.yaml` |
| `.ai/state/framework.md` | Orphan duplicate | `framework.yaml` |

---

## Ownership Rules

1. **One owner per capability.** If two components do the same thing, one must be eliminated.
2. **Runtime is canonical.** All capabilities live in `aios/`. Tooling scripts are migration artifacts.
3. **Plugins own domain logic.** Engines own cross-cutting concerns (state, events, recovery).
4. **Utils own shared primitives.** Hashing, walking, serialization — never duplicated in plugins.
5. **Generated artifacts are owned by their generator.** State files are owned by `StateEngine`. Index files are owned by `IndexerPlugin`. Cache files are owned by `ContextPlugin`.

---

**End of Ownership Matrix**
