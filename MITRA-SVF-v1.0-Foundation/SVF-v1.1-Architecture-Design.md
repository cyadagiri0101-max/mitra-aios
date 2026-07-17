# Software Verification Framework (SVF) v1.1
## Complete Architecture Design Document

**Version:** 1.1.0  
**Status:** DESIGN  
**Date:** 2026-07-08  
**Author:** SVF Lead Architect  
**Classification:** Enterprise Framework Architecture  

---

## 1. Vision

The Software Verification Framework (SVF) is an enterprise-grade, reusable verification infrastructure that enables systematic, evidence-based assessment of any software system.

SVF transforms software verification from an ad-hoc activity into a repeatable engineering discipline. It provides the structural foundation—the taxonomy, the methodology, the evidence chain, the reporting pipeline, and the governance model—that allows verification teams to produce audit-grade results with full traceability and reproducibility.

SVF is not a tool. It is not a checklist. It is the **operating system for verification work**.

Just as CI/CD pipelines standardized software delivery, SVF standardizes software verification. It defines the contracts between evidence collection, analysis, findings, and reporting so that verification outputs are consistent, comparable, and defensible regardless of who performs them or which project they target.

### Vision Statement

> Every software system can be verified to a known standard, with evidence that is traceable, analysis that is reproducible, and conclusions that are defensible.

---

## 2. Goals

### Primary Goals

| ID | Goal | Description |
|----|------|-------------|
| G1 | **Reproducibility** | Any verifier, given the same evidence and methodology, must reach the same conclusions |
| G2 | **Traceability** | Every finding traces back through analysis to evidence to a specific standard clause |
| G3 | **Reusability** | The framework applies to any software project without structural modification |
| G4 | **Evidence Integrity** | All evidence is cryptographically hashed and tamper-evident |
| G5 | **Automation-Ready** | Every verification step can be automated or AI-assisted |
| G6 | **Audit-Grade Output** | Reports meet the standards expected by internal audit, external audit, and regulatory bodies |

### Secondary Goals

| ID | Goal | Description |
|----|------|-------------|
| G7 | **Multi-Model AI Support** | Prompts work across GPT-4, Claude, Gemini, Qwen, and open-source models |
| G8 | **Incremental Adoption** | Organizations can adopt SVF one domain at a time |
| G9 | **Version Compatibility** | Framework versions are backward-compatible within a major version |
| G10 | **Minimal Ceremony** | The framework adds structure without adding bureaucracy |

### Non-Goals

- SVF does not replace testing frameworks (Jest, Pytest, etc.)
- SVF does not replace CI/CD pipelines
- SVF does not perform runtime monitoring
- SVF does not generate application code
- SVF does not make remediation decisions (it identifies, not prescribes)

---

## 3. Guiding Principles

### P1: Evidence Before Opinion

No finding, conclusion, or recommendation may exist without supporting evidence. Assertions without evidence are classified as observations, not findings.

### P2: Static Analysis First

Verification begins with what can be determined without execution. Static analysis of code, configuration, schemas, and dependencies forms the foundation. Dynamic analysis extends, not replaces, static findings.

### P3: Separation of Concerns

The framework separates:
- **What** is verified (Standards)
- **How** it is verified (Methodology)
- **What was found** (Evidence & Analysis)
- **What it means** (Findings & Reports)

These layers are independently versioned and maintained.

### P4: Structured Over Freeform

Prefer structured data (JSON schemas, taxonomies, registries) over freeform text. Structure enables automation, comparison, and aggregation.

### P5: Machine-Readable Metadata

Every artifact carries machine-readable metadata (YAML frontmatter, JSON manifests). Human-readable content is embedded within structured containers.

### P6: Incremental Rigor

Not every engagement requires full rigor. The framework defines three assurance levels:

| Level | Name | Use Case |
|-------|------|----------|
| L1 | Standard | Internal projects, routine reviews |
| L2 | Enhanced | Customer-facing systems, compliance-sensitive |
| L3 | Forensic | Security incidents, regulatory investigations, litigation support |

Each level adds evidence requirements, review gates, and chain-of-custody obligations.

### P7: Prompt Engineering as Engineering

AI prompts are engineered artifacts with versioning, testing requirements, and deprecation policies. They are not disposable instructions.

### P8: Transparency of Method

The methodology is open within the organization. Anyone can inspect how a finding was produced, what evidence supported it, and which procedure was followed.

### P9: Fail-Safe Defaults

When evidence is ambiguous, the framework defaults to the more conservative classification. Uncertainty is explicitly recorded, not hidden.

### P10: Continuous Improvement

Every engagement produces lessons learned that feed back into framework standards, methodology, and prompts.

---

## 4. Framework Architecture

### 4.1 Architectural Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  Reports │ Executive Summaries │ Dashboards │ Sign-offs     │
├─────────────────────────────────────────────────────────────┤
│                    FINDINGS LAYER                            │
│  Finding Records │ Findings Registry │ Severity/Confidence  │
├─────────────────────────────────────────────────────────────┤
│                    ANALYSIS LAYER                            │
│  Worksheets │ Trace Matrices │ Coverage Analysis            │
├─────────────────────────────────────────────────────────────┤
│                    EVIDENCE LAYER                            │
│  Raw Evidence │ Processed Evidence │ Evidence Registry       │
│  Hash Manifests │ Chain of Custody                          │
├─────────────────────────────────────────────────────────────┤
│                    COLLECTION LAYER                          │
│  Scripts │ Prompts │ Manual Procedures │ Tool Integrations  │
├─────────────────────────────────────────────────────────────┤
│                    METHODOLOGY LAYER                         │
│  Procedures │ Checklists │ Decision Trees                   │
├─────────────────────────────────────────────────────────────┤
│                    STANDARDS LAYER                           │
│  Domain Standards │ Taxonomies │ Classification Scales      │
├─────────────────────────────────────────────────────────────┤
│                    GOVERNANCE LAYER                          │
│  Policies │ Roles │ Gates │ Ethics │ Versioning             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Architectural Components

