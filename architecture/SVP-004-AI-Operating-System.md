---
id: SVP-004
title: Software Verification Platform — AI Operating System
type: PLATFORM-ARCHITECTURE
layer: 3
version: 1.0.0
status: DRAFT
author: [SVF Architect]
created: 2026-07-08
updated: 2026-07-08
depends_on: [SVP-001, SVP-002]
supersedes: null
engagement: null
assurance_level: L3
---

# Software Verification Platform (SVP) — AI Operating System

## 1. AI Operating System Overview

The AI Operating System (AI OS) is the layer that enables human-AI collaboration within the platform. It defines how AI agents operate, which modes they can enter, how tasks are routed to models, how state is preserved, and how prompts are managed.

The AI OS is vendor-neutral. It does not depend on any specific AI tool (OpenCode, Claude Code, ChatGPT, etc.). Instead, it defines file-based contracts that any AI tool can fulfill.

```
┌──────────────────────────────────────────────────────────────────┐
│                        AI OPERATING SYSTEM                       │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ AGENTS   │  │  MODES   │  │ ROUTING  │  │      STATE       │ │
│  │          │  │          │  │          │  │                  │ │
│  │ Who can  │  │ What can │  │ Which AI │  │ What is          │ │
│  │ do what  │  │ be done  │  │ model?   │  │ the current      │ │
│  │          │  │          │  │          │  │ state?           │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────────┐  │
│  │ PROMPTS  │  │ SESSIONS │  │          REPORTS             │  │
│  │          │  │          │  │                              │  │
│  │ How to   │  │ What     │  │ What happened during         │  │
│  │ instruct │  │ happened │  │ this session?                │  │
│  │ the AI   │  │ before?  │  │                              │  │
│  └──────────┘  └──────────┘  └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Agents

Agents are the entities that perform work within the AI OS. An agent is a combination of:
- A **role** (what it is responsible for)
- A **mode** (what it is allowed to do)
- A **model binding** (which AI model(s) it can use)

### 2.1 Agent Definitions

| Agent | Role | Default Mode | Model Preference |
|-------|------|-------------|------------------|
| **Architect** | Designs platform and framework | ARCHITECTURE | High-reasoning model (e.g., Qwen3.7 Max) |
| **Verifier** | Executes verification tasks | DISCOVERY or FORENSICS | Code-capable model (e.g., Kimi K2.7) |
| **Reviewer** | Validates findings and decisions | REVIEW | Different model family from Verifier |
| **Engineer** | Implements changes | IMPLEMENTATION | Code-capable model |
| **Planner** | Plans engagements and tasks | PLANNING | High-reasoning model |
| **Governor** | Governs framework changes | GOVERNANCE | High-reasoning model |
| **Release Manager** | Packages releases | RELEASE | Any capable model |

### 2.2 Agent Definition Format

```yaml
# .ai/config/agents.yaml
agents:
  - id: architect
    name: SVF Architect
    description: Designs and maintains the platform and framework
    default_mode: ARCHITECTURE
    allowed_modes: [ARCHITECTURE, PLANNING, GOVERNANCE, REVIEW]
    model_preference: high-reasoning
    state_files: [project.yaml, framework.yaml, repository.yaml]
  - id: verifier
    name: Verifier
    description: Executes verification tasks
    default_mode: DISCOVERY
    allowed_modes: [DISCOVERY, FORENSICS, VALIDATION, REVIEW]
    model_preference: code-capable
    state_files: [engagement.yaml, next-task.yaml, session.yaml]
