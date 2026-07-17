# Software Verification Framework (SVF) v1.1 Foundation

## Architecture & Design Document

**Version:** 1.1.0  
**Status:** DESIGN  
**Date:** 2026-07-08  
**Classification:** Framework Architecture  

---

## 1. Repository Structure

The SVF repository separates **framework definition** from **framework application**. The framework is project-agnostic; engagements are project-specific instances.

```
MITRA-SVF/
│
├── framework/                  # The framework itself (project-agnostic)
│   ├── governance/             # Policies, roles, approval gates
│   ├── standards/              # Verification standards by domain
│   ├── methodology/            # How verification is performed
│   ├── templates/              # Document templates (all layers)
│   ├── taxonomies/             # Classification systems, severity scales
│   └── META.md                 # Framework self-description
│
├── engagements/                # Project-specific audit instances
│   └── {project-id}/           # One folder per engagement
│       ├── ENGAGEMENT.md       # Engagement charter & scope
│       ├── planning/           # Scope, plan, checklist
│       ├── evidence/           # Raw & processed evidence
│       ├── analysis/           # Worksheets, trace matrices
│       ├── findings/           # Finding records
│       └── reports/            # Draft & final reports
│
├── prompts/                    # AI-assisted verification prompts
│   ├── library/                # Atomic, reusable prompts
│   ├── chains/                 # Multi-step prompt sequences
│   └── configurations/         # Project-specific prompt bindings
│
├── tooling/                    # Automation & support scripts
│   ├── scripts/                # Evidence collection, hashing, validation
│   ├── schemas/                # JSON schemas for structured artifacts
│   └── automation/             # CI/CD integration, report generation
│
├── releases/                   # Release packages & changelogs
│   └── changelogs/
│
├── docs/                       # Meta-documentation
│   ├── architecture/           # This document and related design docs
│   └── guides/                 # User guides for framework operators
│
├── .svf/                       # Framework runtime metadata
│   ├── registry.json           # Master artifact registry
│   └── integrity/              # Hash manifests
│
├── CHANGELOG.md
├── GOVERNANCE.md
├── LICENSE
└── README.md
```

### Design Rationale

- **`framework/`** is versioned independently and changes infrequently. It defines *what* and *how*.
- **`engagements/`** is where all project-specific work lives. Each engagement is a self-contained instance.
- **`prompts/`** is separated because AI-assisted verification is a first-class concern, not an afterthought.
- **`tooling/`** contains executable support—never hand-edited evidence.
- **`.svf/`** is a hidden runtime directory for machine-readable metadata (registries, hashes).

---

## 2. Documentation Architecture

Documents are organized into five layers (L0–L4), each serving a distinct purpose in the verification chain.

### Layer Model

| Layer | Name | Purpose | Audience | Change Frequency |
|-------|------|---------|----------|-----------------|
| L0 | Governance | Why we verify. Policies, mandates, roles. | Leadership, Auditors | Rarely |
| L1 | Standards | What we verify. Domain-specific requirements. | Architects, Verifiers | Per framework release |
| L2 | Methodology & Templates | How we verify. Procedures, checklists, templates. | Verifiers | Per framework release |
| L3 | Evidence & Analysis | What we found. Raw data, worksheets, traces. | Verifiers, Reviewers | Per engagement |
| L4 | Reports & Conclusions | What it means. Findings, recommendations, sign-off. | Stakeholders, Leadership | Per engagement |

### Document Types by Layer

**L0 — Governance**
- Governance Charter
- Roles & Responsibilities Matrix
- Approval Gate Definitions
- Ethics & Independence Policy

**L1 — Standards**
- Code Quality Standard
- Security Verification Standard
- Data Integrity Standard
- API Contract Standard
- Infrastructure & Deployment Standard
- AI/ML Component Standard (optional)

**L2 — Methodology & Templates**
- Verification Methodology Overview
- Engagement Planning Template
- Evidence Collection Procedure
- Static Analysis Procedure
- Dynamic Analysis Procedure
- Findings Classification Template
- Report Generation Template

**L3 — Evidence & Analysis**
- Evidence Inventory
- Evidence Items (raw files, logs, screenshots, exports)
- Analysis Worksheets
- Traceability Matrix
- Coverage Analysis