| Component | Responsibility | Artifacts Produced |
|-----------|---------------|-------------------|
| **Governance Engine** | Defines rules, roles, gates | Policies, approval records |
| **Standards Registry** | Defines verification criteria | Domain standards, taxonomies |
| **Methodology Engine** | Defines verification procedures | Procedures, checklists, decision trees |
| **Evidence Manager** | Collects, hashes, stores evidence | Evidence items, manifests, registries |
| **Analysis Engine** | Processes evidence against standards | Worksheets, trace matrices |
| **Findings Manager** | Records, classifies, tracks findings | Finding records, registries |
| **Report Generator** | Assembles findings into reports | Executive summaries, final reports |
| **Prompt Library** | Provides AI-assisted verification | Atomic prompts, chains, configs |
| **Integrity Monitor** | Verifies evidence hasn't changed | Hash manifests, validation logs |
| **Release Manager** | Packages and publishes engagements | Release bundles, changelogs |

### 4.3 Data Flow

```
Standards ──▶ Methodology ──▶ Collection ──▶ Evidence ──▶ Analysis ──▶ Findings ──▶ Reports
    │              │               │             │            │            │            │
    └──────────────┴───────────────┴─────────────┴────────────┴────────────┴────────────┘
                                        │
                                  Governance Layer
                              (policies apply to all layers)
```

### 4.4 Integration Points

| Integration | Direction | Protocol |
|-------------|-----------|----------|
| Git Repository | Bidirectional | Git commands, hooks |
| AI Models | Request/Response | Prompt → Structured Output |
| CI/CD Pipeline | Inbound | Webhook, artifact import |
| Issue Tracker | Outbound | Finding → Issue creation |
| Document Store | Outbound | Report publication |

---

## 5. Repository Layout

### 5.1 Top-Level Structure

```
MITRA-SVF/
│
├── framework/                      # Project-agnostic framework definition
│   ├── governance/                 # L0: Policies, roles, gates
│   ├── standards/                  # L1: Domain verification standards
│   ├── methodology/                # L2: Procedures and decision trees
│   ├── templates/                  # L2: Document templates
│   ├── taxonomies/                 # L1: Classification systems
│   └── META.md                     # Framework self-description
│
├── engagements/                    # Project-specific verification instances
│   └── {project-id}/
│       ├── ENGAGEMENT.md           # Charter and scope
│       ├── planning/               # Scope, plan, checklist, schedule
│       ├── evidence/               # Raw and processed evidence
│       │   ├── raw/
│       │   ├── processed/
│       │   └── EVIDENCE-REGISTRY.md
│       ├── analysis/               # Worksheets, trace matrices
│       │   └── worksheets/
│       ├── findings/               # Finding records and registry
│       │   └── FINDINGS-REGISTRY.md
│       └── reports/                # Draft and final reports
│
├── prompts/                        # AI verification prompts
│   ├── library/                    # Atomic prompts
│   ├── chains/                     # Multi-step sequences
│   └── configurations/             # Project-specific bindings
│
├── tooling/                        # Automation and support
│   ├── scripts/                    # Evidence collection, hashing
│   ├── schemas/                    # JSON schemas for artifacts
│   └── automation/                 # CI/CD, report assembly
│
├── releases/                       # Release packages
│   └── changelogs/
│
├── docs/                           # Meta-documentation
│   ├── architecture/               # This document
│   └── guides/                     # Operator guides
│
├── .svf/                           # Runtime metadata (hidden)
│   ├── registry.json               # Master artifact registry
│   └── integrity/                  # Hash manifests per engagement
│
├── CHANGELOG.md
├── GOVERNANCE.md
├── LICENSE
└── README.md
```

### 5.2 Design Rationale

| Decision | Rationale |
|----------|-----------|
| `framework/` separate from `engagements/` | Framework changes rarely; engagements change per project. Independent versioning. |
| `prompts/` as first-class directory | AI-assisted verification is core, not auxiliary |
| `.svf/` hidden directory | Machine-readable metadata shouldn't clutter the human view |
| `tooling/` separate from `scripts/` in engagements | Framework tooling is reusable; engagement scripts are project-specific |
| Flat `engagements/` (no nesting) | Each engagement is independent; cross-engagement analysis is a separate activity |

### 5.3 File Placement Rules

| Artifact Type | Location |
|---------------|----------|
| Framework policy | `framework/governance/` |
| Domain standard | `framework/standards/` |
| Verification procedure | `framework/methodology/` |
| Document template | `framework/templates/` |
| Classification taxonomy | `framework/taxonomies/` |
| Engagement charter | `engagements/{pid}/ENGAGEMENT.md` |
| Raw evidence | `engagements/{pid}/evidence/raw/` |
| Analysis worksheet | `engagements/{pid}/analysis/worksheets/` |
| Finding record | `engagements/{pid}/findings/` |
| Final report | `engagements/{pid}/reports/` |
| Atomic prompt | `prompts/library/` |
| Prompt chain | `prompts/chains/` |
| Project prompt config | `prompts/configurations/{pid}/` |
| Automation script | `tooling/scripts/` or `tooling/automation/` |
| JSON schema | `tooling/schemas/` |

---

## 6. Documentation Taxonomy

### 6.1 Layer Model

Documents are classified into five layers based on their role in the verification chain:

| Layer | Name | Purpose | Scope | Change Frequency |
|-------|------|---------|-------|-----------------|
| L0 | Governance | Why we verify | Organization-wide | Rarely (annual) |
| L1 | Standards | What we verify | Domain-specific | Per framework release |
| L2 | Methodology | How we verify | Procedure-specific | Per framework release |
| L3 | Evidence & Analysis | What we found | Engagement-specific | Per engagement |
| L4 | Reports | What it means | Engagement-specific | Per engagement |

### 6.2 Document Types

#### L0 — Governance Documents

