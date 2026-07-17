---
id: SVP-002
title: Software Verification Platform — Layer Architecture
type: PLATFORM-ARCHITECTURE
layer: 0
version: 1.0.0
status: DRAFT
author: [SVF Architect]
created: 2026-07-08
updated: 2026-07-08
depends_on: [SVP-001]
supersedes: null
engagement: null
assurance_level: L3
---

# Software Verification Platform (SVP) — Layer Architecture

## 1. Layer Model

SVP defines ten layers. Each layer is a horizontal slice of the platform with specific responsibilities, well-defined interfaces (the directory structure), and clear dependencies on layers below.

```
▲                     RELEASE MANAGEMENT
│                     ────────────────
│    Layer 10         Version │ Package │ Integrity │ Changelog
│
│                     REPORTING
│                     ──────────
│    Layer 9          Executive Summary │ Findings │ Closure
│
│                     ENGAGEMENT MANAGEMENT
│                     ───────────────────
│    Layer 8          Planning │ Evidence │ Analysis │ Lifecycle
│
│                     AUTOMATION
│                     ──────────
│    Layer 7          Hooks │ Schedulers │ Triggers │ Integrations
│
│    DEPENDENCY       VERIFICATION ENGINE
│    DIRECTION         ───────────────────
│         │           Layer 6  Discovery │ Collection │ Analysis
│         │                    │ Classification │ Reporting
│         ▼
│                     FRAMEWORK
│                     ──────────
│    Layer 5          Governance │ Standards │ Methodology
│                     │ Templates │ Taxonomies
│
│                     KNOWLEDGE
│                     ──────────
│    Layer 4          Architecture │ Engineering │ Security
│                     │ Decisions │ Patterns │ Lessons
│
│                     AI OPERATING SYSTEM
│                     ──────────────────
│    Layer 3          Agents │ Modes │ Routing │ State
│                     │ Prompts │ Sessions
│
│                     TOOLING
│                     ────────
│    Layer 2          Scripts │ Schemas │ Validation │ Generation
│
│                     INFRASTRUCTURE
│                     ──────────────
│    Layer 1          Git │ Filesystem │ Crypto │ Compute
└────────────────────────────────────────────────────────────
```

---

## 2. Layer Definitions

### Layer 1: Infrastructure

| Aspect | Description |
|--------|-------------|
| **Purpose** | Provide the foundation on which all other layers operate |
| **Responsibilities** | Version control (Git), file storage, cryptographic hashing (SHA-256), compute execution |
| **Inputs** | Operating system resources, Git repository |
| **Outputs** | Repository structure, file system operations, hash values |
| **Dependencies** | Operating system, Git installation |
| **Owned Directories** | Root configuration files (.gitignore, LICENSE, README) |
| **Key Decisions** | Git is the only required infrastructure. No database, no server, no cloud service. |

---

### Layer 2: Tooling

| Aspect | Description |
|--------|-------------|
| **Purpose** | Provide reusable automation and validation scripts |
| **Responsibilities** | Evidence hashing, integrity verification, registry generation, report assembly, schema validation, file generation |
| **Inputs** | File paths, configuration, framework schemas |
| **Outputs** | Execution results, validation reports, generated files |
| **Dependencies** | Layer 1 (Infrastructure) |
| **Owned Directories** | `tooling/scripts/`, `tooling/schemas/`, `tooling/automation/` |
| **Key Decisions** | Tooling is framework-agnostic. Scripts should work with or without SVF. All scripts are idempotent. |

---

### Layer 3: AI Operating System

| Aspect | Description |
|--------|-------------|
| **Purpose** | Provide the AI-native operating environment for human-AI collaboration |
| **Responsibilities** | Agent management, operating mode enforcement, model routing, state persistence, prompt library, session management |
| **Inputs** | Task instructions, state files, knowledge base, model responses |
| **Outputs** | Updated state, findings, evidence, decisions, knowledge |
| **Dependencies** | Layer 1 (Infrastructure), Layer 2 (Tooling) |
| **Owned Directories** | `.ai/agents/`, `.ai/modes/`, `.ai/routing/`, `.ai/state/`, `.ai/knowledge/`, `.ai/prompts/` |
| **Key Decisions** | AI OS must be vendor-neutral. No hardcoded model dependencies. State must survive session closure. |