**L4 — Reports & Conclusions**
- Findings Registry
- Individual Finding Reports
- Executive Summary
- Final Verification Report
- Engagement Closure Document

### Cross-References

Every L3/L4 document MUST reference:
1. The L1 standard it verifies against
2. The L2 procedure used to produce it
3. The engagement it belongs to

This creates a **verifiable chain** from governance → standard → procedure → evidence → finding → report.

---

## 3. Folder Organization (Detailed)

### 3.1 Framework Folder

```
framework/
├── governance/
│   ├── SVF-GOV-001-Charter.md
│   ├── SVF-GOV-002-Roles.md
│   ├── SVF-GOV-003-Gates.md
│   └── SVF-GOV-004-Ethics.md
│
├── standards/
│   ├── SVF-STD-001-Code-Quality.md
│   ├── SVF-STD-002-Security.md
│   ├── SVF-STD-003-Data-Integrity.md
│   ├── SVF-STD-004-API-Contracts.md
│   ├── SVF-STD-005-Infrastructure.md
│   └── SVF-STD-006-AI-Components.md
│
├── methodology/
│   ├── SVF-METH-001-Overview.md
│   ├── SVF-METH-002-Static-Analysis.md
│   ├── SVF-METH-003-Dynamic-Analysis.md
│   ├── SVF-METH-004-Evidence-Collection.md
│   └── SVF-METH-005-Reporting.md
│
├── templates/
│   ├── SVF-TMPL-001-Engagement-Charter.md
│   ├── SVF-TMPL-002-Verification-Plan.md
│   ├── SVF-TMPL-003-Evidence-Record.md
│   ├── SVF-TMPL-004-Finding-Record.md
│   ├── SVF-TMPL-005-Analysis-Worksheet.md
│   ├── SVF-TMPL-006-Executive-Summary.md
│   ├── SVF-TMPL-007-Final-Report.md
│   └── SVF-TMPL-008-Closure-Document.md
│
├── taxonomies/
│   ├── SVF-TAX-001-Severity-Scale.md
│   ├── SVF-TAX-002-Confidence-Scale.md
│   ├── SVF-TAX-003-Finding-Types.md
│   └── SVF-TAX-004-Evidence-Types.md
│
└── META.md
```

### 3.2 Engagement Folder

```
engagements/{project-id}/
├── ENGAGEMENT.md
│
├── planning/
│   ├── ENG-{PID}-PLAN-001-Scope.md
│   ├── ENG-{PID}-PLAN-002-Checklist.md
│   └── ENG-{PID}-PLAN-003-Schedule.md
│
├── evidence/
│   ├── raw/                          # Untouched collected evidence
│   │   ├── EVD-{PID}-CODE-001/      # Code evidence
│   │   ├── EVD-{PID}-SEC-001/       # Security evidence
│   │   ├── EVD-{PID}-DATA-001/      # Data evidence
│   │   └── ...
│   ├── processed/                    # Analyzed/transformed evidence
│   └── EVIDENCE-REGISTRY.md         # Index of all evidence items
│
├── analysis/
│   ├── ENG-{PID}-ANL-001-Coverage.md
│   ├── ENG-{PID}-ANL-002-Traceability.md
│   └── worksheets/
│       ├── ENG-{PID}-WS-001-{Domain}.md
│       └── ...
│
├── findings/
│   ├── FINDINGS-REGISTRY.md
│   ├── FND-{PID}-001.md
│   ├── FND-{PID}-002.md
│   └── ...
│
└── reports/
    ├── ENG-{PID}-RPT-001-Executive-Summary.md
    ├── ENG-{PID}-RPT-002-Final-Report.md
    └── ENG-{PID}-RPT-003-Closure.md
```

### 3.3 Prompts Folder