| Type ID | Name | Purpose |
|---------|------|---------|
| GOV-CHAR | Governance Charter | Establishes the framework's authority and scope |
| GOV-ROLE | Roles & Responsibilities | Defines who can do what |
| GOV-GATE | Approval Gates | Defines mandatory review checkpoints |
| GOV-ETHI | Ethics & Independence | Defines conflict-of-interest and independence rules |
| GOV-POLI | Policy | Specific governance policy (e.g., data handling) |

#### L1 — Standards

| Type ID | Name | Purpose |
|---------|------|---------|
| STD-CODE | Code Quality Standard | Criteria for source code verification |
| STD-SEC | Security Standard | Criteria for security verification |
| STD-DATA | Data Integrity Standard | Criteria for database and data verification |
| STD-API | API Contract Standard | Criteria for API verification |
| STD-INFRA | Infrastructure Standard | Criteria for deployment and infrastructure verification |
| STD-AI | AI Component Standard | Criteria for AI/ML component verification |
| STD-ARCH | Architecture Standard | Criteria for architectural verification |
| STD-DEP | Dependency Standard | Criteria for dependency validation |

#### L1 — Taxonomies

| Type ID | Name | Purpose |
|---------|------|---------|
| TAX-SEV | Severity Scale | Classifies finding impact |
| TAX-CONF | Confidence Scale | Classifies finding certainty |
| TAX-TYPE | Finding Types | Categorizes finding nature |
| TAX-EVDT | Evidence Types | Categorizes evidence nature |
| TAX-DOM | Verification Domains | Defines verification scope areas |

#### L2 — Methodology

| Type ID | Name | Purpose |
|---------|------|---------|
| METH-OV | Methodology Overview | Describes the verification approach |
| METH-SA | Static Analysis Procedure | How to perform static analysis |
| METH-DA | Dynamic Analysis Procedure | How to perform dynamic analysis |
| METH-EC | Evidence Collection Procedure | How to collect and validate evidence |
| METH-RPT | Reporting Procedure | How to assemble findings into reports |
| METH-AI | AI-Assisted Verification Procedure | How to use prompts in verification |

#### L2 — Templates

| Type ID | Name | Purpose |
|---------|------|---------|
| TMPL-ENG | Engagement Charter Template | Structure for engagement initiation |
| TMPL-PLAN | Verification Plan Template | Structure for engagement planning |
| TMPL-EVD | Evidence Record Template | Structure for evidence documentation |
| TMPL-FND | Finding Record Template | Structure for finding documentation |
| TMPL-WS | Analysis Worksheet Template | Structure for analysis documentation |
| TMPL-EXEC | Executive Summary Template | Structure for executive reporting |
| TMPL-RPT | Final Report Template | Structure for final reporting |
| TMPL-CLS | Closure Document Template | Structure for engagement closure |

#### L3 — Evidence & Analysis

| Type ID | Name | Purpose |
|---------|------|---------|
| EVD | Evidence Item | A collected artifact with metadata |
| EVD-REG | Evidence Registry | Index of all evidence for an engagement |
| ANL-WS | Analysis Worksheet | Structured analysis of evidence against standards |
| ANL-TRACE | Traceability Matrix | Maps findings to evidence to standards |
| ANL-COV | Coverage Analysis | Measures verification completeness |

#### L4 — Reports

| Type ID | Name | Purpose |
|---------|------|---------|
| FND | Finding Record | A single verified observation |
| FND-REG | Findings Registry | Index of all findings for an engagement |
| RPT-EXEC | Executive Summary | High-level findings for leadership |
| RPT-FINAL | Final Verification Report | Complete findings with evidence |
| RPT-CLS | Closure Document | Engagement completion record |

### 6.3 Cross-Reference Rules

| Source Layer | Must Reference |
|-------------|---------------|
| L3 Evidence | L1 Standard (specific clause), L2 Procedure used |
| L3 Analysis | L3 Evidence (at least one), L1 Standard |
| L4 Finding | L3 Evidence (at least one), L3 Analysis (at least one), L1 Standard |
| L4 Report | L4 Findings Registry (all findings accounted for) |

### 6.4 Document Frontmatter Schema

Every SVF document carries YAML frontmatter:

```yaml
---
id: string              # Unique identifier (e.g., SVF-STD-002)
title: string           # Human-readable title
type: string            # Document type ID (e.g., STD-SEC)
layer: integer          # 0-4
version: string         # SemVer (framework) or date-based (engagement)
status: string          # DRAFT | REVIEW | APPROVED | PUBLISHED | ARCHIVED
author: string[]        # One or more authors
reviewer: string[]      # One or more reviewers
approver: string[]      # One or more approvers
created: date           # ISO 8601
updated: date           # ISO 8601
depends_on: string[]    # IDs of prerequisite documents
supersedes: string|null # ID of document this replaces
engagement: string|null # Engagement ID (null for framework docs)
assurance_level: string # L1 | L2 | L3
---
```

---

## 7. Prompt Taxonomy

### 7.1 Prompt Classification

Prompts are classified by their role in the verification pipeline:

| Category | Code | Purpose |
|----------|------|---------|
| Discovery | `DISC` | Identify and inventory components, files, patterns |
| Analysis | `ANAL` | Examine code, configs, schemas for issues |
| Validation | `VALD` | Confirm whether something meets a standard |
| Comparison | `COMP` | Compare two artifacts (e.g., spec vs. implementation) |
| Synthesis | `SYNT` | Combine multiple inputs into a structured output |
| Reporting | `RPT` | Generate human-readable summaries from structured data |

### 7.2 Prompt Domains

| Domain | Code | Verification Area |
|--------|------|-------------------|
| Static Code | `STATIC` | Code structure, patterns, quality |
| Security | `SEC` | Vulnerabilities, auth, secrets, OWASP |
| Data | `DATA` | Schemas, migrations, integrity |
| API | `API` | Contracts, endpoints, versioning |
| Infrastructure | `INFRA` | Configs, deployment, networking |
| AI/ML | `AI` | Models, training, evaluation |
| Architecture | `ARCH` | Patterns, dependencies, coupling |
| Dependencies | `DEP` | Versions, licenses, vulnerabilities |

