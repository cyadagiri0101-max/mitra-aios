---
id: AIOS-RC1.1-010
title: AIOS RC1.1 Roadmap
version: 1.1.0
status: APPROVED
created: 2026-07-09
---

# AIOS RC1.1 Roadmap

## Phase 1: Architecture Stabilization (Current Sprint)

**Goal:** Make AIOS internally consistent. One runtime, one state system, one context loader.

| # | Task | Effort | Priority | Dependencies |
|---|------|--------|----------|-------------|
| 1.1 | Create `aios/utils/` (hashing, walker, serialization) | 2 hrs | P0 | None |
| 1.2 | Add `__init__.py` to all plugin directories | 10 min | P0 | None |
| 1.3 | Merge scanner logic (3→1) into `ScannerPlugin` | 4 hrs | P0 | 1.1 |
| 1.4 | Merge context loading (3→1) into `ContextPlugin` | 3 hrs | P0 | 1.1 |
| 1.5 | Merge validation (2→1) into `ValidatorPlugin` | 3 hrs | P0 | 1.1 |
| 1.6 | Implement `StateEngine` (generate/sync/validate/diff/history) | 6 hrs | P0 | 1.1 |
| 1.7 | Delete orphan state files (5 .md duplicates, naming fixes) | 30 min | P1 | 1.6 |
| 1.8 | Fix CLI exit codes and add `--verbose`/`--quiet` | 1 hr | P1 | None |
| 1.9 | Replace MD5 with SHA-256 in hashing utility | 30 min | P1 | 1.1 |
| 1.10 | Add `aios sync` command (full pipeline) | 2 hrs | P1 | 1.3-1.6 |
| 1.11 | Add `aios state validate` command | 1 hr | P1 | 1.6 |
| 1.12 | Update tests for merged components | 3 hrs | P1 | 1.3-1.6 |
| 1.13 | Deprecate `tooling/scripts/` (add README pointing to runtime) | 30 min | P2 | 1.3-1.6 |

**Phase 1 Total:** ~27 hours

---

## Phase 2: Engine Implementation

**Goal:** Event-driven architecture, automatic state synchronization, session recovery.

| # | Task | Effort | Priority | Dependencies |
|---|------|--------|----------|-------------|
| 2.1 | Implement `EventEngine` (emit/subscribe/log) | 4 hrs | P0 | Phase 1 |
| 2.2 | Wire events between plugins | 3 hrs | P0 | 2.1 |
| 2.3 | Implement `RecoveryEngine` (checkpoint/resume) | 5 hrs | P0 | 1.6 |
| 2.4 | Implement `aios resume` command | 2 hrs | P0 | 2.3 |
| 2.5 | Implement `aios doctor` command | 2 hrs | P1 | 1.10 |
| 2.6 | Implement state integrity checksums | 2 hrs | P1 | 1.6 |
| 2.7 | Implement state history tracking | 2 hrs | P1 | 1.6 |
| 2.8 | Implement mode-based context loading | 3 hrs | P1 | 1.4 |
| 2.9 | Implement context cache manager | 2 hrs | P1 | 2.8 |
| 2.10 | Add `aios state diff` and `aios state history` | 2 hrs | P2 | 2.7 |

**Phase 2 Total:** ~27 hours

---

## Phase 3: Plugin Enhancement

**Goal:** Promote tooling-only capabilities into runtime plugins.

| # | Task | Effort | Priority | Dependencies |
|---|------|--------|----------|-------------|
| 3.1 | Add document registry generation to `IndexerPlugin` | 3 hrs | P0 | Phase 1 |
| 3.2 | Add framework registry generation to `IndexerPlugin` | 2 hrs | P0 | 3.1 |
| 3.3 | Add index consolidation to `IndexerPlugin` | 2 hrs | P0 | 3.1, 3.2 |
| 3.4 | Add health scoring to `HealthPlugin` | 3 hrs | P1 | Phase 1 |
| 3.5 | Add real report generation to `ReportingPlugin` | 4 hrs | P1 | 3.4 |
| 3.6 | Add file classification and metadata extraction to `ScannerPlugin` | 3 hrs | P1 | Phase 1 |
| 3.7 | Add `aios report` command | 2 hrs | P2 | 3.5 |
| 3.8 | Add `aios cache` commands | 1 hr | P2 | 2.9 |

**Phase 3 Total:** ~20 hours

---

## Phase 4: Architecture Documentation

**Goal:** Populate the 20 empty architecture documents with actual specifications.

| # | Task | Effort | Priority | Dependencies |
|---|------|--------|----------|-------------|
| 4.1 | Reconcile architecture conflicts (ValidationSummary Action #1) | 4 hrs | P0 | None |
| 4.2 | Correct META.md (ValidationSummary Action #2) | 30 min | P0 | 4.1 |
| 4.3 | Populate AIOS-000 Vision | 2 hrs | P1 | 4.1 |
| 4.4 | Populate AIOS-001 Layer Architecture | 3 hrs | P1 | Phase 1-2 |
| 4.5 | Populate AIOS-002 State Architecture | 2 hrs | P1 | 1.6 |
| 4.6 | Populate AIOS-005 Agent Architecture | 2 hrs | P2 | Phase 2 |
| 4.7 | Populate AIOS-006 Context Loading | 2 hrs | P2 | 2.8 |
| 4.8 | Populate AIOS-007 Model Routing | 2 hrs | P3 | Future |
| 4.9 | Populate remaining AIOS docs | 6 hrs | P3 | 4.3-4.7 |

**Phase 4 Total:** ~23 hours

---

## Phase 5: SVF Framework Population

**Goal:** Fill empty SVF framework directories.

| # | Task | Effort | Priority | Dependencies |
|---|------|--------|----------|-------------|
| 5.1 | Populate taxonomies (5 documents) | 5 hrs | P0 | 4.1 |
| 5.2 | Populate templates (7 documents) | 7 hrs | P1 | 5.1 |
| 5.3 | Populate prompt library (9 prompts) | 9 hrs | P2 | 5.2 |
| 5.4 | Populate prompt chains (3 chains) | 3 hrs | P3 | 5.3 |

**Phase 5 Total:** ~24 hours

---

## Summary

| Phase | Hours | Priority |
|-------|-------|----------|
| Phase 1: Architecture Stabilization | 27 | Immediate |
| Phase 2: Engine Implementation | 27 | After Phase 1 |
| Phase 3: Plugin Enhancement | 20 | After Phase 2 |
| Phase 4: Architecture Documentation | 23 | Parallel with Phase 2-3 |
| Phase 5: SVF Framework Population | 24 | After Phase 4.1 |
| **Total** | **~121 hours** | |

### Critical Path

```
Phase 1 (27h) → Phase 2 (27h) → Phase 3 (20h)
                 ↘ Phase 4.1 (4h) → Phase 5 (24h)
```

### Success Criteria

- [ ] One runtime (no parallel tooling scripts)
- [ ] One state system (StateEngine)
- [ ] One context loader (ContextPlugin with modes)
- [ ] One recovery mechanism (RecoveryEngine)
- [ ] One validation pipeline (ValidatorPlugin)
- [ ] One reporting pipeline (ReportingPlugin + HealthPlugin)
- [ ] One canonical architecture (all 20 docs populated)
- [ ] Every component has a single owner
- [ ] Session recovery < 3,500 tokens
- [ ] All tests passing

---

**End of Roadmap**