```
prompts/
├── library/
│   ├── PMT-STATIC-001-Code-Structure.md
│   ├── PMT-STATIC-002-Dependency-Analysis.md
│   ├── PMT-STATIC-003-Pattern-Detection.md
│   ├── PMT-SEC-001-Vulnerability-Scan.md
│   ├── PMT-SEC-002-Auth-Analysis.md
│   ├── PMT-DATA-001-Schema-Validation.md
│   ├── PMT-DATA-002-Data-Flow-Trace.md
│   ├── PMT-API-001-Contract-Verification.md
│   └── PMT-INFRA-001-Config-Review.md
│
├── chains/
│   ├── CHAIN-001-Full-Static-Analysis.md
│   ├── CHAIN-002-Security-Deep-Dive.md
│   ├── CHAIN-003-Data-Integrity-Verification.md
│   └── CHAIN-004-End-to-End-Engagement.md
│
└── configurations/
    └── {project-id}/
        └── PROMPT-CONFIG.md
```

---

## 4. Document Dependency Graph

```
                    ┌─────────────────────┐
                    │  L0: Governance      │
                    │  Charter, Roles,     │
                    │  Gates, Ethics       │
                    └────────┬────────────┘
                             │ defines
                             ▼
                    ┌─────────────────────┐
                    │  L1: Standards       │
                    │  Code, Security,     │
                    │  Data, API, Infra    │
                    └────────┬────────────┘
                             │ specifies
                             ▼
                    ┌─────────────────────┐
                    │  L2: Methodology &   │
                    │  Templates           │
                    └────────┬────────────┘
                             │ guides
                             ▼
              ┌──────────────────────────────┐
              │  Engagement Planning          │
              │  Scope → Checklist → Schedule │
              └──────────────┬───────────────┘
                             │ drives
                             ▼
              ┌──────────────────────────────┐
              │  L3: Evidence Collection      │
              │  Raw Evidence → Processed     │
              └──────────────┬───────────────┘
                             │ feeds
                             ▼
              ┌──────────────────────────────┐
              │  L3: Analysis                 │
              │  Worksheets → Trace Matrix    │
              │  → Coverage Analysis          │
              └──────────────┬───────────────┘
                             │ produces
                             ▼
              ┌──────────────────────────────┐
              │  L4: Findings                 │
              │  Finding Records → Registry   │
              └──────────────┬───────────────┘
                             │ summarizes to
                             ▼
              ┌──────────────────────────────┐
              │  L4: Reports                  │
              │  Executive Summary            │
              │  → Final Report               │
              │  → Closure Document           │
              └──────────────────────────────┘
```

### Dependency Rules

1. **No upward references without context.** L3 documents reference L1 standards but must cite the specific clause.
2. **Templates are binding.** Engagement documents MUST use the corresponding L2 template structure.
3. **Evidence precedes analysis.** No analysis worksheet may exist without corresponding evidence items in the registry.
4. **Findings require evidence.** Every finding MUST reference at least one evidence item and one analysis worksheet.
5. **Reports aggregate findings.** The final report MUST account for every finding in the registry (open or resolved).

---

## 5. Naming Conventions

### 5.1 Framework Documents

**Pattern:** `SVF-{LAYER}-{DOMAIN}-{SEQ}.md`

| Component | Values |
|-----------|--------|
| LAYER | `GOV`, `STD`, `METH`, `TMPL`, `TAX` |
| DOMAIN | Descriptive slug (e.g., `Code-Quality`, `Security`) |
| SEQ | 3-digit zero-padded sequence number |

**Examples:**
- `SVF-GOV-001-Charter.md`
- `SVF-STD-002-Security.md`
- `SVF-TMPL-004-Finding-Record.md`

### 5.2 Engagement Documents

**Pattern:** `ENG-{PID}-{PHASE}-{SEQ}-{Descriptor}.md`

| Component | Values |
|-----------|--------|
| PID | Project identifier (short, uppercase, e.g., `MITRA3`) |
| PHASE | `PLAN`, `ANL`, `WS`, `RPT` |
| SEQ | 3-digit zero-padded sequence number |
| Descriptor | Brief description |

**Examples:**
- `ENG-MITRA3-PLAN-001-Scope.md`
- `ENG-MITRA3-ANL-002-Traceability.md`
- `ENG-MITRA3-RPT-001-Executive-Summary.md`

### 5.3 Evidence Items

**Pattern:** `EVD-{PID}-{DOMAIN}-{SEQ}`