### 7.3 Prompt Granularity Levels

| Level | Name | Description |
|-------|------|-------------|
| Atomic | Single-purpose | One input, one output, one concern |
| Composite | Multi-step | Sequences multiple atomic prompts |
| Chain | End-to-end | Full verification workflow for a domain |

### 7.4 Prompt Metadata Schema

```yaml
---
id: string              # PMT-{DOMAIN}-{SEQ}
title: string
version: string         # SemVer
category: string        # DISC | ANAL | VALD | COMP | SYNT | RPT
domain: string          # STATIC | SEC | DATA | API | INFRA | AI | ARCH | DEP
granularity: string     # atomic | composite | chain
input_type: string[]    # file_tree | source_code | config | schema | log | report
output_type: string[]   # structured_analysis | finding_list | coverage_report | summary
depends_on: string[]    # IDs of prerequisite prompts
tested_with: string[]   # Model IDs tested against
confidence: float       # 0.0-1.0, based on testing
deprecated: boolean
superseded_by: string|null
---
```

### 7.5 Prompt Lifecycle

```
DESIGNED → TESTED → APPROVED → ACTIVE → DEPRECATED → ARCHIVED
```

| Transition | Criteria |
|------------|----------|
| DESIGNED → TESTED | Tested against ≥2 models, output structure validated |
| TESTED → APPROVED | Peer-reviewed, output quality confirmed |
| APPROVED → ACTIVE | Included in a framework release |
| ACTIVE → DEPRECATED | Superseded by improved version or methodology change |
| DEPRECATED → ARCHIVED | Removed from active library, retained for reference |

### 7.6 Prompt Composition Rules

1. **Atomic prompts** must be self-contained (no implicit context from prior prompts)
2. **Composite prompts** explicitly declare which atomic prompts they compose
3. **Chains** define data flow between steps (output of step N feeds step N+1)
4. **Variables** in prompts use `{{variable_name}}` syntax and are bound in configurations
5. **No prompt** may contain hardcoded project-specific values (use configurations)

---

## 8. Evidence Architecture

### 8.1 Evidence Model

Evidence is the atomic unit of verification. Every finding, every analysis, every report ultimately rests on evidence.

```
Evidence Item
├── Identity (ID, type, title)
├── Provenance (who, when, how, from where)
├── Content (raw artifact)
├── Integrity (SHA-256 hash)
├── Metadata (tags, domain, engagement)
└── Relationships (feeds into, depends on)
```

### 8.2 Evidence Types

| Code | Name | Examples |
|------|------|----------|
| CODE | Source Code | File trees, source files, code excerpts |
| SEC | Security | Scan results, dependency audits, pen test reports |
| DATA | Data | Schema dumps, migration logs, data samples |
| API | API | OpenAPI specs, contract test results, response logs |
| INFRA | Infrastructure | Dockerfiles, compose files, server configs |
| AI | AI/ML | Model configs, evaluation reports, training manifests |
| CFG | Configuration | .env files, feature flags, settings |
| ARCH | Architecture | Diagrams, dependency graphs, module maps |
| DEP | Dependencies | package.json, lockfiles, license scans |
| INT | Interview | Stakeholder/developer interview notes |
| OBS | Observation | Screenshots, screen recordings, session logs |
| DOC | Documentation | READMEs, specs, design docs |

### 8.3 Evidence Record Structure

Each evidence item is a directory:

```
EVD-{PID}-{DOMAIN}-{SEQ}/
├── MANIFEST.md          # Metadata + hash + chain of custody
├── raw/                 # Original, unmodified artifacts
│   └── {artifact files}
├── processed/           # Transformed/analyzed (optional)
│   └── {processed files}
└── notes.md             # Verifier observations and context
```

### 8.4 Evidence Manifest Schema

```yaml
---
id: string                    # EVD-{PID}-{DOMAIN}-{SEQ}
title: string
type: string                  # Evidence type code
engagement: string            # Engagement ID
assurance_level: string       # L1 | L2 | L3
collected_by: string[]
collected_at: datetime        # ISO 8601
method: string                # How collected (git-archive, screenshot, export, etc.)
source_ref: string            # Commit hash, URL, system reference
integrity:
  algorithm: string           # sha256
  artifacts:
    - file: string
      hash: string
      size_bytes: integer
status: string                # COLLECTED | VALIDATED | ANALYZED | REFERENCED | ARCHIVED
depends_on: string[]          # IDs of prerequisite evidence
feeds_into: string[]          # IDs of analysis worksheets
chain_of_custody:             # Required for L2/L3 assurance
  - timestamp: datetime
    action: string
    actor: string
    note: string
---
```

### 8.5 Evidence Lifecycle

```
COLLECTED → VALIDATED → ANALYZED → REFERENCED → ARCHIVED
```

| State | Entry Criteria | Exit Criteria |
|-------|---------------|---------------|
| COLLECTED | Artifact placed in raw/ | Manifest created with basic metadata |
| VALIDATED | Manifest complete | SHA-256 hash confirmed, source_ref verified |
| ANALYZED | Processing complete | Processed artifacts exist, notes written |
| REFERENCED | Cited in worksheet/finding | Cross-reference recorded in registry |
| ARCHIVED | Engagement closed | Evidence sealed, read-only |

### 8.6 Integrity Verification

- Every raw artifact is hashed (SHA-256) at collection time
- Hashes are stored in the manifest and in `.svf/integrity/{engagement}/manifest.json`
- Re-verification can be run at any time via `tooling/scripts/verify-integrity`
- Hash mismatch = **Critical Finding** (evidence integrity compromised)
- For L3 assurance: hashes are independently verified by a second party

### 8.7 Evidence Registry

Each engagement maintains a master registry:

| Column | Description |
|--------|-------------|
| ID | Evidence identifier |
| Type | Domain code |
| Title | Brief description |
| Collected | Date/time |
| Status | Current lifecycle state |
| Hash Verified | Yes/No/Date |
| Referenced By | Analysis worksheets and findings that cite this evidence |

---

