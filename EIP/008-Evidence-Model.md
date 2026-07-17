# 008 — Evidence Model

## Overview

Evidence is the foundation of engineering rigor. The Evidence Model defines
what constitutes evidence, how it is classified, how it supports conclusions,
and how it is verified and traced. Without evidence, engineering conclusions
are opinions.

---

## Evidence Definition

Evidence is a verifiable observation or measurement that supports or
contradicts a conclusion. Evidence must be:

- **Observable.** Based on empirical data, not inference.
- **Verifiable.** Can be independently reproduced.
- **Traceable.** Links to source artifacts and collection method.
- **Timestamped.** When the observation was made.
- **Attributed.** Who or what collected it.

---

## Evidence Structure

```
Evidence Record
├── Identity
│   ├── ID (unique, stable)
│   └── Type (from evidence type taxonomy)
├── Collection
│   ├── Timestamp
│   ├── Method (how evidence was collected)
│   ├── Collector (capability, agent, or person)
│   └── Environment (conditions at collection time)
├── Content
│   ├── Observation (what was observed)
│   ├── Measurement (quantified value, if applicable)
│   ├── Context (situational information)
│   └── Raw Data (if captured)
├── Provenance
│   ├── Source Artifacts (what was examined)
│   ├── Source Evidence (prior evidence used)
│   └── Chain of Custody (all handlers)
├── Support
│   ├── Supports (conclusions this evidence supports)
│   ├── Contradicts (conclusions this evidence contradicts)
│   └── Confidence (0.0–1.0)
├── Verification
│   ├── Verification Status (Unverified → Verified → Disputed)
│   ├── Verification Method (how to reproduce)
│   ├── Verified By
│   └── Verification Timestamp
└── Lifecycle
    ├── Status (Collected → Verified → Accepted → Superseded → Invalidated)
    └── History
```

---

## Evidence Types

### Observation

A direct, uninterpreted record of something observed.

*Examples: "File src/main.py contains 450 lines." "Test test_login passed."*

**Method.** Direct examination of source artifact.

### Finding

An interpreted observation that identifies something notable.

*Examples: "Class AuthService has 85% test coverage." "Dependency log4j
version 2.14.1 has known CVE-2021-44228."*

**Method.** Analysis of observations against criteria.

### Verification

Confirmation that an artifact meets a requirement.

*Examples: "All public APIs are documented." "Test suite passes at 98%."*

**Method.** Systematic comparison of artifact against specification.

### Measurement

A quantified observation with units and precision.

*Examples: "Build time: 142 seconds." "Memory usage: 256 MB peak."*

**Method.** Instrumented collection under defined conditions.

### Trace

A recorded path from one artifact or state to another.

*Examples: "Requirement REQ-42 is implemented in src/payment.py." "Bug
FIX-101 was introduced in commit a3f2c1b."*

**Method.** Link analysis across artifact graph.

### Comparison

An evaluation of two or more artifacts against each other.

*Examples: "Migration produces functionally equivalent output." "Version
3.0 is 23% faster than version 2.0."*

**Method.** Side-by-side analysis with defined criteria.

### Risk

An assessment of potential negative outcomes.

*Examples: "Single point of failure in authentication service." "Deprecated
library used in 12 files."*

**Method.** Risk taxonomy applied against artifact analysis.

### Decision Support

Evidence specifically collected to inform a decision.

*Examples: "Three architecture options evaluated." "Cost analysis for each
migration approach."*

**Method.** Structured evaluation against decision criteria.

### Validation

Confirmation that an artifact meets stakeholder needs.

*Examples: "User acceptance testing passed." "Performance meets SLO of
200ms p99."*

**Method.** Comparison of artifact behavior against requirements.

### Quality Metrics

Aggregated quality measurements for an artifact or system.

*Examples: "Maintainability Index: 85." "Cyclomatic complexity: 12 average."*

**Method.** Static analysis with defined metric formulas.

---

## Evidence Lifecycle

```
Collected → Verified → Accepted → Superseded → Invalidated
               │           │
               └───────────┘
           (re-verified if needed)
```

| State | Description |
|-------|-------------|
| Collected | Raw evidence obtained. Not yet checked for validity. |
| Verified | Evidence has been checked and is reproducible. |
| Accepted | Evidence is considered valid and actionable. |
| Superseded | New evidence provides better or contradictory information. |
| Invalidated | Evidence is shown to be incorrect or unreliable. |

---

## Evidence Quality

Evidence quality is assessed on six dimensions:

| Dimension | Description | Scale |
|-----------|-------------|-------|
| Accuracy | Freedom from error | 0.0–1.0 |
| Precision | Level of detail | 0.0–1.0 |
| Reproducibility | Can be independently verified | Yes/No |
| Objectivity | Free from interpretation bias | 0.0–1.0 |
| Completeness | All relevant aspects covered | 0.0–1.0 |
| Timeliness | Current enough for the purpose | 0.0–1.0 |

A **confidence score** (0.0–1.0) is derived from these dimensions.

---

## Evidence Chains

Evidence may form chains where one piece of evidence depends on another.

```
Source Artifact → Observation → Finding → Conclusion
      │               │            │           │
      │               │            │           └── Decision
      │               │            │
      │               │            └── Risk Assessment
      │               │
      │               └── Measurement
      │
      └── Trace
```

Each link in the chain must be verifiable. A chain is only as strong as its
weakest link.

---

## Reproducibility Requirements

For evidence to be reproducible:

1. **Collection method** must be documented in sufficient detail that an
   independent party can repeat it.
2. **Source artifacts** must be version-identified and accessible.
3. **Environment** (tools, versions, configuration) must be recorded.
4. **Raw data** must be preserved if transformation is involved.
5. **Verification protocol** must be defined before verification is attempted.

---

## Cross-References

- Evidence as a concept is defined in [Meta-Model](003-Engineering-Meta-Model.md).
- Evidence relationships are defined in [Ontology](004-Engineering-Ontology.md).
- Evidence-producing capabilities are in [Capability Model](005-Capability-Model.md).
- Evidence is stored as an [Artifact](007-Artifact-Model.md).
- Evidence supports decisions in [Governance](011-Governance.md).
