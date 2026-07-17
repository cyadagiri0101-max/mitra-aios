# 005 — Capability Model

## Overview

Capabilities are the functional units of the platform. They define *what*
engineering operations can be performed without specifying *how* they are
performed. This separation is the foundation of provider independence.

---

## Capability Structure

Every capability is defined by:

| Element | Description |
|---------|-------------|
| Name | Stable, unique identifier |
| Purpose | What engineering need this capability addresses |
| Inputs | What artifacts, knowledge, or context are required |
| Outputs | What artifacts, evidence, or knowledge are produced |
| Quality Requirements | Minimum standards the capability must meet |
| Evidence Produced | What evidence types the capability generates |
| Dependencies | Other capabilities that must precede this one |
| Recovery | How to recover if the capability fails |

---

## Capability Catalog

### Repository Analysis

**Purpose.** Examine a repository to understand its structure, content, and
characteristics.

**Inputs.** Repository reference, scope constraints, analysis parameters.

**Outputs.** File inventory, dependency graph, language breakdown, size
metrics, duplicate analysis.

**Quality Requirements.** Complete coverage of specified scope. Accurate
dependency detection. Verifiable file counts.

**Evidence Produced.** ScanReport, DependencyMap, MetricsSnapshot.

---

### Architecture Review

**Purpose.** Evaluate software architecture against defined criteria,
patterns, and principles.

**Inputs.** Repository analysis, architecture documentation (if any),
review criteria, reference architectures.

**Outputs.** Architecture assessment, violation list, recommendation report,
risk assessment.

**Quality Requirements.** Criteria-based evaluation. Traceable violations.
Actionable recommendations.

**Evidence Produced.** ArchitectureAssessment, ViolationRecord,
RiskEvaluation.

---

### Code Generation

**Purpose.** Generate source code from specifications, patterns, or
examples.

**Inputs.** Specification, context artifacts, coding standards, language
conventions.

**Outputs.** Generated source files, generation log, coverage report,
quality metrics.

**Quality Requirements.** Syntactically correct output. Adherence to coding
standards. Verifiable against specification.

**Evidence Produced.** GenerationLog, QualityMetrics, CoverageReport.

---

### Planning

**Purpose.** Create a structured plan for achieving an engineering goal.

**Inputs.** Goal definition, context artifacts, capability catalog,
constraints, success criteria.

**Outputs.** Execution plan, task breakdown, dependency graph, estimated
effort, risk assessment.

**Quality Requirements.** Complete coverage of goal. Consistent dependency
resolution. Achievable within constraints.

**Evidence Produced.** PlanArtifact, DependencyMap, RiskEvaluation.

---

### Verification

**Purpose.** Confirm that an artifact meets its specification or quality
requirements.

**Inputs.** Artifact under verification, specification or requirements,
verification criteria, reference artifacts.

**Outputs.** Verification report, pass/fail results, defect list, coverage
analysis.

**Quality Requirements.** Repeatable verification process. Complete coverage
of criteria. Clear pass/fail for each criterion.

**Evidence Produced.** VerificationReport, DefectRecord, CoverageAnalysis.

---

### Documentation

**Purpose.** Produce or update engineering documentation.

**Inputs.** Source artifacts, documentation standards, audience profile,
existing documentation.

**Outputs.** Documentation artifacts, change log, review record.

**Quality Requirements.** Accuracy against source artifacts. Completeness
for intended audience. Adherence to documentation standards.

**Evidence Produced.** DocumentationArtifact, ReviewRecord.

---

### Migration

**Purpose.** Transform artifacts from one form, language, or platform to
another.

**Inputs.** Source artifacts, target specification, migration rules,
validation criteria.

**Outputs.** Transformed artifacts, migration log, equivalence report,
issue list.

**Quality Requirements.** Functional equivalence. Complete transformation
of specified scope. Verifiable against validation criteria.

**Evidence Produced.** MigrationLog, EquivalenceReport, ValidationResult.

---

### Testing