## 9. Verification Engine Architecture

The Verification Engine is the conceptual processing pipeline that transforms raw evidence into verified findings. It is not a single software application but a structured workflow that can be executed manually, via AI assistance, or through automation.

### 9.1 Pipeline Stages

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ DISCOVER │──▶│ COLLECT  │──▶│ ANALYZE  │──▶│ CLASSIFY │──▶│ REPORT   │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
  Inventory     Evidence      Worksheets     Findings       Reports
  Lists         Items         Trace Matrix   Registry       Summaries
```

### 9.2 Stage Definitions

#### Stage 1: Discovery

**Input:** Project codebase, documentation, stakeholder input  
**Output:** Component inventory, scope definition, verification plan  
**Methods:** File tree analysis, dependency graph extraction, interview, documentation review  
**Automation:** Prompts (DISC category), scripts (tree, grep, find)

#### Stage 2: Collection

**Input:** Discovery output, verification plan  
**Output:** Evidence items with manifests  
**Methods:** Git archive, screenshot, export, scan, manual capture  
**Automation:** Collection scripts, tool integrations  
**Quality Gate:** All evidence hashed and manifested before proceeding

#### Stage 3: Analysis

**Input:** Evidence items, applicable standards  
**Output:** Analysis worksheets, traceability matrix  
**Methods:** Static analysis, pattern detection, schema validation, contract comparison  
**Automation:** Prompts (ANAL, VALD, COMP categories), analysis scripts  
**Quality Gate:** Coverage analysis meets threshold before proceeding

#### Stage 4: Classification

**Input:** Analysis worksheets  
**Output:** Finding records, findings registry  
**Methods:** Severity assessment, confidence scoring, type classification  
**Automation:** Prompts (SYNT category), classification decision trees  
**Quality Gate:** All findings peer-reviewed before proceeding

#### Stage 5: Reporting

**Input:** Findings registry, analysis worksheets  
**Output:** Executive summary, final report, closure document  
**Methods:** Aggregation, prioritization, narrative construction  
**Automation:** Prompts (RPT category), report assembly scripts  
**Quality Gate:** Report accounts for all findings, approved by approver

### 9.3 Verification Domains

Each domain has its own standards, procedures, and prompt sets:

| Domain | Standard | Primary Method | Key Evidence Types |
|--------|----------|---------------|-------------------|
| Code Quality | STD-CODE | Static analysis, pattern detection | CODE |
| Security | STD-SEC | Vulnerability scanning, auth review | SEC, CODE, CFG |
| Data Integrity | STD-DATA | Schema validation, migration audit | DATA, CODE |
| API Contracts | STD-API | Contract testing, spec comparison | API, CODE |
| Infrastructure | STD-INFRA | Config review, deployment audit | INFRA, CFG |
| AI Components | STD-AI | Model review, evaluation audit | AI, DATA |
| Architecture | STD-ARCH | Dependency analysis, pattern review | ARCH, CODE, DEP |
| Dependencies | STD-DEP | Version audit, license scan | DEP |

### 9.4 Assurance Level Requirements

| Requirement | L1 Standard | L2 Enhanced | L3 Forensic |
|-------------|-------------|-------------|-------------|
| Evidence hashing | Required | Required | Required + independent verification |
| Chain of custody | Optional | Required | Required + signed |
| Peer review | Self-review | Required | Required + architect review |
| Coverage threshold | 70% | 85% | 95% |
| Dynamic analysis | Optional | Required | Required |
| Report approval | Author | Author + Approver | Author + Approver + Governance |

---

## 10. Report Architecture

### 10.1 Report Hierarchy

```
                    ┌─────────────────────┐
                    │   Final Report       │
                    │   (Comprehensive)    │
                    └─────────┬───────────┘
                              │ contains
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │   Executive  │ │   Domain     │ │   Closure    │
    │   Summary    │ │   Reports    │ │   Document   │
    └──────────────┘ └──────┬───────┘ └──────────────┘
                            │ contains
                            ▼
                    ┌──────────────┐
                    │   Findings   │
                    │   (per item) │
                    └──────┬───────┘
                           │ supported by
                           ▼
                    ┌──────────────┐
                    │   Evidence   │
                    │   & Analysis │
                    └──────────────┘
