---
id: SVP-008
title: Software Verification Platform — Model Routing
type: PLATFORM-ARCHITECTURE
layer: 3
version: 1.0.0
status: DRAFT
author: [SVF Architect]
created: 2026-07-08
updated: 2026-07-08
depends_on: [SVP-004]
supersedes: null
engagement: null
assurance_level: L3
---

# Software Verification Platform (SVP) — Model Routing

## 1. Model Routing Overview

Model routing determines which AI model should execute which task. The routing system selects the best model based on task requirements, model capabilities, cost, and availability.

```
┌──────────────────────────────────────────────────────────────────┐
│                        MODEL ROUTING                             │
│                                                                  │
│  Task Requirements ──► Routing Engine ──► Model Selection        │
│       │                        │               │                 │
│       ▼                        ▼               ▼                 │
│  Reasoning Depth         Match task         Select best          │
│  Code Capability         requirements       model from           │
│  Context Window          against model      available            │
│  Cost Sensitivity        capabilities       providers            │
│  Multi-model need                           │                    │
│                                              ▼                   │
│                                       Execute Task               │
│                                       with Selected              │
│                                       Model(s)                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Task-to-Model Mapping

### 2.1 Architecture Tasks

| Task | Reasoning | Code | Context | Cost | Primary Model | Rationale |
|------|-----------|------|---------|------|---------------|-----------|
| Design system architecture | High | Read | Large | Medium | Qwen3.7 Max | Best architectural reasoning, large context for full system understanding |
| Document layer model | High | None | Medium | Low | GPT-4o | Strong structured output, good at documentation |
| Review architecture | High | Read | Large | Medium | Claude 3.5 Sonnet | Excellent at finding gaps and inconsistencies |
| Update ADR | Medium | None | Small | Low | Any capable model | Low complexity, structured format |

**Cross-validation:** For MAJOR architecture decisions, two different model families must validate the proposal. Recommended: Qwen + Claude.

### 2.2 Planning Tasks

| Task | Reasoning | Code | Context | Cost | Primary Model | Rationale |
|------|-----------|------|---------|------|---------------|-----------|
| Create milestone plan | High | None | Medium | Low | GPT-4o | Strong planning and sequencing |
| Estimate effort | Medium | None | Small | Low | Any capable model | Template-driven |
| Sequence dependencies | High | None | Medium | Low | Qwen3.7 Plus | Good dependency analysis |
| Risk assessment | High | None | Medium | Low | Claude 3.5 Sonnet | Strong risk identification |

### 2.3 Discovery Tasks

| Task | Reasoning | Code | Context | Cost | Primary Model | Rationale |
|------|-----------|------|---------|------|---------------|-----------|
| Inventory codebase | Medium | Read | Large | Low | Kimi K2.7 Code | Excellent code reading, large context |
| Map dependencies | Medium | Read | Large | Low | Kimi K2.7 Code | Strong dependency analysis |
| Identify entry points | Medium | Read | Large | Low | Qwen3.7 Plus | Good code structure understanding |
| Document architecture | Medium | Read | Large | Low | Claude 3.5 Sonnet | Good at creating readable docs from code |

### 2.4 Forensics Tasks

| Task | Reasoning | Code | Context | Cost | Primary Model | Rationale |
|------|-----------|------|---------|------|---------------|-----------|
| Deep code analysis | High | Full | Large | Medium | Kimi K2.7 Code | Specialized for code forensics |
| Vulnerability detection | High | Read | Medium | Medium | GPT-4o | Strong at pattern recognition for vulnerabilities |
| Evidence collection | Medium | Read | Medium | Low | Any capable model | Process-driven |
| Trace data flow | High | Read | Medium | Medium | Claude 3.5 Sonnet | Excellent at tracing logic |

**Cross-validation:** For L2/L3 assurance, two models must validate findings. Primary: Kimi K2.7. Secondary: Qwen3.7 Plus or GPT-4o.

### 2.5 Implementation Tasks

| Task | Reasoning | Code | Context | Cost | Primary Model | Rationale |
|------|-----------|------|---------|------|---------------|-----------|
| Create framework document | Medium | None | Medium | Low | Any capable model | Template-driven, follows frontmatter patterns |
| Write methodology | Medium | Read | Medium | Low | Claude 3.5 Sonnet | Good structured content |
| Create templates | Medium | None | Small | Low | Any capable model | Highly structured |
| Write prompts | Medium | None | Small | Low | GPT-4o | Strong prompt engineering |

### 2.6 Validation Tasks

| Task | Reasoning | Code | Context | Cost | Primary Model | Rationale |
|------|-----------|------|---------|------|---------------|-----------|
| Validate frontmatter | Low | None | Small | Low | Any capable model | Schema-driven |
| Check cross-references | Low | Read | Medium | Low | Any capable model | Pattern matching |
| Verify standards compliance | High | Read | Medium | Medium | Claude 3.5 Sonnet | Strong criteria matching |
| Quality assurance | High | Read | Medium | Medium | Qwen3.7 Plus | Good at finding edge cases |

### 2.7 Review Tasks

| Task | Reasoning | Code | Context | Cost | Primary Model | Rationale |
|------|-----------|------|---------|------|---------------|-----------|
| Peer review document | High | Read | Medium | Low | Claude 3.5 Sonnet | Excellent reviewer |
| Technical accuracy check | High | Read | Medium | Medium | Qwen3.7 Max | Deep technical understanding |
| Consistency check | Medium | Read | Medium | Low | Any capable model | Pattern-based |
| Approval recommendation | High | Read | Small | Low | GPT-4o | Strong judgment |

**Cross-validation:** REQUIRED. The reviewer must use a DIFFERENT model family than the author. If the author used a Qwen model, the reviewer must use Claude or GPT.

### 2.8 Documentation Tasks

| Task | Reasoning | Code | Context | Cost | Primary Model | Rationale |
|------|-----------|------|---------|------|---------------|-----------|
| Write documentation | Medium | Read | Medium | Low | Claude 3.5 Sonnet | Best documentation output |
| Create knowledge artifact | Medium | None | Medium | Low | GPT-4o | Good structured content |
| Update glossary | Low | None | Small | Low | Any capable model | Simple text entry |
| Generate state files | Low | None | Small | Low | Any capable model | Template-driven |

### 2.9 Release Tasks

| Task | Reasoning | Code | Context | Cost | Primary Model | Rationale |
|------|-----------|------|---------|------|---------------|-----------|
| Generate changelog | Low | Read | Medium | Low | Any capable model | Diff-based |
| Create integrity manifest | Low | None | Small | Low | Tooling script | Not a model task |
| Write release notes | Medium | None | Medium | Low | GPT-4o | Good summary generation |
| Tag release | Low | None | Small | Low | Tooling script | Not a model task |

---

## 3. Model Provider Configuration

### 3.1 Provider-Agnostic Format

Models are configured through provider files in `.ai/config/providers/`:

```yaml
# .ai/config/providers/alibaba.yaml
provider: alibaba
base_url: https://dashscope.aliyuncs.com/compatible-mode/v1
api_key_env: ALIBABA_API_KEY
models:
  - id: qwen3-max
    capabilities: [reasoning, analysis, code_read, structured_output]
    context_window: 128000
    cost_per_input_token: 0.00002
    cost_per_output_token: 0.00006
    strengths: [architecture, planning, deep_reasoning]
  - id: qwen3-plus
    capabilities: [reasoning, code_read, code_write, structured_output]
    context_window: 131072
    cost_per_input_token: 0.000005
    cost_per_output_token: 0.00001
    strengths: [implementation, code_analysis, validation]