| Component | Values |
|-----------|--------|
| DOMAIN | `CODE`, `SEC`, `DATA`, `API`, `INFRA`, `AI`, `CFG`, `INT` (interview), `OBS` (observation) |
| SEQ | 3-digit zero-padded sequence number |

Evidence items are **directories** (not files), containing the raw artifact(s) and a `MANIFEST.md`.

### 5.4 Findings

**Pattern:** `FND-{PID}-{SEQ}.md`

Findings use a flat numbering scheme within each engagement. The finding record contains severity, type, and status internally.

### 5.5 Prompts

**Pattern:** `PMT-{DOMAIN}-{SEQ}-{Descriptor}.md`

| Component | Values |
|-----------|--------|
| DOMAIN | `STATIC`, `SEC`, `DATA`, `API`, `INFRA`, `AI` |

**Chains:** `CHAIN-{SEQ}-{Descriptor}.md`

### 5.6 General Rules

- All filenames use **kebab-case** (hyphens, no spaces, no underscores)
- All documents are **Markdown** (`.md`) unless binary evidence requires otherwise
- All identifiers are **uppercase**
- No abbreviations in descriptors unless universally understood (API, URL, etc.)
- Dates in filenames use **ISO 8601**: `YYYY-MM-DD`

---

## 6. Versioning Strategy

### 6.1 Framework Versioning

The framework uses **Semantic Versioning 2.0.0**:

| Component | Meaning |
|-----------|---------|
| MAJOR | Breaking changes to methodology, taxonomy, or template structure |
| MINOR | New standards, new templates, backward-compatible methodology extensions |
| PATCH | Corrections, clarifications, typo fixes |

**Current:** `1.1.0`

### 6.2 Engagement Versioning

Engagements use **date-based versioning with revision suffix**:

**Pattern:** `v{YYYY}.{MM}.{DD}-r{N}`

**Example:** `v2026.07.08-r1`

Each revision represents a significant milestone within the engagement (e.g., post-review, post-remediation).

### 6.3 Document Status Lifecycle

Every document carries a status in its frontmatter:

```
DRAFT → REVIEW → APPROVED → PUBLISHED → ARCHIVED
```

| Status | Meaning | Who Can Change |
|--------|---------|---------------|
| DRAFT | Work in progress | Author |
| REVIEW | Under peer review | Reviewer |
| APPROVED | Passed review gate | Approver |
| PUBLISHED | Included in a release | Release Manager |
| ARCHIVED | Superseded or engagement closed | Governance |

### 6.4 Document Frontmatter

Every SVF document begins with YAML frontmatter:

```yaml
---
id: SVF-STD-002
title: Security Verification Standard
version: 1.1.0
status: APPROVED
author: SVF Architect
reviewer: [name]
approver: [name]
created: 2026-07-08
updated: 2026-07-08
depends_on: [SVF-GOV-001, SVF-GOV-003]
supersedes: null
---
```

---

## 7. Release Strategy

### 7.1 Framework Releases

- Tagged as `framework/v{MAJOR}.{MINOR}.{PATCH}`
- Accompanied by a changelog entry in `releases/changelogs/`
- All framework documents must be in `APPROVED` or `PUBLISHED` status
- Release candidate period: minimum 48 hours in `REVIEW`

### 7.2 Engagement Releases

- Tagged as `engagement/{PID}/v{YYYY}.{MM}.{DD}-r{N}`
- Packaged as a self-contained release bundle
- All findings must be in final state (OPEN, ACKNOWLEDGED, REMEDIATED, ACCEPTED-RISK)
- Executive summary and final report must be `APPROVED`

### 7.3 Release Artifacts

Each release produces:

| Artifact | Description |
|----------|-------------|
| Release Tag | Git tag with version |
| Changelog | What changed since last release |
| Integrity Manifest | SHA-256 hashes of all documents |
| Release Notes | Human-readable summary |
| Sign-off Record | Approver signatures (digital or recorded) |

### 7.4 Release Cadence

| Type | Cadence |
|------|---------|
| Framework Minor | Quarterly or as needed |
| Framework Patch | As needed |
| Framework Major | Annual review cycle |
| Engagement | Per engagement milestone |

---

## 8. Governance Model