```

### 10.2 Report Types

| Type | Audience | Content | Length Target |
|------|----------|---------|---------------|
| Executive Summary | Leadership, sponsors | Key findings, risk summary, recommendations | 2-4 pages |
| Domain Report | Technical stakeholders | Detailed findings per domain | 5-15 pages per domain |
| Final Report | All stakeholders | Complete findings, evidence references, methodology | 20-50 pages |
| Closure Document | Governance, audit | Engagement completion, lessons learned, sign-off | 2-5 pages |

### 10.3 Finding Record Structure

Each finding follows a standardized structure:

| Field | Description |
|-------|-------------|
| ID | Unique finding identifier |
| Title | Concise description |
| Domain | Verification domain |
| Standard Reference | Specific standard clause violated |
| Severity | Critical / High / Medium / Low / Informational |
| Confidence | Confirmed / High / Medium / Low |
| Status | Open / Acknowledged / Remediated / Accepted-Risk / False-Positive |
| Description | Detailed description of the finding |
| Evidence | List of supporting evidence IDs |
| Analysis | List of supporting analysis worksheet IDs |
| Impact | What could happen if not addressed |
| Recommendation | Suggested remediation direction (not prescription) |
| Discovered By | Verifier name |
| Discovered At | Date |

### 10.4 Severity Scale

| Level | Code | Definition | Response Expectation |
|-------|------|-----------|---------------------|
| Critical | S1 | System compromised or data breach imminent | Immediate action |
| High | S2 | Significant risk to security, data, or operations | Action within 1 sprint |
| Medium | S3 | Moderate risk, workaround exists | Action within 2 sprints |
| Low | S4 | Minor issue, limited impact | Action when convenient |
| Informational | S5 | Observation, no direct risk | Awareness only |

### 10.5 Confidence Scale

| Level | Code | Definition |
|-------|------|-----------|
| Confirmed | C1 | Reproduced, multiple evidence sources |
| High | C2 | Strong evidence, single verification path |
| Medium | C3 | Reasonable evidence, some uncertainty |
| Low | C4 | Preliminary indication, requires further investigation |

### 10.6 Report Assembly Rules

1. Every finding in the registry must appear in the final report
2. Findings are sorted by severity (Critical first), then by domain
3. Executive summary includes only S1 and S2 findings plus statistical summary
4. All evidence references include hash verification status
5. Methodology section cites the specific procedures and prompts used
6. Coverage analysis shows what was verified and what was not

---

## 11. Model Usage Strategy

### 11.1 Multi-Model Philosophy

SVF does not depend on a single AI model. Different models have different strengths. The framework is designed to work with any model that can process structured text input and produce structured output.

### 11.2 Model Roles

| Role | Description | Recommended Models |
|------|-------------|-------------------|
| **Primary Analyst** | Main verification workhorse | GPT-4, Claude 3.5 Sonnet, Qwen-3 |
| **Secondary Validator** | Cross-checks primary findings | Different model family from primary |
| **Discovery Agent** | Codebase exploration and inventory | Any capable model |
| **Report Generator** | Narrative assembly from structured data | GPT-4, Claude 3.5 |
| **Schema Validator** | JSON/YAML structure validation | Any model or rule-based |

### 11.3 Model Selection Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Structured output fidelity | High | Can the model follow output format instructions? |
| Context window | High | Can it process large codebases? |
| Reasoning quality | High | Does it identify subtle issues? |
| Consistency | Medium | Does it produce similar results on repeated runs? |
| Cost | Medium | Is it economically viable for the engagement? |
| Latency | Low | Speed matters but is not critical |

### 11.4 Model Testing Requirements

Every prompt must be tested against at least 2 models before approval:

| Test | Criteria |
|------|----------|
| Output structure compliance | Output matches specified schema ≥95% |
| Finding accuracy | ≥80% of findings confirmed by manual review |
| False positive rate | ≤20% false positive rate |
| Coverage completeness | Identifies ≥70% of seeded test issues |

### 11.5 Cross-Model Validation

For L2 and L3 assurance levels:

1. Primary model performs analysis
2. Secondary model (different family) validates findings
3. Disagreements are flagged for human review
4. Agreement rate is recorded in the engagement metadata

### 11.6 Model Versioning

- Prompts record which model versions they were tested against
- When a model is updated, prompts should be re-tested
- Model deprecation (provider EOL) triggers prompt review

---

## 12. Release Strategy

### 12.1 Release Types

| Type | Scope | Cadence | Tag Format |
|------|-------|---------|------------|
| Framework Release | Framework documents only | Quarterly or as needed | `framework/v{MAJOR}.{MINOR}.{PATCH}` |
| Engagement Release | Single engagement bundle | Per milestone | `engagement/{PID}/v{YYYY}.{MM}.{DD}-r{N}` |
| Prompt Release | Prompt library update | Monthly or as needed | `prompts/v{MAJOR}.{MINOR}.{PATCH}` |

### 12.2 Framework Release Process

```
1. All target documents reach APPROVED status
2. Release candidate created (48-hour review period)
3. Integrity manifests generated for all documents
4. Changelog entry written
5. Git tag created
6. Release notes published
```

### 12.3 Engagement Release Process

```
1. All four gates passed (Planning, Evidence, Analysis, Release)
2. All findings in final state (not DRAFT)
3. Final report approved by approver
4. Evidence integrity verified (all hashes match)
5. Closure document signed
6. Git tag created
7. Release bundle assembled
```

### 12.4 Release Bundle Contents

| Artifact | Description |
|----------|-------------|
| Release tag | Git tag with version |
| Changelog | Changes since last release |
| Integrity manifest | SHA-256 hashes of all documents |
| Release notes | Human-readable summary |
| Sign-off record | Approver confirmation |

### 12.5 Backward Compatibility

- Framework MAJOR version changes may break template compatibility
- Framework MINOR version changes are backward-compatible
- Engagement releases are immutable (never revised, only superseded by new revision)

---

## 13. Governance

### 13.1 Roles

| Role | Responsibility | Authority | Separation Requirement |
|------|---------------|-----------|----------------------|
| **SVF Architect** | Designs and maintains the framework | Approves framework changes | Cannot be engagement verifier for same framework version |
| **Engagement Lead** | Plans and executes an engagement | Approves planning docs | Cannot be sole approver |
| **Verifier** | Performs verification activities | Authors L3/L4 documents | Cannot approve own work |
| **Reviewer** | Peer-reviews verification work | Moves DRAFT → REVIEW | Must be different from author |
| **Approver** | Final document acceptance | Moves REVIEW → APPROVED | Must be different from author and reviewer |
| **Release Manager** | Packages and publishes releases | Publishes releases | Cannot be sole approver |
| **Integrity Officer** | Verifies evidence integrity | Validates hashes | Required for L2/L3 assurance |

### 13.2 Approval Gates

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│ PLANNING   │───▶│ EVIDENCE   │───▶│ ANALYSIS   │───▶│ RELEASE    │
│ GATE       │    │ GATE       │    │ GATE       │    │ GATE       │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
```

| Gate | Entry Criteria | Exit Criteria | Approver |
|------|---------------|---------------|----------|
| Planning | Engagement charter exists | Scope, checklist, schedule approved | Engagement Lead |
| Evidence | Planning gate passed | Evidence registry complete, hashes verified | Engagement Lead + Integrity Officer (L2/L3) |
| Analysis | Evidence gate passed | Worksheets complete, traceability populated, coverage ≥ threshold | Engagement Lead |
| Release | Analysis gate passed | All findings triaged, final report approved, closure signed | Approver + Engagement Lead |

### 13.3 Review Protocol

