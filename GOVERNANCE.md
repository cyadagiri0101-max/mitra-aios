---
id: SVF-GOV-ROOT
title: SVF Governance Overview
type: GOV-OVERVIEW
layer: 0
version: 1.1.0
status: PUBLISHED
author: [SVF Architect]
reviewer: [SVF Architect]
approver: [SVF Architect]
created: 2026-07-08
updated: 2026-07-08
depends_on: []
supersedes: null
engagement: null
assurance_level: L1
---

# Software Verification Framework Governance

This document provides an overview of SVF governance and points to the detailed governance documents.

---

## Governance Framework

The Software Verification Framework is governed by four core documents that define its authority, roles, approval processes, and ethical standards.

### Governance Documents

| Document | Location | Purpose |
|----------|----------|---------|
| **Governance Charter** | `framework/governance/SVF-GOV-001-Charter.md` | Framework authority, scope, and mandate |
| **Roles & Responsibilities** | `framework/governance/SVF-GOV-002-Roles.md` | Who can do what, separation requirements |
| **Approval Gates** | `framework/governance/SVF-GOV-003-Gates.md` | Mandatory review checkpoints |
| **Ethics & Independence** | `framework/governance/SVF-GOV-004-Ethics.md` | Conflict-of-interest, independence rules |

**Status:** Pending implementation (Milestone 2)

---

## Governance Principles

SVF governance is built on five principles:

1. **Separation of Duties** — No single person can author, review, and approve the same document
2. **Evidence-Based Decisions** — All approvals require documented evidence
3. **Transparency** — Governance processes are visible and auditable
4. **Proportionality** — Governance rigor matches assurance level (L1/L2/L3)
5. **Accountability** — Every decision has a named responsible party

---

## Roles Summary

| Role | Responsibility | Authority |
|------|---------------|-----------|
| **SVF Architect** | Designs and maintains the framework | Approves framework changes |
| **Engagement Lead** | Plans and executes engagements | Approves planning documents |
| **Verifier** | Performs verification activities | Authors L3/L4 documents |
| **Reviewer** | Peer-reviews verification work | Moves DRAFT → REVIEW |
| **Approver** | Final document acceptance | Moves REVIEW → APPROVED |
| **Release Manager** | Packages and publishes releases | Publishes releases |
| **Integrity Officer** | Verifies evidence integrity | Validates hashes (L2/L3) |

**Separation Requirement:** Author, Reviewer, and Approver must be different individuals for any given document.

---

## Approval Gates

Every engagement passes through four mandatory gates:

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│ PLANNING   │───▶│ EVIDENCE   │───▶│ ANALYSIS   │───▶│ RELEASE    │
│ GATE       │    │ GATE       │    │ GATE       │    │ GATE       │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
```

| Gate | Entry Criteria | Exit Criteria | Approver |
|------|---------------|---------------|----------|
| **Planning** | Engagement charter exists | Scope, checklist, schedule approved | Engagement Lead |
| **Evidence** | Planning gate passed | Evidence registry complete, hashes verified | Engagement Lead + Integrity Officer (L2/L3) |
| **Analysis** | Evidence gate passed | Worksheets complete, coverage ≥ threshold | Engagement Lead |
| **Release** | Analysis gate passed | All findings triaged, final report approved | Approver + Engagement Lead |

---

## Document Lifecycle

Every SVF document follows a five-state lifecycle:

```
DRAFT → REVIEW → APPROVED → PUBLISHED → ARCHIVED
```

| Status | Who Can Modify | Meaning |
|--------|---------------|---------|
| **DRAFT** | Author only | Work in progress |
| **REVIEW** | Author + Reviewer | Under peer review |
| **APPROVED** | Approver only | Passed review gate |
| **PUBLISHED** | Release Manager | Included in a release |
| **ARCHIVED** | Governance only | Superseded or engagement closed |

---

## Review Protocol

| Document Layer | Self-Review | Peer Review | Architect Review | Approval |
|---------------|-------------|-------------|-----------------|----------|
| L0 Governance | Required | Required | Required | SVF Architect |
| L1 Standards | Required | Required | Required | SVF Architect |
| L2 Methodology | Required | Required | Required | SVF Architect |
| L3 Evidence | Required | Required (L2/L3) | Optional | Engagement Lead |
| L3 Analysis | Required | Required | Optional | Engagement Lead |
| L4 Findings | Required | Required | Optional | Engagement Lead |
| L4 Reports | Required | Required | Optional | Approver |

---

## Conflict Resolution

1. Author and reviewer disagree → Engagement Lead mediates
2. Engagement Lead cannot resolve → SVF Architect determines
3. SVF Architect decision is final and recorded in document revision history

---

## Ethics & Independence

- Verifiers must declare conflicts of interest before engagement
- A verifier who authored code being verified cannot verify that code
- For L3 assurance: verification team must be organizationally independent from development team

See `framework/governance/SVF-GOV-004-Ethics.md` for detailed ethics policy.

---

## Assurance Levels

SVF defines three assurance levels that determine governance rigor:

| Level | Name | Use Case | Governance Requirements |
|-------|------|----------|------------------------|
| **L1** | Standard | Internal projects, routine reviews | Self-review, basic evidence hashing |
| **L2** | Enhanced | Customer-facing systems, compliance | Peer review, chain of custody, Integrity Officer |
| **L3** | Forensic | Security incidents, regulatory, litigation | Architect review, signed chain of custody, independent verification |

---

## Governance Compliance

### For Framework Documents

- All framework documents (L0, L1, L2) require SVF Architect approval
- Framework changes follow SemVer versioning
- Breaking changes require MAJOR version bump

### For Engagement Documents

- All engagement documents (L3, L4) require Engagement Lead approval
- L4 reports require Approver approval
- Engagement releases require all four gates passed

---

## Related Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Framework Self-Description | `framework/META.md` | Framework overview and usage |
| Architecture Design | `MITRA-SVF-v1.0-Foundation/SVF-v1.1-Architecture-Design.md` | Complete framework architecture |
| Changelog | `CHANGELOG.md` | Framework release history |

---

## Questions?

For governance questions:
- Framework governance: SVF Architect
- Engagement governance: Engagement Lead
- Ethics concerns: See `framework/governance/SVF-GOV-004-Ethics.md`

---

**End of Governance Overview**
