---
id: SVP-003
title: Software Verification Platform — Repository Architecture
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

# Software Verification Platform (SVP) — Repository Architecture

## 1. Canonical Repository Layout

```
SVP-ROOT/
│
├── .ai/                          # AI Operating System (Layer 3)
│   ├── agents/                   # Agent definitions and configurations
│   ├── modes/                    # Operating mode specifications
│   ├── routing/                  # Model routing rules and configurations
│   ├── state/                    # Machine-readable state files
│   │   ├── project.yaml         # Project-level state
│   │   ├── framework.yaml       # Framework state
│   │   ├── engagement.yaml      # Current engagement state
│   │   ├── repository.yaml      # Repository health state
│   │   ├── next-task.yaml       # Current task queue
│   │   └── session.yaml         # Active session state
│   ├── knowledge/                # AI-accessible knowledge snippets
│   │   ├── architecture/        # Architecture summaries for AI context
│   │   ├── decisions/           # Key decisions in context window format
│   │   └── prompts/             # Context-optimized prompt fragments
│   ├── prompts/                  # Prompt library and configurations
│   │   ├── library/             # Atomic, reusable prompts
│   │   ├── chains/              # Multi-step prompt sequences
│   │   └── config/              # Project-specific prompt bindings
│   ├── sessions/                 # Session tracking and recovery
│   │   ├── active.md            # Current session log
│   │   ├── history/             # Completed session logs
│   │   └── recovery/            # Session recovery points
│   ├── config/                   # AI OS configuration
│   │   ├── agents.yaml          # Agent definitions
│   │   ├── modes.yaml           # Mode configurations
│   │   ├── routing.yaml         # Model routing table
│   │   └── providers/           # Model provider configurations
│   └── reports/                  # AI OS operational reports
│       ├── session-summary.md   # Session summary
│       └── metrics.yaml         # Usage and performance metrics
│
├── framework/                    # SVF Framework (Layer 5)
│   ├── governance/              # L0: Policies, roles, gates, ethics
│   ├── standards/               # L1: Domain verification standards
│   ├── taxonomies/              # L1: Classification systems
│   ├── methodology/             # L2: Procedures and decision trees
│   ├── templates/               # L2: Document templates
│   └── META.md                  # Framework self-description
│
├── knowledge/                    # Reusable Knowledge (Layer 4)
│   ├── architecture/            # System architecture documentation
│   ├── business/                # Business domain context
│   ├── engineering/             # Engineering practices and patterns
│   ├── security/                # Security research and advisories
│   ├── manufacturing/           # Release and deployment knowledge
│   ├── glossary/                # Domain terminology
│   ├── decisions/               # Architecture Decision Records
│   ├── patterns/                # Reusable solution patterns
│   ├── lessons/                 # Lessons learned from engagements
│   └── reference/               # External reference materials
│
├── verification/                 # Verification Engine (Layer 6)
│   ├── pipelines/               # Pipeline definitions
│   │   ├── standard.yaml       # Standard verification pipeline
│   │   ├── enhanced.yaml       # Enhanced (L2) pipeline
│   │   └── forensic.yaml       # Forensic (L3) pipeline
│   ├── stages/                   # Stage implementations
│   │   ├── discovery/           # Discovery stage tools
│   │   ├── collection/          # Collection stage tools
│   │   ├── analysis/            # Analysis stage tools
│   │   ├── classification/      # Classification stage tools
│   │   └── reporting/           # Reporting stage tools
│   └── scripts/                 # Verification engine scripts
│
├── tooling/                      # Tooling Layer (Layer 2)
│   ├── scripts/                 # Automation scripts
│   │   ├── hash.sh             # Evidence hashing
│   │   ├── verify-integrity.sh # Integrity verification
│   │   ├── generate-registry.sh# Registry generation
│   │   └── assemble-report.sh  # Report assembly
│   ├── schemas/                  # JSON schemas
│   │   ├── evidence-record.json # Evidence record schema
│   │   ├── finding-record.json  # Finding record schema
│   │   ├── state-file.json     # State file schema
│   │   └─ƒ manifest.json       # Integrity manifest schema
│   ├── automation/              # Automation integrations
│   │   ├── hooks/              # Git hooks
│   │   └── integrations/       # External system integrations
│   └── adapters/                # Tool adapters
│       ├── opencode.yaml        # OpenCode adapter config
│       ├── claude.yaml          # Claude Code adapter config
│       └── cursor.yaml          # Cursor adapter config
│
├── engagements/                  # Engagement Management (Layer 8)
│   └── {project-id}/            # One directory per engagement
│       ├── ENGAGEMENT.md        # Engagement charter
│       ├── planning/            # Scope, plan, checklist, schedule
│       ├── evidence/            # Raw and processed evidence
│       │   ├── raw/            # Untouched collected evidence
│       │   ├── processed/      # Analyzed/transformed evidence
│       │   └── EVIDENCE-REGISTRY.md
│       ├── analysis/            # Worksheets, trace matrices
│       │   └── worksheets/     # Individual analysis worksheets
│       ├── findings/            # Finding records and registry
│       │   └── FINDINGS-REGISTRY.md
│       └── reports/             # Draft and final reports
│
├── reports/                      # Cross-engagement Reports (Layer 9)
│   ├── executive/               # Executive summaries
│   ├── aggregate/               # Cross-engagement analysis
│   └── metrics/                 # Platform-wide metrics
│
├── releases/                     # Release Management (Layer 10)
│   ├── framework/               # Framework releases
│   ├── engagement/              # Engagement releases
│   ├── prompts/                 # Prompt library releases
│   └── changelogs/              # Release changelogs
│
├── docs/                         # Meta-documentation
│   ├── architecture/            # Platform architecture documents
│   └── guides/                  # User and operator guides
│
├── .svf/                         # Framework runtime metadata
│   ├── registry.json            # Master artifact registry
│   └── integrity/               # Hash manifests
│
├── CHANGELOG.md                  # Platform changelog
├── GOVERNANCE.md                 # Platform governance overview
├── LICENSE                       # Platform license
└── README.md                     # Platform README
```

