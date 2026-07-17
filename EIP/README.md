# Engineering Intelligence Platform (EIP)

## Architecture Overview

The Engineering Intelligence Platform (EIP) is a domain model for AI-assisted
software engineering. It defines the permanent concepts, relationships, and
principles that govern how engineering work is planned, executed, verified,
and learned from — independent of any technology, vendor, or implementation.

## Document Index

| # | Document | Purpose |
|---|----------|---------|
| 000 | [Platform Vision](000-Platform-Vision.md) | Purpose, mission, scope, goals, success criteria |
| 001 | [Platform Principles](001-Platform-Principles.md) | Permanent engineering principles |
| 002 | [Reference Architecture](002-Reference-Architecture.md) | Architectural layers and conceptual structure |
| 003 | [Engineering Meta-Model](003-Engineering-Meta-Model.md) | First-class concepts of the platform |
| 004 | [Engineering Ontology](004-Engineering-Ontology.md) | Relationships between concepts |
| 005 | [Capability Model](005-Capability-Model.md) | Technology-independent capabilities |
| 006 | [Knowledge Model](006-Knowledge-Model.md) | Knowledge classification and management |
| 007 | [Artifact Model](007-Artifact-Model.md) | Universal artifact lifecycle |
| 008 | [Evidence Model](008-Evidence-Model.md) | Evidence types and provenance |
| 009 | [State Model](009-State-Model.md) | Minimal state representation |
| 010 | [AI Orchestration](010-AI-Orchestration.md) | Provider-independent AI integration |
| 011 | [Governance](011-Governance.md) | Decision architecture and ADR strategy |
| 012 | [Evolution Model](012-Evolution-Model.md) | Platform growth and retirement |
| 013 | [Implementation Strategy](013-Implementation-Strategy.md) | Recommended phase ordering |

## Core Principles

1. **Repository is permanent memory.** Conversations are temporary. AI recovers
   context from repository artifacts.
2. **Knowledge is a first-class asset.** More valuable than prompts.
3. **State is minimal.** Answers only: where are we, what changed, what is next.
4. **Evidence is reproducible.** Every conclusion must be traceable.
5. **Capabilities are stable.** Providers and models are replaceable.
6. **Architecture drives implementation.** Never the reverse.
7. **Everything is an artifact.** All outputs have identity and lifecycle.
8. **Every artifact has a lifecycle.** Draft → Review → Approved → Released → Deprecated → Archived.

## Guiding Philosophy

The EIP is designed for a decade of evolution. It optimizes for conceptual
correctness, vendor independence, and long-term maintainability — not for
short-term implementation speed. Every concept earns its place by answering
the question: *Is this a permanent concept of engineering, or is it a
technology detail?*