```

```yaml
# .ai/config/providers/moonset.yaml
provider: moonset
base_url: https://api.moonset.com/v1
api_key_env: MOONSET_API_KEY
models:
  - id: kimi-k2-code
    capabilities: [code_read, code_write, code_analysis, reasoning]
    context_window: 128000
    cost_per_input_token: 0.00001
    cost_per_output_token: 0.00003
    strengths: [code_forensics, code_generation, dependency_analysis]
```

### 3.2 Routing Configuration

```yaml
# .ai/config/routing.yaml
routing:
  strategies:
    - name: cost_optimized
      description: Prefer lower-cost models that meet requirements
      selection: minimum_cost_meeting_requirements
    - name: quality_optimized
      description: Prefer highest-quality model regardless of cost
      selection: highest_capability
    - name: balanced
      description: Balance cost and quality
      selection: weighted_score

  current_strategy: balanced

  tasks:
    - id: code_deep_analysis
      mode: FORENSICS
      requirements:
        reasoning_depth: high
        code_capability: full
        context_window: large
      preferred_models:
        - provider: moonset
          model: kimi-k2-code
      fallback_models:
        - provider: alibaba
          model: qwen3-plus
      multi_model:
        required: recommended
        secondary_family: alibaba
```

---

## 4. Routing Decision Factors

### 4.1 Factor Definitions

| Factor | Scale | Description |
|--------|-------|-------------|
| Reasoning depth | Low / Medium / High | Does the task require multi-step reasoning, analysis, or synthesis? |
| Code capability | None / Read / Write / Full | Does the task involve reading, writing, or analyzing code? |
| Context window | Small (8K) / Medium (32K) / Large (100K+) / Huge (200K+) | How much context must fit in the window? |
| Cost sensitivity | Low / Medium / High | How important is minimizing cost? |
| Output structure | Freeform / Structured / Schema-validated | How precise must the output format be? |
| Multi-model need | No / Recommended / Required | Does this task need validation from multiple models? |

### 4.2 Factor Weights by Mode

| Mode | Reasoning | Code | Context | Cost | Output | Multi-Model |
|------|-----------|------|---------|------|--------|-------------|
| ARCHITECTURE | 5/5 | 2/5 | 4/5 | 2/5 | 4/5 | 2/5 |
| PLANNING | 4/5 | 1/5 | 3/5 | 3/5 | 3/5 | 1/5 |
| DISCOVERY | 3/5 | 4/5 | 5/5 | 4/5 | 2/5 | 1/5 |
| FORENSICS | 5/5 | 5/5 | 4/5 | 2/5 | 4/5 | 4/5 |
| IMPLEMENTATION | 2/5 | 4/5 | 3/5 | 4/5 | 5/5 | 1/5 |
| VALIDATION | 4/5 | 3/5 | 3/5 | 3/5 | 4/5 | 3/5 |
| REVIEW | 5/5 | 3/5 | 3/5 | 3/5 | 3/5 | 5/5 |
| GOVERNANCE | 4/5 | 1/5 | 2/5 | 2/5 | 3/5 | 1/5 |
| RELEASE | 1/5 | 1/5 | 2/5 | 5/5 | 4/5 | 1/5 |

---

## 5. Model Selection Algorithm

### 5.1 Selection Process

```
1. Determine task requirements (reasoning, code, context, cost)
2. Filter available models by minimum requirements
3. Score remaining models against factor weights
4. Apply multi-model requirement (recommended/required)
5. Select highest-scoring model (or pair for cross-validation)
6. Fallback: if primary unavailable, select next highest-scoring
```

### 5.2 Scoring Formula

```
Score = Σ(requirement_weight × model_capability_match)
where:
  requirement_weight = 0-5 (per mode)
  model_capability_match = 0.0-1.0 (per model per factor)