```

### 2.3 Agent Constraints

- An agent may only operate in modes listed in `allowed_modes`
- An agent may only modify state files listed in `state_files`
- An agent may only use models that match its `model_preference`
- Agent definitions are created by the SVF Architect (GOVERNANCE mode)

---

## 3. Operating Modes

Modes define what can be done. Each mode is a behavioral contract — it specifies what actions are allowed, what actions are forbidden, what quality gates must be met, and when the mode should stop.

### 3.1 Mode: DISCOVERY

| Aspect | Definition |
|--------|-----------|
| **Mission** | Inventory and explore a codebase or system to understand its structure, dependencies, and surface area |
| **Allowed Actions** | List files, read files, analyze directory structure, identify components, map dependencies, document architecture, identify entry points, flag areas of interest |
| **Forbidden Actions** | Modify files, make assumptions without evidence, draw conclusions without verification, classify findings as verified |
| **Required Evidence** | File tree listing, component inventory, dependency graph (text), surface area map, areas of interest list |
| **Outputs** | Discovery report in `verification/stages/discovery/`, updated engagement plan |
| **Quality Gates** | All components identified, dependencies mapped, no unexamined areas larger than threshold (configurable) |
| **Stop Conditions** | 100% of target scope examined, or all areas of interest flagged, or time budget exhausted |

### 3.2 Mode: FORENSICS

| Aspect | Definition |
|--------|-----------|
| **Mission** | Examine evidence in detail and produce verified findings |
| **Allowed Actions** | Read evidence, analyze against standards, produce worksheets, draft findings, update finding records |
| **Forbidden Actions** | Modify evidence, modify framework documents, skip standards reference, close findings without evidence |
| **Required Evidence** | Analysis worksheets per domain, evidence references with hash verification, standards references with clause numbers |
| **Outputs** | Evidence items, analysis worksheets, finding records, traceability matrix |
| **Quality Gates** | Every finding references at least one evidence item and one standard clause. Coverage meets threshold for assurance level. |
| **Stop Conditions** | All evidence analyzed, all findings documented, coverage threshold met, or evidence exhausted |

### 3.3 Mode: ARCHITECTURE

| Aspect | Definition |
|--------|-----------|
| **Mission** | Design or modify platform or framework architecture |
| **Allowed Actions** | Read existing architecture, propose changes, create architecture documents, update architecture decisions, create/update SVP documents |
| **Forbidden Actions** | Modify implementation without architecture change, violate layer dependencies, introduce vendor-specific constraints |
| **Required Evidence** | Current architecture state, requirements, constraints, alternatives considered, rationale |
| **Outputs** | Architecture documents, decision records, updated dependency models, layer definitions |
| **Quality Gates** | Every decision includes rationale. No circular dependencies. All cross-references resolve. |
| **Stop Conditions** | Architecture documented, decisions recorded, impact analysis complete |

### 3.4 Mode: VALIDATION

| Aspect | Definition |
|--------|-----------|
| **Mission** | Verify that work products meet quality standards |
| **Allowed Actions** | Read work products, compare against standards, check cross-references, verify frontmatter, check completeness, identify gaps |
| **Forbidden Actions** | Modify work products, skip standards, make subjective judgments without criteria |
| **Required Evidence** | Validation checklist, standard references, gap analysis |
| **Outputs** | Validation report, quality score, remediation recommendations |
| **Quality Gates** | All criteria checked and documented. Failed items have clear remediation. |
| **Stop Conditions** | All validation criteria evaluated, or blocking deficiency identified |

### 3.5 Mode: IMPLEMENTATION

| Aspect | Definition |
|--------|-----------|
| **Mission** | Create or modify files according to approved architecture or plans |
| **Allowed Actions** | Write new files, edit existing files, rename files, create directories, update state files within scope |
| **Forbidden Actions** | Modify architecture without approval, modify evidence, operate without a plan, skip review |
| **Required Evidence** | Implementation plan, architecture reference, change scope |
| **Outputs** | Created/modified files, updated state, implementation report |
| **Quality Gates** | All changes traceable to approved plan. Files follow naming conventions. Frontmatter complete. |
| **Stop Conditions** | All planned changes implemented, or blocking issue identified |

### 3.6 Mode: REVIEW

| Aspect | Definition |
|--------|-----------|
| **Mission** | Review work products for correctness, completeness, and quality |
| **Allowed Actions** | Read work products, comment on findings, suggest improvements, approve or reject, update document status |
| **Forbidden Actions** | Modify work products directly, change status without review, skip criteria |
| **Required Evidence** | Work products under review, review criteria, checklist |
| **Outputs** | Review comments, status changes, approval/rejection record |
| **Quality Gates** | All review criteria evaluated. Reviewer independent from author. |
| **Stop Conditions** | All items reviewed, or blocking issue identified |

### 3.7 Mode: PLANNING

| Aspect | Definition |
|--------|-----------|
| **Mission** | Plan tasks, engagements, milestones, and resource allocation |
| **Allowed Actions** | Read state, read framework, define tasks, sequence work, estimate effort, identify dependencies |
| **Forbidden Actions** | Skip dependency analysis, plan without framework reference, commit resources without authority |
| **Required Evidence** | Current state, framework dependencies, task definitions, dependency graph |
| **Outputs** | Task plans, schedules, milestone definitions, dependency analysis |
| **Quality Gates** | All dependencies identified. Tasks are atomic and verifiable. Estimates include confidence range. |
| **Stop Conditions** | Plan covers defined scope, dependencies mapped, tasks sequenced |

### 3.8 Mode: GOVERNANCE

| Aspect | Definition |
|--------|-----------|
| **Mission** | Govern the platform and framework — approve changes, resolve conflicts, set policy |
| **Allowed Actions** | Read all documents, approve/reject changes, modify governance documents, resolve disputes, set policy, establish standards |
| **Forbidden Actions** | Bypass own governance rules, approve own work, modify evidence |
| **Required Evidence** | Change requests, impact analysis, stakeholder input, policy references |
| **Outputs** | Approved changes, policy documents, conflict resolutions, governance records |
| **Quality Gates** | Separation of duties enforced. All decisions recorded with rationale. Governance changes versioned. |
| **Stop Conditions** | Decision made, documented, and communicated |

### 3.9 Mode: RELEASE

| Aspect | Definition |
|--------|-----------|
| **Mission** | Package, version, and publish platform/framework releases |
| **Allowed Actions** | Create release tags, generate changelogs, build integrity manifests, assemble release bundles, update release metadata |
| **Forbidden Actions** | Release without approval, include unapproved changes, skip integrity verification, modify released artifacts |
| **Required Evidence** | Approval records, change log, integrity hashes, release checklist |
| **Outputs** | Release tags, changelogs, integrity manifests, release bundles, sign-off records |
| **Quality Gates** | All required approvals obtained. All artifacts hashed. Release candidate reviewed (48h). |
| **Stop Conditions** | Release complete, tagged, and published. Or gate failure identified. |

---

## 4. Model Routing

Model routing determines which AI model should be used for which task. Routing is based on task requirements, not agent preference.

### 4.1 Routing Criteria

| Criterion | Values |
|-----------|--------|
| Reasoning depth | Low / Medium / High |
| Code capability | None / Read / Write / Full |
| Context window | Small (8K) / Medium (32K) / Large (100K+) / Huge (200K+) |
| Cost sensitivity | Low / Medium / High |
| Output structure | Freeform / Structured / Schema-validated |
| Multi-model requirement | Single / Cross-validation / Ensemble |

### 4.2 Mode-to-Model Mapping

| Mode | Reasoning | Code | Context | Cost | Multi-Model |
|------|-----------|------|---------|------|-------------|
| ARCHITECTURE | High | Read | Large | Medium | Optional |
| PLANNING | High | None | Medium | Low | No |
| DISCOVERY | Medium | Read | Large | Low | No |
| FORENSICS | High | Full | Large | Medium | Recommended |
| IMPLEMENTATION | Medium | Write | Large | Low | No |
| VALIDATION | High | Read | Medium | Low | Recommended |
| REVIEW | High | Read | Medium | Low | Required |
| GOVERNANCE | High | None | Small | Low | No |
| RELEASE | Low | Read | Small | Low | No |

### 4.3 Routing Configuration Format

```yaml
# .ai/config/routing.yaml
routing:
  - mode: ARCHITECTURE
    requirements:
      reasoning_depth: high
      code_capability: read
      context_window: large
    preferred_models:
      - family: qwen
        variant: max
      - family: claude
        variant: sonnet
  - mode: FORENSICS
    requirements:
      reasoning_depth: high
      code_capability: full
      context_window: large
    preferred_models:
      - family: kimi
        variant: k2.7
    multi_model:
      required: recommended
      secondary_family: qwen