**Purpose.** Create and execute tests for engineering artifacts.

**Inputs.** Artifact under test, test requirements, testing standards,
environment specification.

**Outputs.** Test suite, test execution report, coverage report, defect
report.

**Quality Requirements.** Repeatable tests. Complete requirement coverage.
Clear pass/fail per test case.

**Evidence Produced.** TestSuite, TestReport, CoverageReport, DefectRecord.

---

### Security Analysis

**Purpose.** Identify security vulnerabilities and compliance gaps.

**Inputs.** Repository analysis, security standards, threat models,
compliance requirements.

**Outputs.** Vulnerability report, risk assessment, remediation
recommendations, compliance gap analysis.

**Quality Requirements.** Comprehensive coverage. Industry-standard
vulnerability classification. Actionable remediation.

**Evidence Produced.** VulnerabilityReport, RiskAssessment, ComplianceReport.

---

### Reporting

**Purpose.** Produce structured reports from available artifacts and
evidence.

**Inputs.** Source artifacts, evidence, report template, audience
requirements.

**Outputs.** Formatted report, summary, metrics dashboard.

**Quality Requirements.** Accurate representation of source data.
Complete coverage of requested scope. Appropriate for intended audience.

**Evidence Produced.** ReportArtifact, MetricsSummary.

---

### Dependency Analysis

**Purpose.** Analyze artifact dependencies for impact, risk, and
upgrade paths.

**Inputs.** Dependency graph, version information, vulnerability database,
change scope.

**Outputs.** Impact analysis, upgrade recommendation, conflict report,
risk assessment.

**Quality Requirements.** Complete dependency resolution. Accurate impact
prediction. Current vulnerability data.

**Evidence Produced.** ImpactAnalysis, UpgradePath, ConflictReport.

---

### Knowledge Extraction

**Purpose.** Extract structured knowledge from artifacts and evidence.

**Inputs.** Source artifacts, evidence, knowledge classification schema,
extraction parameters.

**Outputs.** Knowledge items, relationship graph, confidence assessment,
source traceability.

**Quality Requirements.** Accurate extraction. Complete source traceability.
Appropriate confidence assessment.

**Evidence Produced.** KnowledgeItems, KnowledgeGraph, SourceTrace.

---

### Risk Assessment

**Purpose.** Evaluate and quantify engineering and project risks.

**Inputs.** Repository analysis, architecture review, dependency analysis,
project context, risk taxonomy.

**Outputs.** Risk register, risk scores, mitigation recommendations,
residual risk assessment.

**Quality Requirements.** Systematic evaluation. Consistent scoring.
Actionable mitigation.

**Evidence Produced.** RiskRegister, RiskScorecard, MitigationPlan.

---

## Capability Composition

Capabilities can be composed into workflows through three patterns:

**Sequence.** Capabilities execute in order. Outputs of one capability become
inputs to the next. (Example: Repository Analysis → Architecture Review →
Risk Assessment)

**Parallel.** Independent capabilities execute concurrently. Results are
merged for downstream consumption. (Example: Testing || Security Analysis)

**Conditional.** Capabilities execute based on the results of previous
capabilities. (Example: If VulnerabilityReport has critical items, execute
RemediationPlanning; otherwise skip)

---

## Capability Versioning

Capabilities themselves are versioned. A capability version defines:

- The exact set of inputs and outputs
- The quality requirements that must be met
- The evidence types that must be produced

When providers are updated, they must declare which capability versions they
implement. This allows new models to be adopted without changing capability
definitions, and capability refinements to be adopted without waiting for
model updates.

---

## Cross-References

- Capability lifecycle and definition are in [Meta-Model](003-Engineering-Meta-Model.md).
- Capability relationships to providers are in [AI Orchestration](010-AI-Orchestration.md).
- Capability workflows are composed in the [Reference Architecture](002-Reference-Architecture.md) Orchestration Layer.
- Capability evidence outputs are defined in [Evidence Model](008-Evidence-Model.md).