---

## 2. Directory Purpose and Ownership

### 2.1 `.ai/` — AI Operating System

**Purpose:** Everything the AI agent needs to operate. State, routing, modes, prompts, session tracking.

**Why it exists:** AI tools need structured input (instructions, state, prompts) and produce structured output (findings, decisions, state updates). The `.ai/` directory is the contract between any AI tool and the platform.

**Ownership:** Layer 3 (AI Operating System)

**Key rule:** Everything in `.ai/` is machine-readable first, human-readable second. State is YAML/JSON. Prompts are Markdown with structured frontmatter.

### 2.2 `framework/` — SVF Framework

**Purpose:** The reusable, versioned Software Verification Framework.

**Why it exists:** The framework is the platform's reason for being. Without verification standards, governance, and methodology, the platform has no purpose. Framework documents are authoritative and change-controlled.

**Ownership:** Layer 5 (Framework)

**Key rule:** Framework files are APPROVED/PUBLISHED before use. Changes require governance approval. No engagement-specific content.

### 2.3 `knowledge/` — Reusable Knowledge

**Purpose:** Accumulated knowledge that persists across engagements and informs future work.

**Why it exists:** Knowledge is the platform's learning mechanism. Each engagement produces lessons learned, patterns identified, and decisions made. Without a knowledge directory, every engagement starts from zero.

**Ownership:** Layer 4 (Knowledge)

**Key rule:** Knowledge is additive. Nothing is deleted. Superseded items are marked ARCHIVED.

### 2.4 `verification/` — Verification Engine

**Purpose:** The verification pipeline definitions, stage implementations, and execution scripts.

**Why it exists:** Verification is the platform's core workflow. The engine defines how discovery, collection, analysis, classification, and reporting are sequenced and executed.

**Ownership:** Layer 6 (Verification Engine)

**Key rule:** Pipelines reference framework standards but do not duplicate them. Stage scripts are tool-agnostic.

### 2.5 `tooling/` — Tooling

**Purpose:** Reusable scripts, schemas, and automation that support platform operations.