*Detailed architecture: SVP-004-AI-Operating-System.md*

---

### Layer 4: Knowledge

| Aspect | Description |
|--------|-------------|
| **Purpose** | Capture, organize, and retrieve reusable knowledge |
| **Responsibilities** | Architecture decisions, engineering patterns, security research, business context, glossary management, lessons learned |
| **Inputs** | Engagement findings, architecture decisions, research, external references |
| **Outputs** | Structured knowledge artifacts, cross-referenced knowledge base, pattern catalogue |
| **Dependencies** | Layer 3 (AI OS — knowledge is often captured via AI assistance) |
| **Owned Directories** | `knowledge/architecture/`, `knowledge/engineering/`, `knowledge/security/`, `knowledge/decisions/`, `knowledge/patterns/`, `knowledge/lessons/`, `knowledge/glossary/`, `knowledge/reference/` |
| **Key Decisions** | Knowledge is additive — nothing is deleted, only superseded. Every knowledge artifact has metadata (source, date, author, confidence). |

*Detailed architecture: SVP-006-Knowledge-Architecture.md*

---

### Layer 5: Framework

| Aspect | Description |
|--------|-------------|
| **Purpose** | Host the Software Verification Framework — the reusable core |
| **Responsibilities** | Governance documents, verification standards, methodology procedures, document templates, classification taxonomies |
| **Inputs** | Knowledge base (for framework updates), governance decisions |
| **Outputs** | Framework documents, standards definitions, procedure specifications |
| **Dependencies** | Layers 1-4 (framework is informed by knowledge and enabled by AI OS) |
| **Owned Directories** | `framework/governance/`, `framework/standards/`, `framework/methodology/`, `framework/templates/`, `framework/taxonomies/`, `framework/META.md` |
| **Key Decisions** | Framework is versioned independently (SemVer). Framework changes require governance approval. Framework documents must never reference engagement-specific content. |

---

### Layer 6: Verification Engine

| Aspect | Description |
|--------|-------------|
| **Purpose** | Execute verification pipelines against engagement targets |
| **Responsibilities** | Discovery (component inventory), Collection (evidence gathering), Analysis (evidence against standards), Classification (finding creation), Reporting (report generation) |
| **Inputs** | Framework standards/methodology, engagement plan, project codebase |
| **Outputs** | Evidence items, analysis worksheets, findings, trace matrices, coverage reports |
| **Dependencies** | Layer 5 (Framework — what/how to verify), Layer 4 (Knowledge — domain context) |
| **Owned Directories** | `verification/pipelines/`, `verification/stages/`, `verification/scripts/` |
| **Key Decisions** | Verification engine is a conceptual workflow, not a software application. Stages can be executed manually, via AI, or through automation. |

---

### Layer 7: Automation

| Aspect | Description |
|--------|-------------|
| **Purpose** | Connect SVP to external systems and enable scheduled/triggered execution |
| **Responsibilities** | CI/CD hooks, scheduled verification, event triggers, external integrations (issue trackers, document stores) |
| **Inputs** | Git events, schedule configuration, external system events |
| **Outputs** | Triggered verification runs, integration payloads, notification events |
| **Dependencies** | Layer 6 (Verification Engine — what to automate) |
| **Owned Directories** | `tooling/automation/hooks/`, `tooling/automation/integrations/` |
| **Key Decisions** | Automation is optional — the platform must work fully without it. Hooks never modify evidence. |

---

### Layer 8: Engagement Management

| Aspect | Description |
|--------|-------------|
| **Purpose** | Manage the lifecycle of verification engagements |
| **Responsibilities** | Engagement planning, scope definition, evidence tracking, analysis coordination, findings management, engagement closure |
| **Inputs** | Engagement charter, framework standards, verification plan |
| **Outputs** | Evidence registries, analysis worksheets, findings registries, completed engagement artifacts |
| **Dependencies** | Layer 5 (Framework), Layer 6 (Verification Engine) |
| **Owned Directories** | `engagements/{pid}/` — each engagement owns its directory tree |
| **Key Decisions** | Engagements are self-contained. No engagement references another engagement's artifacts. Cross-engagement analysis is a separate activity. |

