---
id: SVP-007
title: Software Verification Platform — Governance Architecture
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

# Software Verification Platform (SVP) — Governance Architecture

## 1. Governance Model

SVP governance defines who has authority over what, how changes are approved, how versions are managed, and how quality is enforced.

```
┌──────────────────────────────────────────────────────────────────┐
│                       GOVERNANCE MODEL                           │
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │   DECISION          │    │   CHANGE CONTROL                │ │
│  │   AUTHORITY         │    │                                 │ │
│  │                     │    │   What requires approval?       │ │
│  │   Who decides what? │    │   Who approves what?            │ │
│  └─────────────────────┘    └─────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │   VERSIONING        │    │   QUALITY GATES                │ │
│  │                     │    │                                 │ │
│  │   How is versioning │    │   What must be true before     │ │
│  │   managed?          │    │   moving to next stage?        │ │
│  └─────────────────────┘    └─────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     RELEASE PROCESS                          │ │
│  │                                                              │ │
│  │   How are framework and engagement releases managed?        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Decision Authority

### 2.1 Authority Matrix

| Decision | Authority | Consultation | Escalation |
|----------|-----------|-------------|------------|
| Platform architecture changes | SVF Architect | Engineering team | Governance board |
| Framework document approval | SVF Architect | Engagement Lead | Governance board |
| Framework document content | Document author | Peer reviewer | SVF Architect |
| Engagement scope | Engagement Lead | Project stakeholders | SVF Architect |
| Evidence acceptance | Verifier | Reviewer | Engagement Lead |
| Finding classification | Verifier | Reviewer | Engagement Lead |
| Finding approval | Reviewer | Approver | Engagement Lead |
| Report approval | Approver | Engagement Lead | SVF Architect |
| Release approval | Release Manager | SVF Architect | Governance board |
| Mode change | Agent | — | SVF Architect |
| Routing table change | SVF Architect | — | — |
| Knowledge addition | Any contributor | Domain expert | SVF Architect |

### 2.2 Separation of Duties

| Constraint | Enforced By |
|------------|-------------|
| Author and approver must be different individuals | Document status workflow |
| Verifier and reviewer must be different individuals | Mode enforcement |
| No individual may approve their own work | Mode + state validation |
| Release manager cannot be sole approver | Gate configuration |
| SVF Architect cannot verify engagements for same framework version | Governance policy |

### 2.3 Dual-Hatting Rules

One person may hold multiple roles subject to:
- No role combination violates separation of duties
- Dual-hatting must be declared in engagement charter
- For L3 (Forensic) engagements, dual-hatting is prohibited

| Allowed Combinations | Prohibited Combinations |
|---------------------|------------------------|
| Verifier + Reviewer (same person, different engagements) | Author + Approver (same document) |
| Architect + Verifier (different engagements) | Verifier + Reviewer (same document) |
| Engagement Lead + Verifier (small engagements only) | Release Manager + Approver (same release) |
| Reviewer + Approver (different documents, L1 only) | Integrity Officer + Verifier (same evidence) |

---

## 3. Architecture Approval

### 3.1 Architecture Change Types

| Type | Description | Approval Required By |
|------|-------------|---------------------|
| MAJOR | Layer addition/removal, dependency model change, repository architecture change | SVF Architect + Governance review |
| MINOR | Document update, new component in existing layer, routing rule change | SVF Architect |
| PATCH | Typo fix, clarification, metadata update | Self-approval with review |

### 3.2 Architecture Approval Workflow

```
Change Proposed
    │
    ▼
Impact Analysis ──► MAJOR ──► Governance Board Review
    │                              │
    ▼                              ▼
MINOR/PATCH ──► SVF Architect ──► Approved or Rejected
    │               │
    ▼               ▼
Document Update   Rationale Recorded
    │
    ▼
Architecture Decision Log Updated
    │
    ▼