```

---

## 6. Cross-Validation Requirements

### 6.1 When Cross-Validation Is Required

| Mode | Cross-Validation | Secondary Model Family |
|------|-----------------|----------------------|
| ARCHITECTURE | Recommended (MAJOR changes) | Claude |
| FORENSICS (L2/L3) | Required | Qwen or GPT |
| REVIEW | Required | Different from author's model |
| VALIDATION (L3) | Required | Claude or GPT |
| All other modes | Optional | Any |

### 6.2 Cross-Validation Protocol

1. Primary model performs the task
2. Secondary model validates the output
3. If outputs agree: output is accepted
4. If outputs disagree: flagged for human review
5. Disagreement rate is recorded in session metrics
6. High disagreement rate (>20%) triggers prompt review

---

## 7. Model Availability and Fallback

### 7.1 Availability Rules

| If | Then |
|----|------|
| Primary model is unavailable | Use highest-scoring fallback model |
| Required model family is unavailable | Degrade gracefully — use best available, log warning |
| No model meets minimum requirements | Surface requirement gap to user |
| API rate limited | Queue task for retry with exponential backoff |

### 7.2 Model-Specific Constraints

| Model | Strengths | Weaknesses | Best For |
|-------|-----------|------------|----------|
| Qwen3.7 Max | Deep reasoning, architecture, long context | Higher cost | ARCHITECTURE, FORENSICS, GOVERNANCE |
| Qwen3.7 Plus | Good all-rounder, code capable | Not specialized | DISCOVERY, VALIDATION, IMPLEMENTATION |
| Kimi K2.7 Code | Code forensic, large context | Limited reasoning depth | DISCOVERY, FORENSICS (code-heavy) |
| GPT-4o | Structured output, planning, documentation | Medium code capability | PLANNING, DOCUMENTATION, RELEASE |
| Claude 3.5 Sonnet | Review, documentation, consistency | Slower | REVIEW, DOCUMENTATION, VALIDATION |

---

## 8. Model Testing Requirements

Every prompt must be tested against at least 2 models before approval:

| Test | Criteria |
|------|----------|
| Output structure compliance | Output matches specified schema ≥95% |
| Finding accuracy | ≥80% of findings confirmed by manual review |
| False positive rate | ≤20% false positive rate |
| Coverage completeness | Identifies ≥70% of seeded test issues |

Model test results are recorded in prompt metadata:

```yaml
tested_with:
  - model: qwen3-plus
    accuracy: 0.87
    false_positive_rate: 0.12
  - model: claude-3.5-sonnet
    accuracy: 0.91
    false_positive_rate: 0.08
```

---

**End of Model Routing**