**Why it exists:** Automation is essential for integrity verification (hashing), registry generation, and report assembly. Tooling makes the platform efficient and reliable.

**Ownership:** Layer 2 (Tooling)

**Key rule:** Scripts must be idempotent. Schemas must validate against their corresponding document types.

### 2.6 `engagements/` — Engagement Management

**Purpose:** Self-contained verification instances for specific projects.

**Why it exists:** Each engagement is a complete verification lifecycle. Separating engagements keeps project-specific evidence, findings, and reports isolated. No engagement can accidentally affect another.

**Ownership:** Layer 8 (Engagement Management)

**Key rule:** Engagements never reference each other. Cross-engagement analysis belongs in `reports/aggregate/`.

### 2.7 `reports/` — Cross-Engagement Reporting

**Purpose:** Platform-wide and cross-engagement reports.

**Why it exists:** While individual engagement reports live in `engagements/{pid}/reports/`, cross-cutting analysis (trends across engagements, platform metrics, executive summaries) needs its own space.

**Ownership:** Layer 9 (Reporting)

**Key rule:** Reports are derived data. Raw findings and evidence are never stored here.

### 2.8 `releases/` — Release Management

**Purpose:** Versioned release packages for framework, engagements, and prompts.

**Why it exists:** Release management ensures that framework versions are traceable, engagement artifacts are immutable, and changelogs are maintained.

**Ownership:** Layer 10 (Release Management)

**Key rule:** Releases are immutable. Once tagged, a release is never modified.

### 2.9 `docs/` — Platform Documentation

**Purpose:** Architecture documentation, user guides, and operator manuals.

**Why it exists:** The platform must be documented. Architecture decisions, guides, and references live here, separate from framework documents (which are verification content, not platform documentation).

**Ownership:** All layers (coordination by SVF Architect)

**Key rule:** Docs describe the platform, not verification work. Verification documentation is in the framework.

### 2.10 `.svf/` — Framework Runtime Metadata

**Purpose:** Machine-readable metadata for framework operations.

**Why it exists:** Automated processes need quick access to registries and integrity manifests without parsing Markdown files.

**Ownership:** Layer 5 (Framework)

**Key rule:** Hidden directory — not intended for direct human editing. Managed by tooling scripts.

---

## 3. File Naming Conventions

### 3.1 Framework Documents

Pattern: `SVF-{LAYER}-{SEQ}-{Name}.md`

Examples: `SVF-GOV-001-Charter.md`, `SVF-STD-002-Security.md`

### 3.2 AI OS Configuration Files

Pattern: `{component}.{format}` where format is `yaml`, `json`, or `md`

Examples: `routing.yaml`, `modes.yaml`, `agents.yaml`

### 3.3 State Files

Pattern: `{domain}.{format}`

Examples: `project.yaml`, `framework.yaml`, `engagement.yaml`

### 3.4 Knowledge Files

Pattern: `{category}/{date}-{name}.md`

Examples: `decisions/2026-07-08-adopt-svp-architecture.md`

### 3.5 Engagement Documents

Pattern: `ENG-{PID}-{PHASE}-{SEQ}-{Name}.md`

Examples: `ENG-MITRA3-PLAN-001-Scope.md`

### 3.6 Platform Documents

Pattern: `SVP-{SEQ}-{Name}.md`

Examples: `SVP-001-Platform-Architecture.md`

---

## 4. Repository Health Rules

| Rule | Description | Enforced By |
|------|-------------|-------------|
| R-001 | Every directory must have a README.md explaining its purpose | Manual review |
| R-002 | No engagement may reference another engagement's files | Code review |
| R-003 | Framework documents must not contain engagement-specific content | Code review |
| R-004 | State files must be valid YAML/JSON | CI validation |
| R-005 | All cross-references must resolve to existing files | CI validation |
| R-006 | Evidence files must be read-only after hashing | Git hooks |
| R-007 | Release tags must never be deleted or overwritten | Git policy |
| R-008 | `.ai/state/` files must be committed before session end | Agent workflow |

---

**End of Repository Architecture**