```

*Detailed routing architecture: SVP-008-Model-Routing.md*

---

## 5. State Architecture

The AI OS maintains dual state — human-readable and machine-readable.

### 5.1 State Files

| File | Format | Purpose |
|------|--------|---------|
| `project.yaml` | YAML | Top-level project state: name, version, phases, status |
| `framework.yaml` | YAML | Framework state: component status, versions, document registry |
| `engagement.yaml` | YAML | Current engagement state: scope, phase, gates, findings count |
| `repository.yaml` | YAML | Repository health: directory structure, file counts, integrity status |
| `next-task.yaml` | YAML | Task queue: current task, next tasks, dependencies |
| `session.yaml` | YAML | Active session: mode, agent, model, start time, files touched |

### 5.2 State Synchronization

```
Session Start
    │
    ▼
Read all state files ──────────────────────────────────────────┐
    │                                                            │
    ▼                                                            │
Execute task                                                     │
    │                                                            │
    ▼                                                            │
Update state files in .ai/state/                                 │
    │                                                            │
    ▼                                                            │
Commit state files to repository ◄──────────────────────────────┘
    │
    ▼
Session End
```

**Synchronization rules:**
1. At session start, an agent reads ALL state files
2. During the session, the agent updates state files in memory and writes changes to disk
3. At the end of the session, state files are committed to the repository
4. If a session crashes, the next session reads the last committed state — no data loss
5. State files are the single source of truth. Never derive state from conversation history.

*Detailed state architecture: SVP-005-State-Architecture.md*

---

## 6. Prompt Architecture

### 6.1 Prompt Library

Prompts are engineered artifacts with versioning, testing, and metadata.

| Component | Location | Format |
|-----------|----------|--------|
| Atomic prompts | `.ai/prompts/library/` | Markdown + YAML frontmatter |
| Prompt chains | `.ai/prompts/chains/` | YAML sequence definitions |
| Prompt configs | `.ai/prompts/config/` | YAML variable bindings |

### 6.2 Prompt Document Structure

```yaml
---
id: PMT-STATIC-001
title: Code Structure Analysis
version: 1.0.0
domain: STATIC
category: ANAL
granularity: atomic
input_type: [file_tree, source_code]
output_type: [structured_analysis]
depends_on: []
tested_with: [gpt-4, claude-3.5, qwen-3]
confidence: 0.85
---
```

### 6.3 Prompt Governance

- Prompts are versioned with SemVer
- Prompts must be tested against ≥2 models before approval
- Prompt changes that alter output structure require MAJOR version bump
- Deprecated prompts are archived, not deleted

---

## 7. Session Management

### 7.1 Session Lifecycle

```
START → ACTIVE → COMPLETING → COMPLETED
                   │
                   ▼
               CRASHED → RECOVERING → ACTIVE