| Document Layer | Self-Review | Peer Review | Architect Review | Approval |
|---------------|-------------|-------------|-----------------|----------|
| L0 Governance | Required | Required | Required | SVF Architect |
| L1 Standards | Required | Required | Required | SVF Architect |
| L2 Methodology | Required | Required | Required | SVF Architect |
| L3 Evidence | Required | Required (L2/L3) | Optional | Engagement Lead |
| L3 Analysis | Required | Required | Optional | Engagement Lead |
| L4 Findings | Required | Required | Optional | Engagement Lead |
| L4 Reports | Required | Required | Optional | Approver |

### 13.4 Conflict Resolution

1. Author and reviewer disagree → Engagement Lead mediates
2. Engagement Lead cannot resolve → SVF Architect determines
3. SVF Architect decision is final and recorded in document revision history

### 13.5 Ethics & Independence

- Verifiers must declare conflicts of interest before engagement
- A verifier who authored code being verified cannot verify that code
- For L3 assurance: verification team must be organizationally independent from development team

---

## 14. Versioning

### 14.1 Framework Versioning

**Semantic Versioning 2.0.0**

| Component | Trigger |
|-----------|---------|
| MAJOR | Breaking changes to templates, taxonomy, or methodology structure |
| MINOR | New standards, new templates, backward-compatible extensions |
| PATCH | Corrections, clarifications, typo fixes |

### 14.2 Engagement Versioning

**Date-based with revision suffix:** `v{YYYY}.{MM}.{DD}-r{N}`

Each revision represents a significant engagement milestone:
- r1: Initial verification
- r2: Post-remediation re-verification
- r3: Follow-up or annual review

### 14.3 Document Versioning

Each document carries its own version in frontmatter:
- Framework documents: SemVer aligned with framework release
- Engagement documents: Date-based, aligned with engagement revision

### 14.4 Document Status Lifecycle

```
DRAFT → REVIEW → APPROVED → PUBLISHED → ARCHIVED
```

| Status | Who Can Modify | Meaning |
|--------|---------------|---------|
| DRAFT | Author only | Work in progress |
| REVIEW | Author + Reviewer | Under peer review |
| APPROVED | Approver only | Passed review gate |
| PUBLISHED | Release Manager | Included in a release |
| ARCHIVED | Governance only | Superseded or engagement closed |

### 14.5 Deprecation Policy

- Deprecated documents are marked `ARCHIVED` with `supersedes` field populated
- Deprecated documents are never deleted
- References to deprecated documents trigger a warning during review

---

## 15. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Objective:** Establish repository structure, governance, and core taxonomies.

| Milestone | Deliverables | Exit Criteria |
|-----------|-------------|---------------|
| M1.1 | Repository structure on disk | All directories created |
| M1.2 | Governance Charter (GOV-001) | Approved |
| M1.3 | Roles & Responsibilities (GOV-002) | Approved |
| M1.4 | Approval Gates (GOV-003) | Approved |
| M1.5 | Severity Scale (TAX-001) | Approved |
| M1.6 | Confidence Scale (TAX-002) | Approved |
| M1.7 | Finding Types (TAX-003) | Approved |
| M1.8 | Evidence Types (TAX-004) | Approved |
| M1.9 | Framework META | Published |
| M1.10 | README, CHANGELOG, LICENSE | Published |

**Dependencies:** None  
**Parallel Tracks:** M1.2-M1.4 (governance) and M1.5-M1.8 (taxonomies) can proceed in parallel

---

### Phase 2: Standards (Weeks 3-4)

**Objective:** Define what we verify across all domains.

| Milestone | Deliverables | Exit Criteria |
|-----------|-------------|---------------|
| M2.1 | Code Quality Standard (STD-001) | Approved |
| M2.2 | Security Standard (STD-002) | Approved |
| M2.3 | Data Integrity Standard (STD-003) | Approved |
| M2.4 | API Contract Standard (STD-004) | Approved |
| M2.5 | Infrastructure Standard (STD-005) | Approved |
| M2.6 | AI Component Standard (STD-006) | Approved |
| M2.7 | Architecture Standard (STD-007) | Approved |
| M2.8 | Dependency Standard (STD-008) | Approved |

**Dependencies:** Phase 1 (taxonomies must exist for standards to reference)  
**Priority:** M2.1, M2.2, M2.4 are P0 (needed for first engagement). M2.5-M2.8 are P1.

---

### Phase 3: Methodology & Templates (Weeks 5-6)

**Objective:** Define how verification is performed and provide reusable templates.

| Milestone | Deliverables | Exit Criteria |
|-----------|-------------|---------------|
| M3.1 | Methodology Overview (METH-001) | Approved |
| M3.2 | Static Analysis Procedure (METH-002) | Approved |
| M3.3 | Evidence Collection Procedure (METH-004) | Approved |
| M3.4 | Engagement Charter Template (TMPL-001) | Approved |
| M3.5 | Verification Plan Template (TMPL-002) | Approved |
| M3.6 | Evidence Record Template (TMPL-003) | Approved |
| M3.7 | Finding Record Template (TMPL-004) | Approved |
| M3.8 | Analysis Worksheet Template (TMPL-005) | Approved |
| M3.9 | Executive Summary Template (TMPL-006) | Approved |
| M3.10 | Final Report Template (TMPL-007) | Approved |
| M3.11 | Closure Document Template (TMPL-008) | Approved |
| M3.12 | Dynamic Analysis Procedure (METH-003) | Approved |
| M3.13 | Reporting Procedure (METH-005) | Approved |
| M3.14 | AI-Assisted Verification Procedure (METH-006) | Approved |

**Dependencies:** Phase 1 + Phase 2  
**Priority:** M3.1-M3.8 are P0. M3.9-M3.14 are P1.

---

### Phase 4: Prompt Engineering (Weeks 5-7, parallel with Phase 3)

**Objective:** Build the AI-assisted verification prompt library.