---

### Layer 9: Reporting

| Aspect | Description |
|--------|-------------|
| **Purpose** | Generate human-readable reports from structured findings |
| **Responsibilities** | Executive summaries, detailed findings reports, closure documents, coverage analysis |
| **Inputs** | Findings registry, evidence registry, analysis worksheets |
| **Outputs** | Report documents (Markdown, PDF via export), summary statistics |
| **Dependencies** | Layer 8 (Engagement Management — findings and evidence sources) |
| **Owned Directories** | `engagements/{pid}/reports/` |
| **Key Decisions** | Reports are generated from structured data, not written from scratch. Template-driven assembly. Reports must account for all findings. |

---

### Layer 10: Release Management

| Aspect | Description |
|--------|-------------|
| **Purpose** | Package, version, and distribute platform components |
| **Responsibilities** | Framework versioning, engagement release packaging, changelog management, integrity manifest generation, release signing |
| **Inputs** | Approved framework documents, completed engagement artifacts |
| **Outputs** | Release tags, changelogs, integrity manifests, release notes, sign-off records |
| **Dependencies** | All layers (release touches everything) |
| **Owned Directories** | `releases/`, `releases/changelogs/` |
| **Key Decisions** | Releases are immutable. Engagement releases are date-versioned. Framework releases use SemVer. |

---

## 3. Layer Interaction Matrix

| From \ To | Infra | Tooling | AI OS | Know | FW | Verif | Auto | Eng | Report | Release |
|-----------|-------|---------|-------|------|----|-------|------|-----|--------|---------|
| Infrastructure | — | Writes | Writes | — | — | — | Reads | — | — | — |
| Tooling | Reads | — | Writes | Writes | Writes | Writes | Reads | Writes | Writes | Writes |
| AI OS | Reads | Reads | — | Writes | Reads | Reads | — | Reads | — | — |
| Knowledge | — | Reads | Reads | — | Writes | Reads | — | Reads | — | — |
| Framework | — | — | Reads | Reads | — | Reads | — | Reads | — | Reads |
| Verification | — | Reads | Reads | Reads | Reads | — | Reads | Writes | — | — |
| Automation | — | Reads | — | — | — | Reads | — | — | — | — |
| Engagement | — | Reads | Reads | — | Reads | Reads | — | — | Reads | — |
| Reporting | — | — | — | — | — | Reads | — | Reads | — | — |
| Release | — | Reads | — | — | Reads | — | — | Reads | Reads | — |

Legend: Read = reads from directory, Write = writes to directory, — = no direct interaction

---

## 4. Layer Dependency Graph

```
Layer 10: Release Management
    │
    ├── Layer 9: Reporting
    │       │
    │       └── Layer 8: Engagement Management
    │               │
    │               ├── Layer 7: Automation
    │               │       │
    │               │       └── Layer 6: Verification Engine
    │               │               │
    │               │               ├── Layer 5: Framework
    │               │               │       │
    │               │               │       └── Layer 4: Knowledge
    │               │               │               │
    │               │               │               └── Layer 3: AI Operating System
    │               │               │                       │
    │               │               │                       └── Layer 2: Tooling
    │               │               │                               │
    │               │               │                               └── Layer 1: Infrastructure
    │               │               │
    │               │               └── Layer 4: Knowledge (via patterns/lessons)
    │               │
    │               └── Layer 5: Framework (via standards/methodology)
    │
    └── Layer 5: Framework (via release process)
```

## 5. Layer Compliance Rules

Every layer must adhere to:

| Rule | Description |
|------|-------------|
| L-001 | A layer may only depend on layers below it (numbered lower) |
| L-002 | A layer may only write to directories it owns |
| L-003 | A layer may read from any directory in layers below it |
| L-004 | No layer may hardcode a dependency on a specific AI model provider |
| L-005 | No layer may require external services (databases, APIs) to function |
| L-006 | Each layer must have a well-defined interface (documented file formats in known locations) |
| L-007 | Layer failures must not cascade — a failure in Layer N does not break Layer N-1 |

---

**End of Layer Architecture**