### 8.1 Roles

| Role | Responsibility | Authority |
|------|---------------|-----------|
| **SVF Architect** | Designs and maintains the framework | Approves framework changes |
| **Engagement Lead** | Plans and executes an engagement | Approves engagement planning docs |
| **Verifier** | Performs verification activities | Authors L3/L4 documents |
| **Reviewer** | Peer-reviews verification work | Moves docs from DRAFT to REVIEW |
| **Approver** | Final authority on document acceptance | Moves docs from REVIEW to APPROVED |
| **Release Manager** | Packages and publishes releases | Publishes releases |

*One person may hold multiple roles, but Approver and Verifier must be different individuals for any given document.*

### 8.2 Approval Gates

Each engagement passes through four mandatory gates:

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Planning     │───▶│  Evidence    │───▶│  Analysis    │───▶│  Release     │
│  Gate         │    │  Gate        │    │  Gate        │    │  Gate        │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

| Gate | Entry Criteria | Exit Criteria |
|------|---------------|---------------|
| **Planning Gate** | Engagement charter exists | Scope, checklist, and schedule approved |
| **Evidence Gate** | Planning gate passed | Evidence registry complete, integrity hashes recorded |
| **Analysis Gate** | Evidence gate passed | All worksheets complete, traceability matrix populated, coverage ≥ threshold |
| **Release Gate** | Analysis gate passed | All findings triaged, final report approved, closure document signed |

### 8.3 Review Protocol

1. **Self-Review:** Author checks against template and standard
2. **Peer Review:** Second verifier reviews for accuracy and completeness
3. **Architect Review:** (For framework documents) SVF Architect reviews for consistency
4. **Approval:** Approver signs off

### 8.4 Conflict Resolution

If a reviewer and author disagree:
1. The engagement lead mediates
2. If unresolved, the SVF Architect makes the final determination
3. The decision is recorded in the document's revision history

---

## 9. Prompt Architecture

AI-assisted verification is a first-class capability in SVF. Prompts are treated as **engineered artifacts** with versioning, testing, and composition.

### 9.1 Prompt Library (Atomic Prompts)

Each prompt in `prompts/library/` is a self-contained, single-purpose verification instruction.

**Prompt Document Structure:**

```yaml
---
id: PMT-STATIC-001
title: Code Structure Analysis
version: 1.0.0
domain: STATIC
input_type: [file_tree, source_code]
output_type: [structured_analysis]
depends_on: []
tested_with: [gpt-4, claude-3.5, qwen-3]
---
```

**Prompt Body Sections:**

| Section | Purpose |
|---------|---------|
| **Objective** | What this prompt determines |
| **Context** | What information the AI needs |
| **Instructions** | Step-by-step analysis procedure |
| **Output Format** | Exact structure of expected output |
| **Constraints** | What the AI must NOT do |
| **Examples** | Sample input/output pairs (optional) |
| **Variables** | Placeholders for project-specific values |

### 9.2 Prompt Chains

Chains compose multiple atomic prompts into a sequenced workflow.

**Chain Document Structure:**

```yaml
---
id: CHAIN-001
title: Full Static Analysis
version: 1.0.0
steps:
  - prompt: PMT-STATIC-001
    feeds_into: PMT-STATIC-002
  - prompt: PMT-STATIC-002
    feeds_into: PMT-STATIC-003
  - prompt: PMT-STATIC-003
    terminal: true
---
```

Each step defines:
- Which prompt to execute
- How output from the previous step feeds into this step
- Accept/reject criteria for proceeding

### 9.3 Prompt Configurations

Project-specific bindings that map prompt variables to actual values.

```yaml
---
project: MITRA3
framework_version: 1.1.0
bindings:
  project_name: "MITRA v3.0"
  tech_stack: "Node.js, Express, PostgreSQL, React"
  codebase_path: "./mitra-backend"
  standards: [SVF-STD-001, SVF-STD-002, SVF-STD-004]
overrides:
  PMT-STATIC-001:
    additional_instructions: "Pay special attention to middleware patterns"
---
```

### 9.4 Prompt Governance

- Prompts are versioned using SemVer
- Prompts must be tested against at least 2 AI models before approval
- Prompt changes that alter output structure require a MAJOR version bump
- Deprecated prompts are archived, not deleted

