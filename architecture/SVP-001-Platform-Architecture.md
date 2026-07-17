---
id: SVP-001
title: Software Verification Platform — Platform Architecture
type: PLATFORM-ARCHITECTURE
layer: 0
version: 1.0.0
status: DRAFT
author: [SVF Architect]
created: 2026-07-08
updated: 2026-07-08
depends_on: [SVP-000]
supersedes: null
engagement: null
assurance_level: L3
---

# Software Verification Platform (SVP) — Platform Architecture

## 1. Architecture Overview

SVP is a layered platform architecture. Each layer has well-defined responsibilities, inputs, outputs, and dependencies. Layers communicate through the repository file system — there is no inter-process communication, no API gateway, no message queue. The repository IS the bus.

```
┌──────────────────────────────────────────────────────────────────┐
│                     RELEASE MANAGEMENT                           │
│  Version │ Package │ Changelog │ Integrity                       │
├──────────────────────────────────────────────────────────────────┤
│                       REPORTING                                  │
│  Executive Summary │ Findings │ Closure │ Dashboards              │
├──────────────────────────────────────────────────────────────────┤
│                     ENGAGEMENT MANAGEMENT                        │
│  Planning │ Evidence │ Analysis │ Findings │ Lifecycle            │
├──────────────────────────────────────────────────────────────────┤
│                       AUTOMATION                                 │
│  CI/CD Hooks │ Schedulers │ Triggers │ Integrations              │
├──────────────────────────────────────────────────────────────────┤
│                      VERIFICATION ENGINE                         │
│  Discovery │ Collection │ Analysis │ Classification │ Reporting  │
├──────────────────────────────────────────────────────────────────┤
│                       FRAMEWORK                                   │
│  Governance │ Standards │ Methodology │ Templates │ Taxonomies   │
├──────────────────────────────────────────────────────────────────┤
│                        KNOWLEDGE                                  │
│  Architecture │ Engineering │ Security │ Decisions │ Patterns    │
├──────────────────────────────────────────────────────────────────┤
│                      AI OPERATING SYSTEM                          │
│  Agents │ Modes │ Routing │ State │ Prompts │ Sessions           │
├──────────────────────────────────────────────────────────────────┤
│                        TOOLING                                    │
│  Scripts │ Schemas │ Validation │ Generation                     │
├──────────────────────────────────────────────────────────────────┤
│                      INFRASTRUCTURE                               │
│  Git │ Storage │ Compute │ Crypto │ Filesystem                   │
└──────────────────────────────────────────────────────────────────┘
```

## 2. Architectural Principles

### 2.1 File System as Integration Bus

All communication between layers happens through the file system. Layer N writes files that Layer N+1 reads. There is no API, no event bus, no message queue. This ensures:
- **Observability**: Every interaction leaves a file
- **Debuggability**: State can be inspected at any point
- **Offline operation**: No services needed
- **Git-native**: Everything is versioned

### 2.2 Ownership: Each Layer Owns Its Directory

| Layer | Owns | Reads From |
|-------|------|-----------|
| Infrastructure | Root configuration | System |
| Tooling | `tooling/` | All layers |
| AI Operating System | `.ai/` | State, knowledge |
| Knowledge | `knowledge/` | Framework, decisions |
| Framework | `framework/` | Knowledge |
| Verification Engine | `verification/` | Framework, engagements |
| Automation | `tooling/automation/` | Verification engine |
| Engagement Management | `engagements/` | Framework, verification |
| Reporting | `engagements/{pid}/reports/` | Findings, evidence |
| Release Management | `releases/` | All layers |

### 2.3 Dependency Direction

Dependencies flow upward in the layer stack:
- Infrastructure has no dependencies
- Tooling depends on Infrastructure
- AI OS depends on Tooling + Infrastructure
- Knowledge depends on AI OS
- Framework depends on Knowledge
- Verification Engine depends on Framework
- Automation depends on Verification Engine
- Engagement Management depends on Framework + Verification Engine
- Reporting depends on Engagement Management
- Release Management depends on all layers

### 2.4 Vendor Neutrality

No layer may hardcode a dependency on a specific AI model provider, cloud platform, or third-party service. All integrations are abstracted through:
- **Model Routing** (`.ai/routing/`) — selects model based on task requirements
- **Tool Adapters** (`tooling/adapters/`) — translates platform operations to tool-specific formats
- **Provider Abstraction** (`.ai/config/providers/`) — model provider configuration

## 3. Layer Descriptions

### Infrastructure Layer
The base layer. Git for versioning, filesystem for storage, cryptographic tools for hashing, compute resources for running verification tasks. All other layers depend on infrastructure being present.