| Milestone | Deliverables | Exit Criteria |
|-----------|-------------|---------------|
| M4.1 | Code Structure Analysis (PMT-STATIC-001) | Tested ≥2 models, approved |
| M4.2 | Dependency Analysis (PMT-STATIC-002) | Tested ≥2 models, approved |
| M4.3 | Pattern Detection (PMT-STATIC-003) | Tested ≥2 models, approved |
| M4.4 | Vulnerability Scan (PMT-SEC-001) | Tested ≥2 models, approved |
| M4.5 | Auth Analysis (PMT-SEC-002) | Tested ≥2 models, approved |
| M4.6 | Schema Validation (PMT-DATA-001) | Tested ≥2 models, approved |
| M4.7 | API Contract Verification (PMT-API-001) | Tested ≥2 models, approved |
| M4.8 | Full Static Analysis Chain (CHAIN-001) | End-to-end validated |
| M4.9 | Security Deep Dive Chain (CHAIN-002) | End-to-end validated |

**Dependencies:** Phase 2 (standards define what prompts verify)  
**Can run parallel with:** Phase 3

---

### Phase 5: Tooling (Weeks 6-8, parallel with Phases 3-4)

**Objective:** Build automation for evidence management and integrity.

| Milestone | Deliverables | Exit Criteria |
|-----------|-------------|---------------|
| M5.1 | Evidence hash calculator script | Functional, tested |
| M5.2 | Integrity verification script | Functional, tested |
| M5.3 | Evidence record JSON schema | Validated against template |
| M5.4 | Finding record JSON schema | Validated against template |
| M5.5 | Registry generator script | Functional, tested |
| M5.6 | Report assembly script | Functional, tested |

**Dependencies:** Phase 3 (templates define schemas)  
**Can run parallel with:** Phase 3, Phase 4

---

### Phase 6: First Engagement (Weeks 8-12)

**Objective:** Validate the framework by executing it against a real project.

| Milestone | Deliverables | Exit Criteria |
|-----------|-------------|---------------|
| M6.1 | Engagement charter | Approved (Planning Gate) |
| M6.2 | Verification plan & checklist | Approved (Planning Gate) |
| M6.3 | Prompt configuration | Bound to project |
| M6.4 | Evidence collection (static) | Evidence Gate passed |
| M6.5 | Analysis worksheets | Analysis Gate passed |
| M6.6 | Findings registry | All findings triaged |
| M6.7 | Executive summary | Approved |
| M6.8 | Final report | Approved |
| M6.9 | Closure document | Signed (Release Gate passed) |
| M6.10 | Lessons learned | Captured, fed back to framework |

**Dependencies:** Phase 3 + Phase 4 + Phase 5

---

### Roadmap Dependency Graph

```
Phase 1: Foundation ──────────────┐
                                   ├──▶ Phase 3: Methodology ──┐
Phase 2: Standards ───────────────┘                             │
                                    │                           │
                                    ├──▶ Phase 4: Prompts ──────┼──▶ Phase 6: First
                                    │                           │     Engagement
                                    └──▶ Phase 5: Tooling ──────┘
```

### Critical Path

Phase 1 → Phase 2 → Phase 3 → Phase 6

Phases 4 and 5 run in parallel with Phase 3 and must complete before Phase 6.

---

## Appendix A: Design Decisions Log

| ID | Decision | Rationale | Alternatives Considered |
|----|----------|-----------|----------------------|
| DD-001 | Separate framework/ from engagements/ | Independent versioning, reusability | Single tree with tags (rejected: too coupled) |
| DD-002 | 5-layer document model (L0-L4) | Clear separation of concerns | 3-layer (rejected: insufficient granularity) |
| DD-003 | Evidence as directories, not files | Allows raw + processed + notes per item | Flat files (rejected: loses context) |
| DD-004 | SHA-256 for integrity | Industry standard, collision-resistant | MD5 (rejected: broken), SHA-512 (overkill) |
| DD-005 | SemVer for framework, date-based for engagements | Framework is product-like, engagements are event-like | Both SemVer (rejected: engagement versions meaningless) |
| DD-006 | Prompts as first-class artifacts | AI is core to methodology, not auxiliary | Inline prompts (rejected: not reusable or testable) |
| DD-007 | Three assurance levels | Flexibility without complexity | Two levels (rejected: no middle ground), Four+ (rejected: too complex) |
| DD-008 | YAML frontmatter for all documents | Machine-readable metadata standard | JSON frontmatter (rejected: less human-readable), Custom format (rejected: non-standard) |

## Appendix B: Comparison with Industry Frameworks

| Aspect | SVF v1.1 | OWASP ASVS | NIST SSDF | ISO 25010 | COBIT |
|--------|----------|------------|-----------|-----------|-------|
| Primary Focus | Full-stack verification | Web app security | Dev lifecycle | Product quality | IT governance |
| Evidence Model | Hash-verified chain | Checklist | Practice-based | Metric-based | Control-based |
| AI Integration | First-class | None | None | None | None |
| Reusability | Framework/engagement split | Per-project | Org-wide | Per-product | Org-wide |
| Automation | Script + prompt library | Manual | Manual | Tool-based | Tool-based |
| Versioning | SemVer + date-based | Major versions | Revisions | Editions | Versions |
| Assurance Levels | 3 (Standard/Enhanced/Forensic) | 3 (L1/L2/L3) | N/A | N/A | N/A |

## Appendix C: Glossary

| Term | Definition |
|------|-----------|
| **Engagement** | A specific verification instance targeting a project |
| **Finding** | A verified observation that deviates from a standard |
| **Evidence** | An artifact collected during verification with provenance and integrity metadata |
| **Gate** | A mandatory review checkpoint that must be passed before proceeding |
| **Chain** | A sequenced composition of prompts forming a verification workflow |
| **Registry** | A machine-readable index of artifacts (evidence or findings) |
| **Integrity Manifest** | A collection of SHA-256 hashes for evidence verification |
| **Assurance Level** | The rigor applied to an engagement (L1/L2/L3) |
| **Worksheet** | A structured analysis document that evaluates evidence against standards |
| **Traceability Matrix** | A mapping from findings → analysis → evidence → standards |
| **Prompt Configuration** | A project-specific binding of prompt variables to actual values |