---

## 10. Evidence Architecture

Evidence is the foundation of verification. The evidence architecture ensures integrity, traceability, and reproducibility.

### 10.1 Evidence Types

| Type Code | Name | Description |
|-----------|------|-------------|
| `CODE` | Source Code | Codebase snapshots, file listings, code excerpts |
| `SEC` | Security | Vulnerability scans, dependency audits, penetration test results |
| `DATA` | Data | Database schemas, data samples, migration logs |
| `API` | API | Endpoint definitions, contract tests, response samples |
| `INFRA` | Infrastructure | Server configs, deployment manifests, network diagrams |
| `AI` | AI/ML | Model configs, training data manifests, evaluation results |
| `CFG` | Configuration | Environment variables, feature flags, settings files |
| `INT` | Interview | Notes from stakeholder/developer interviews |
| `OBS` | Observation | Screenshots, screen recordings, live session notes |

### 10.2 Evidence Record Structure

Each evidence item is a directory containing:

```
EVD-{PID}-{DOMAIN}-{SEQ}/
├── MANIFEST.md          # Metadata, hash, chain of custody
├── raw/                 # Original, unmodified artifacts
│   └── ...
├── processed/           # Transformed/analyzed artifacts (optional)
│   └── ...
└── notes.md             # Verifier observations
```

**MANIFEST.md Structure:**

```yaml
---
id: EVD-MITRA3-CODE-001
title: Backend Source Tree Snapshot
type: CODE
engagement: MITRA3
collected_by: [verifier name]
collected_at: 2026-07-08T10:30:00Z
method: git-archive
source_ref: commit abc1234
sha256:
  - file: backend-tree.tar.gz
    hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
status: VALIDATED
depends_on: []
feeds_into: [ENG-MITRA3-WS-001]
---
```

### 10.3 Evidence Lifecycle

```
COLLECTED → VALIDATED → ANALYZED → REFERENCED → ARCHIVED
```

| State | Action | Responsible |
|-------|--------|-------------|
| COLLECTED | Raw artifact placed in evidence directory | Verifier |
| VALIDATED | SHA-256 hash recorded, manifest completed | Verifier |
| ANALYZED | Processed artifacts produced, notes written | Verifier |
| REFERENCED | Cited in analysis worksheet or finding | Verifier |
| ARCHIVED | Engagement closed, evidence sealed | Release Manager |

### 10.4 Integrity Verification

- Every raw artifact has its SHA-256 hash recorded in the manifest
- The `.svf/integrity/` directory contains a master hash manifest per engagement
- Hash verification can be re-run at any time using `tooling/scripts/verify-integrity.sh`
- Any hash mismatch is a **critical finding** (evidence tampering or corruption)

### 10.5 Evidence Registry

Each engagement maintains a `EVIDENCE-REGISTRY.md` that indexes all evidence items:

| ID | Type | Title | Collected | Status | Hash Verified | Referenced By |
|----|------|-------|-----------|--------|---------------|---------------|
| EVD-MITRA3-CODE-001 | CODE | Backend Source Tree | 2026-07-08 | VALIDATED | Yes | WS-001, WS-002 |
| EVD-MITRA3-SEC-001 | SEC | npm audit output | 2026-07-08 | ANALYZED | Yes | WS-003 |

### 10.6 Chain of Custody

For high-assurance engagements, a chain of custody log tracks every access to raw evidence:

```
2026-07-08T10:30:00Z | COLLECTED | Verifier A | git-archive from commit abc1234
2026-07-08T10:35:00Z | VALIDATED | Verifier A | SHA-256 hash confirmed
2026-07-08T11:00:00Z | ANALYZED  | Verifier A | Static analysis performed
2026-07-08T14:00:00Z | REVIEWED  | Reviewer B | Evidence reviewed for completeness
```

---

## Implementation Roadmap

### Milestone 1: Framework Skeleton (M1)

**Objective:** Establish the repository structure and core governance documents.