```

### 7.2 Session File Structure

```yaml
# .ai/sessions/active.md
session_id: ses_abc123
agent: verifier
mode: DISCOVERY
model: kimi-k2.7
started_at: 2026-07-08T10:00:00Z
state_files_read:
  - .ai/state/project.yaml
  - .ai/state/engagement.yaml
  - .ai/state/next-task.yaml
files_created:
  - verification/stages/discovery/mitra3-inventory.md
  - engagements/mitra3/evidence/raw/file-tree.txt
state_updates:
  - .ai/state/engagement.yaml: updated evidence_count
```

### 7.3 Crash Recovery

If a session ends abnormally:
1. The next session reads `session.yaml` to detect the last active session
2. If `status` is not `COMPLETED`, the session is marked `CRASHED`
3. The new session reads all state files (the last committed state)
4. Files that were created but not committed are identified by comparing file timestamps
5. The agent picks up from the last committed state

---

## 8. Tool Adapters

Tool adapters bridge between the platform's file-based contracts and specific AI tools.

### 8.1 Adapter Responsibilities

| Tool | Adapter File | Key Adaptation |
|------|-------------|----------------|
| OpenCode | `tooling/adapters/opencode.yaml` | Maps SVP state files to OpenCode context files |
| Claude Code | `tooling/adapters/claude.yaml` | Maps SVP prompts to Claude Code format |
| Cursor | `tooling/adapters/cursor.yaml` | Maps SVP rules to Cursor rules format |
| ChatGPT | `tooling/adapters/chatgpt.yaml` | Maps SVP sessions to ChatGPT conversation format |
| Continue | `tooling/adapters/continue.yaml` | Maps SVP config to Continue dev config |

### 8.2 Adapter Design Principle

Adapters are thin translation layers. The platform never changes to accommodate a tool — the adapter translates platform contracts to tool expectations.

---

**End of AI Operating System Architecture**