### Tooling Layer
Reusable scripts, JSON schemas, and automation helpers. Evidence hashing, integrity verification, registry generation, report assembly. Tooling is framework-agnostic — it can be used with or without SVF.

### AI Operating System
The brain of the platform. Manages AI agents, operating modes, model routing, state persistence, prompt library, and session management. This is what makes SVP "AI-native." Described in detail in SVP-004.

### Knowledge Layer
Reusable knowledge artifacts that persist across engagements. Architecture decisions, engineering patterns, security research, glossary terms, lessons learned. Knowledge accumulates over time and makes the platform smarter with each use.

### Framework Layer
The SVF framework itself. Governance documents, verification standards, methodology procedures, document templates, classification taxonomies. This layer is versioned independently and changes infrequently.

### Verification Engine
The execution layer. Implements the five-stage verification pipeline: Discovery, Collection, Analysis, Classification, and Reporting. The engine reads framework standards and methodology, applies them to engagement evidence, and produces findings.

### Automation Layer
Connects SVP to the outside world. CI/CD pipeline hooks, scheduled verification tasks, event triggers, and external integrations (issue trackers, document stores). Automation makes verification part of the engineering workflow rather than a separate activity.

### Engagement Management
Manages the lifecycle of verification engagements. Planning, evidence collection, analysis tracking, findings management, and engagement closure. Each engagement is a self-contained project under `engagements/{pid}/`.

### Reporting
Generates human-readable reports from structured findings. Executive summaries for leadership, detailed findings for technical teams, closure documents for governance. Reports draw from evidence, analysis, and findings registries.

### Release Management
Packages and versions platform components. Framework releases, engagement releases, prompt library releases. Manages changelogs, integrity manifests, and release bundles.

## 4. Data Flow Architecture

### 4.1 Primary Flow (Verification)

```
Knowledge ──► Framework ──► Engagement ──► Evidence ──► Analysis ──► Findings ──► Report
   │              │              │              │            │             │           │
   │              │         Planning        Collection     Worksheets   Registry    Summary
   │              │              │              │            │             │           │
   ▼              ▼              ▼              ▼            ▼             ▼           ▼
  .ai/        framework/   engagements/   engagements/  engagements/ engagements/  reports/
```

### 4.2 Secondary Flow (Knowledge Capture)

```
Engagement ──► Lessons Learned ──► Knowledge ──► Framework Updates
   │                │                    │              │
   ▼                ▼                    ▼              ▼
 engagements/   knowledge/lessons/   knowledge/    framework/
```

### 4.3 State Flow

```
AI Session ──► State Files ──► Repository ──► Next Session
   │               │               │               │
   ▼               ▼               ▼               ▼
 .ai/state/    .ai/state/      git commit     .ai/state/
```

## 5. Platform Boundaries

### 5.1 What SVP Includes

- The repository structure and conventions
- The AI operating system (agents, modes, routing, state, prompts)
- The knowledge management system
- The verification engine
- The engagement management system
- The reporting pipeline
- The release management process
- Tooling scripts and schemas

### 5.2 What SVP Does Not Include

- The SVF framework content (governed separately under SVF)
- AI model weights or infrastructure
- Third-party CI/CD systems (SVP integrates with them)
- Issue trackers or project management tools
- Cloud hosting or deployment infrastructure

## 6. Integration Architecture

### 6.1 AI Model Integration

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  AI Tool     │───▶│  File System │───▶│  SVP State   │
│  (any)       │    │  (the bus)   │    │  (.ai/)      │
└──────────────┘    └──────────────┘    └──────────────┘
       │                    │                    │
   Reads files         Reads/writes         Reads/writes
   Writes files        files                state files
```

The AI tool reads instructions from `.ai/`, writes outputs to the appropriate directories, and updates state. The platform does not care which AI tool is used — all interaction is through the file system.

### 6.2 CI/CD Integration

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  CI/CD       │───▶│  Git Hooks   │───▶│  Automation  │
│  (GitHub/    │    │  (trigger)   │    │  (tooling/)  │
│  GitLab/etc) │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
       │                    │                    │
   Push event           pre-commit/         Verification
                        post-commit         scripts
```

## 7. Platform States

| State | Description | Entry Criteria |
|-------|-------------|---------------|
| BOOTSTRAP | Platform initialized, no framework loaded | Repository created |
| ACTIVE | Framework loaded, ready for engagements | Framework documents present |
| ENGAGEMENT | At least one engagement in progress | Engagement state created |
| RELEASE | Release being prepared | All gates passed |
| ARCHIVE | No active engagements, platform maintained | All engagements closed |

---

**End of Platform Architecture**