| # | Document | ID | Priority |
|---|----------|----|----------|
| 1 | Repository README | `README.md` | P0 |
| 2 | Governance Charter | `SVF-GOV-001-Charter.md` | P0 |
| 3 | Roles & Responsibilities | `SVF-GOV-002-Roles.md` | P0 |
| 4 | Approval Gates | `SVF-GOV-003-Gates.md` | P0 |
| 5 | Framework META | `framework/META.md` | P0 |
| 6 | Changelog | `CHANGELOG.md` | P1 |
| 7 | License | `LICENSE` | P1 |

**Exit Criteria:** Repository structure exists on disk, governance documents approved.

---

### Milestone 2: Standards & Taxonomies (M2)

**Objective:** Define what we verify and how we classify results.

| # | Document | ID | Priority |
|---|----------|----|----------|
| 1 | Severity Scale | `SVF-TAX-001-Severity-Scale.md` | P0 |
| 2 | Confidence Scale | `SVF-TAX-002-Confidence-Scale.md` | P0 |
| 3 | Finding Types | `SVF-TAX-003-Finding-Types.md` | P0 |
| 4 | Evidence Types | `SVF-TAX-004-Evidence-Types.md` | P0 |
| 5 | Code Quality Standard | `SVF-STD-001-Code-Quality.md` | P0 |
| 6 | Security Verification Standard | `SVF-STD-002-Security.md` | P0 |
| 7 | Data Integrity Standard | `SVF-STD-003-Data-Integrity.md` | P1 |
| 8 | API Contract Standard | `SVF-STD-004-API-Contracts.md` | P1 |
| 9 | Infrastructure Standard | `SVF-STD-005-Infrastructure.md` | P2 |
| 10 | AI Component Standard | `SVF-STD-006-AI-Components.md` | P2 |

**Exit Criteria:** All P0 standards and taxonomies approved. P1 standards in review.

---

### Milestone 3: Methodology & Templates (M3)

**Objective:** Define how verification is performed and provide reusable templates.

| # | Document | ID | Priority |
|---|----------|----|----------|
| 1 | Verification Methodology Overview | `SVF-METH-001-Overview.md` | P0 |
| 2 | Static Analysis Procedure | `SVF-METH-002-Static-Analysis.md` | P0 |
| 3 | Evidence Collection Procedure | `SVF-METH-004-Evidence-Collection.md` | P0 |
| 4 | Engagement Charter Template | `SVF-TMPL-001-Engagement-Charter.md` | P0 |
| 5 | Verification Plan Template | `SVF-TMPL-002-Verification-Plan.md` | P0 |
| 6 | Evidence Record Template | `SVF-TMPL-003-Evidence-Record.md` | P0 |
| 7 | Finding Record Template | `SVF-TMPL-004-Finding-Record.md` | P0 |
| 8 | Analysis Worksheet Template | `SVF-TMPL-005-Analysis-Worksheet.md` | P0 |
| 9 | Executive Summary Template | `SVF-TMPL-006-Executive-Summary.md` | P1 |
| 10 | Final Report Template | `SVF-TMPL-007-Final-Report.md` | P1 |
| 11 | Closure Document Template | `SVF-TMPL-008-Closure-Document.md` | P1 |
| 12 | Dynamic Analysis Procedure | `SVF-METH-003-Dynamic-Analysis.md` | P2 |
| 13 | Reporting Procedure | `SVF-METH-005-Reporting.md` | P1 |

**Exit Criteria:** All P0 methodology and templates approved. Framework is usable for engagement planning.

---

### Milestone 4: Prompt Engineering (M4)

**Objective:** Build the AI-assisted verification prompt library.

| # | Document | ID | Priority |
|---|----------|----|----------|
| 1 | Code Structure Analysis Prompt | `PMT-STATIC-001-Code-Structure.md` | P0 |
| 2 | Dependency Analysis Prompt | `PMT-STATIC-002-Dependency-Analysis.md` | P0 |
| 3 | Pattern Detection Prompt | `PMT-STATIC-003-Pattern-Detection.md` | P0 |
| 4 | Vulnerability Scan Prompt | `PMT-SEC-001-Vulnerability-Scan.md` | P0 |
| 5 | Auth Analysis Prompt | `PMT-SEC-002-Auth-Analysis.md` | P1 |
| 6 | Schema Validation Prompt | `PMT-DATA-001-Schema-Validation.md` | P1 |
| 7 | Data Flow Trace Prompt | `PMT-DATA-002-Data-Flow-Trace.md` | P1 |
| 8 | API Contract Verification Prompt | `PMT-API-001-Contract-Verification.md` | P1 |
| 9 | Config Review Prompt | `PMT-INFRA-001-Config-Review.md` | P2 |
| 10 | Full Static Analysis Chain | `CHAIN-001-Full-Static-Analysis.md` | P0 |
| 11 | Security Deep Dive Chain | `CHAIN-002-Security-Deep-Dive.md` | P1 |

