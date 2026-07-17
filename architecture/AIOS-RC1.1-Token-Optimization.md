---
id: AIOS-RC1.1-009
title: AIOS RC1.1 Token Optimization
version: 1.1.0
status: APPROVED
created: 2026-07-09
---

# AIOS RC1.1 Token Optimization

## Current State

### Session Recovery Context Load

The current session recovery loaded ~15,000 tokens across 16 files:

| File | Est. Tokens | Necessity |
|------|------------|-----------|
| `project.yaml` | ~800 | Required |
| `framework.yaml` | ~600 | Required |
| `repository.yaml` | ~400 | Partial — only key fields needed |
| `session.yaml` | ~500 | Partial — only status/progress needed |
| `engagement.yaml` | ~700 | Required |
| `next_task.yaml` | ~600 | Required |
| `runtime-state.json` | ~200 | Minimal — only version/mode |
| `consolidated-index.json` | ~3,000 | Excessive — full file listing not needed |
| `AIOS-RC1-Code-Review.md` | ~2,500 | Context-dependent |
| `ValidationSummary.md` | ~1,500 | Context-dependent |
| `M2-Customer-Verification.md` | ~2,000 | Context-dependent |
| `ArchitectureConsolidation.md` | ~800 | Context-dependent |
| `Errata.md` | ~500 | Context-dependent |
| `ReportVerification.md` | ~600 | Context-dependent |
| `EvidenceReview.md` | ~500 | Context-dependent |
| `SVF-RC1-Roadmap.md` | ~1,500 | Context-dependent |
| **Total** | **~16,600** | |

### Problems

1. **No mode-based loading** — All files loaded regardless of task
2. **No lazy loading** — Full files loaded when only summaries needed
3. **No incremental loading** — Can't load just changes since last session
4. **No cache reuse** — Context rebuilt from scratch every session
5. **consolidated-index.json is 365 lines** — Full file listing loaded when only summary needed
6. **Reports loaded in full** — 400-line reports loaded when only executive summary needed

---

## Target: Mode-Based Context Loading

### Context Profiles

| Mode | Max Tokens | Files Loaded | Purpose |
|------|-----------|-------------|---------|
| `recovery` | 3,500 | Checkpoint + 3 state files | Session resume |
| `discovery` | 8,000 | State + index summary + glossary | Exploration |
| `architecture` | 12,000 | State + architecture docs + decisions | Design |
| `implementation` | 16,000 | State + task + patterns + framework | Building |
| `validation` | 10,000 | State + session + index summary | Verification |
| `review` | 14,000 | State + patterns + decisions | Quality review |
| `governance` | 9,000 | State + index summary | Compliance |
| `release` | 11,000 | State + repository + index summary | Deployment |

### Lazy Loading Strategy

| Layer | Load Strategy | Token Cost |
|-------|-------------|-----------|
| State files (summary) | Always loaded, summary only | ~1,500 |
| Index (summary) | Load summary section only, not full file listing | ~300 |
| Knowledge | Load on demand when task requires it | ~500-2,000 |
| Reports | Load executive summary only, full report on demand | ~200 per report |
| Architecture | Load only when in architecture mode | ~1,000-5,000 |
| Framework | Load META.md + component counts only | ~400 |

### Incremental Loading

```
aios resume --incremental
│
├── Load checkpoint (last known state)
├── Check what changed since checkpoint:
│   ├── State files modified? → Reload changed state files
│   ├── New reports? → Load new report summaries
│   ├── Index changed? → Reload index summary
│   └── Framework changed? → Reload framework summary
│
└── Load only delta (~500-1,000 tokens for minor changes)
```

### Cache Reuse

```
.ai/cache/
├── context-recovery.json      ← Pre-built recovery context (~2,100 tokens)
├── context-discovery.json     ← Pre-built discovery context (~5,000 tokens)
├── context-architecture.json  ← Pre-built architecture context (~8,000 tokens)
├── context-implementation.json← Pre-built implementation context (~10,000 tokens)
├── context-validation.json    ← Pre-built validation context (~6,000 tokens)
└── context-review.json        ← Pre-built review context (~8,000 tokens)
```

Each cache file is regenerated only when its source files change (detected via `StateEngine.validate()`).

### Report Summaries

Instead of loading full 400-line reports, generate and cache executive summaries:

```json
{
  "report": "AIOS-RC1-Code-Review.md",
  "summary": "Foundation is sound. 45 findings: 3 CRITICAL, 14 HIGH, 18 MEDIUM. Top priority: resolve dual-system architecture.",
  "tokens": 50,
  "fullReportTokens": 2500
}
```

This reduces report context from ~10,000 tokens to ~500 tokens for 10 reports.

---

## Token Budget Enforcement

```python
class ContextPlugin:
    def load_for_mode(self, mode: str) -> Dict[str, Any]:
        profile = PROFILES[mode]
        budget = profile["maxTokens"]
        context = {}
        used = 0

        for source in profile["sources"]:
            data = self._load_source(source)
            tokens = estimate_tokens(data)

            if used + tokens > budget:
                self.logger.warning("Budget exceeded, skipping %s", source)
                continue

            context[source] = data
            used += tokens

        context["_metrics"] = {
            "tokensUsed": used,
            "tokenBudget": budget,
            "utilization": used / budget * 100,
        }
        return context
```

---

## Optimization Impact

| Scenario | Current Tokens | Target Tokens | Reduction |
|----------|---------------|---------------|-----------|
| Session recovery | ~15,000 | ~2,100 | 86% |
| Discovery mode | ~15,000 | ~5,000 | 67% |
| Architecture mode | ~15,000 | ~8,000 | 47% |
| Implementation mode | ~15,000 | ~10,000 | 33% |
| Incremental resume | ~15,000 | ~500 | 97% |

### Cost Impact (per session, Claude Sonnet pricing)

| Scenario | Current Cost | Target Cost | Savings |
|----------|-------------|-------------|---------|
| Session recovery | $0.045 | $0.006 | 86% |
| 10 sessions/day | $0.45 | $0.06 | $0.39/day |
| Monthly (22 days) | $9.90 | $1.32 | $8.58/month |

---

## File Layout

```
aios/plugins/context/
├── __init__.py
├── context_plugin.py    ← ContextPlugin with mode-based loading
├── profiles.py          ← Context profile definitions
├── token_estimator.py   ← Token estimation utilities
└── cache_manager.py     ← Cache read/write/invalidation
```

---

**End of Token Optimization**