Implementation (if applicable)
```

---

## 4. Change Control

### 4.1 What Requires Change Control

| Change Type | Requires Approval | Requires ADR |
|-------------|------------------|--------------|
| Add/remove platform layer | YES | YES |
| Change layer dependency | YES | YES |
| Add/remove repository directory | YES | YES |
| Change naming convention | YES | YES |
| Add/remove state file | YES | YES |
| Add/remove knowledge category | YES | YES |
| Change routing rules | YES | MINOR |
| Update mode definition | YES | MINOR |
| Fix documentation error | NO | NO |
| Update state values | NO | NO |

### 4.2 Change Control Board

| Role | CCB Member | Vote Weight |
|------|-----------|-------------|
| SVF Architect | Permanent | 2 |
| Engagement Lead | Rotating | 1 |
| Senior Verifier | Rotating | 1 |
| Release Manager | Permanent | 1 |
| Governance representative | Permanent | 2 |

**Quorum:** 3 of 5 members
**Vote threshold:** Simple majority (3+)
**Veto:** SVF Architect (single veto on architecture changes)

---

## 5. Versioning

### 5.1 Platform Versioning

SVP uses Semantic Versioning 2.0.0:

| Component | Trigger |
|-----------|---------|
| MAJOR | Breaking changes to layer architecture, repository layout, state schema |
| MINOR | New layers, new state files, new knowledge categories, backward-compatible features |
| PATCH | Documentation updates, bug fixes, routing table updates |

**Current version:** 1.0.0

### 5.2 Framework Versioning

The SVF framework (within the platform) uses independent SemVer:

| Component | Trigger |
|-----------|---------|
| MAJOR | Breaking changes to methodology, taxonomy, or template structure |
| MINOR | New standards, new templates, backward-compatible extensions |
| PATCH | Corrections, clarifications, typo fixes |

**Current version:** 1.1.0

### 5.3 Engagement Versioning

Engagements use date-based versioning:

Pattern: `v{YYYY}.{MM}.{DD}-r{N}`

Example: `v2026.07.08-r1`

Each revision represents a significant milestone:
- r1: Initial verification
- r2: Post-remediation re-verification
- r3: Follow-up or annual review

---

## 6. Quality Gates

### 6.1 Document Quality Gates

| Gate | Entry | Exit | Approver |
|------|-------|------|----------|
| DRAFT | Idea exists | Content complete, frontmatter populated | Author |
| REVIEW | Content complete | Peer-reviewed, issues addressed | Reviewer |
| APPROVED | Review passed | Final sign-off | Approver |
| PUBLISHED | Approved | Included in release | Release Manager |
| ARCHIVED | Superseded | Reference to replacement | SVF Architect |

### 6.2 Engagement Quality Gates

| Gate | Entry Criteria | Exit Criteria |
|------|---------------|---------------|
| PLANNING | Engagement charter exists | Scope, checklist, schedule approved |
| EVIDENCE | Planning gate passed | Evidence registry complete, hashes verified |
| ANALYSIS | Evidence gate passed | Worksheets complete, trace matrix populated, coverage ≥ threshold |
| RELEASE | Analysis gate passed | All findings triaged, final report approved, closure signed |

### 6.3 Assurance Level Requirements

| Requirement | L1 Standard | L2 Enhanced | L3 Forensic |
|-------------|-------------|-------------|-------------|
| Evidence hashing | Required | Required | Required + independent |
| Chain of custody | Optional | Required | Required + signed |
| Peer review | Self-review | Required | Required + architect review |
| Coverage threshold | 70% | 85% | 95% |
| Dynamic analysis | Optional | Required | Required |
| Report approval | Author | Author + Approver | Author + Approver + Governance |

---

## 7. Release Process

### 7.1 Release Types

| Type | Scope | Tag Format | Cadence |
|------|-------|-----------|---------|
| Platform Release | SVP architecture docs | `platform/v{MAJOR}.{MINOR}.{PATCH}` | Quarterly or as needed |
| Framework Release | SVF framework docs | `framework/v{MAJOR}.{MINOR}.{PATCH}` | Quarterly or as needed |
| Engagement Release | Single engagement bundle | `engagement/{PID}/v{YYYY}.{MM}.{DD}-r{N}` | Per milestone |
| Prompt Release | Prompt library update | `prompts/v{MAJOR}.{MINOR}.{PATCH}` | Monthly or as needed |

### 7.2 Framework Release Process

```
1. All target documents reach APPROVED status
2. Release candidate created (48-hour review period)
3. Integrity manifests generated for all documents (SHA-256)
4. Changelog entry written
5. Git tag created
6. Release notes published
```

### 7.3 Engagement Release Process

```
1. All four gates passed (Planning, Evidence, Analysis, Release)
2. All findings in final state (not DRAFT)
3. Final report approved by approver
4. Evidence integrity verified (all hashes match)
5. Closure document signed
6. Git tag created
7. Release bundle assembled
```

### 7.4 Release Bundle Contents

| Artifact | Description |
|----------|-------------|
| Release Tag | Git tag with version |
| Changelog | Changes since last release |
| Integrity Manifest | SHA-256 hashes of all documents |
| Release Notes | Human-readable summary |
| Sign-off Record | Approver confirmation |

### 7.5 Release Immutability

- Framework releases are immutable (never revised, only superseded by next version)
- Engagement releases are immutable (never revised, only superseded by new revision)
- Tags must never be deleted or overwritten
- Release artifacts are archived and read-only

---

## 8. Conflict Resolution

### 8.1 Resolution Hierarchy

```
1. Author and Reviewer disagree → Engagement Lead mediates
2. Engagement Lead cannot resolve → SVF Architect determines
3. SVF Architect decision is final
4. Decision recorded in document revision history
```

### 8.2 Mode Conflicts

If two agents operating in different modes produce conflicting outputs:
1. Mode priority determines precedence: GOVERNANCE > ARCHITECTURE > REVIEW > VALIDATION > DISCOVERY > FORENSICS > PLANNING > IMPLEMENTATION > RELEASE
2. Lower-priority mode output is flagged for review
3. Conflict recorded in session log

### 8.3 State Conflicts

If two state files disagree:
1. Machine state wins over human state
2. More recent commit wins over older commit
3. If equal timestamps, the state file with the deeper path takes precedence

---

## 9. Ethics & Independence

### 9.1 Independence Requirements

- Verifiers must declare conflicts of interest before engagement
- A verifier who authored code being verified cannot verify that code
- For L3 assurance: verification team must be organizationally independent from development team
- For L3 assurance: evidence hashes must be independently verified by a second party

### 9.2 Transparency

- All governance decisions are recorded and versioned
- The governance model itself is documented and versioned
- Any stakeholder can inspect how a decision was reached
- Exception: security-sensitive decisions may have limited distribution

---

**End of Governance Architecture**