**Exit Criteria:** All P0 prompts tested against ≥2 models. Chain-001 validated end-to-end.

---

### Milestone 5: Tooling & Automation (M5)

**Objective:** Build support tooling for evidence management and integrity verification.

| # | Artifact | Type | Priority |
|---|----------|------|----------|
| 1 | Evidence hash calculator | Script | P0 |
| 2 | Integrity verification script | Script | P0 |
| 3 | Evidence record JSON schema | Schema | P1 |
| 4 | Finding record JSON schema | Schema | P1 |
| 5 | Registry generator | Script | P2 |
| 6 | Report assembler | Script | P2 |

**Exit Criteria:** Integrity verification script runs successfully against test evidence.

---

### Milestone 6: First Engagement — MITRA v3.0 (M6)

**Objective:** Validate the framework by executing it against the MITRA backend.

| # | Document | ID | Priority |
|---|----------|----|----------|
| 1 | MITRA3 Engagement Charter | `ENGAGEMENT.md` | P0 |
| 2 | MITRA3 Verification Plan | `ENG-MITRA3-PLAN-001-Scope.md` | P0 |
| 3 | MITRA3 Verification Checklist | `ENG-MITRA3-PLAN-002-Checklist.md` | P0 |
| 4 | MITRA3 Prompt Configuration | `PROMPT-CONFIG.md` | P0 |
| 5 | Evidence collection (static) | Multiple EVD- items | P0 |
| 6 | Analysis worksheets | Multiple WS- items | P0 |
| 7 | Findings registry | `FINDINGS-REGISTRY.md` | P0 |
| 8 | Executive summary | `ENG-MITRA3-RPT-001-Executive-Summary.md` | P0 |
| 9 | Final report | `ENG-MITRA3-RPT-002-Final-Report.md` | P0 |
| 10 | Closure document | `ENG-MITRA3-RPT-003-Closure.md` | P1 |

**Exit Criteria:** All four gates passed. Framework validated. Lessons learned captured.

---

## Milestone Dependency Graph

```
M1: Skeleton ──────────┐
                        ├──▶ M3: Methodology & Templates ──┐
M2: Standards ─────────┘                                    │
                                                            ├──▶ M6: First Engagement
M4: Prompts ────────────────────────────────────────────────┤
                                                            │
M5: Tooling ────────────────────────────────────────────────┘
```

- M1 and M2 can proceed in parallel
- M3 depends on M1 + M2
- M4 and M5 can proceed in parallel with M3
- M6 depends on M3 + M4 + M5

---

## Appendix A: Comparison with Industry Frameworks

| Aspect | SVF v1.1 | OWASP ASVS | NIST SSDF | ISO 25010 |
|--------|----------|------------|-----------|-----------|
| Scope | Full-stack + AI | Web app security | Software dev lifecycle | Product quality |
| Evidence model | Hash-verified chain of custody | Checklist-based | Practice-based | Metric-based |
| AI integration | First-class prompt architecture | None | None | None |
| Reusability | Framework/engagement separation | Per-project | Organization-wide | Per-product |
| Versioning | SemVer + date-based | Major versions | Revisions | Editions |

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **Engagement** | A specific verification instance for a project |
| **Finding** | A verified observation that deviates from a standard |
| **Evidence** | An artifact collected during verification |
| **Gate** | A mandatory review checkpoint |
| **Chain** | A sequenced composition of prompts |
| **Registry** | A machine-readable index of artifacts |
| **Integrity Manifest** | A collection of SHA-256 hashes for evidence verification |
