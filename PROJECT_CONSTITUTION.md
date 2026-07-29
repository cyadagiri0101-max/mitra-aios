# PROJECT CONSTITUTION

> **This document is the authoritative definition of MITRA.**
>
> All architectural decisions, implementation phases, feature requests, and design discussions should align with this document.
>
> The roadmap may evolve over time, but the Constitution defines the project's enduring vision and principles.

## Purpose

This document defines the permanent vision, principles, and end-state of the MITRA platform. It is the stable reference point for the project and should not be used as a substitute for the evolving technical records kept in the Data Library.

## Vision

MITRA is a project-centric mold development lifecycle management platform that evolves into an engineering knowledge operating system.

## Mission

- Digitize the complete mold development lifecycle.
- Ensure complete traceability.
- Preserve engineering knowledge.
- Keep customer data under customer ownership.

## Core Principles

1. **Project-centric, not ERP-centric.** The project is the central aggregate around which all domains are organized.
2. **End-to-end lifecycle management.** From customer inquiry to field service, every phase is covered.
3. **Traceability by design.** Every entity traces back to its originating project and engineering decisions.
4. **Local-first deployment.** Customer data remains under customer ownership.
5. **Modular architecture.** Organized as bounded contexts, not monolithic modules.
6. **Security and auditability by default.** Every significant operation supports RBAC, audit logging, and version history.
7. **AI augments engineers.** Recommendations require explicit human approval before affecting engineering data.
8. **Open, extensible architecture.** Domains communicate through the project lifecycle, not direct integration.

## Domain Architecture

MITRA is organized as a set of **bounded contexts** rather than a collection of business modules. Each domain encapsulates its own logic, data, and workflows. The Project domain acts as the backbone that links every domain — modules do not communicate directly but instead reference the project lifecycle, ensuring complete traceability from customer inquiry to field service.

### Commercial Domain
- CRM
- RFQ
- Quotations

### Project Domain
- Projects
- Milestones
- Tasks
- Teams
- Timeline

### Engineering Domain
- Design
- CAD Metadata
- BOM
- Process Planning
- Engineering Change

### Manufacturing Domain
- Production Planning
- MES
- Machine Allocation
- Trials
- Production Tracking

### Quality Domain
- Inspection
- NCR
- CAPA
- Traceability

### Service Domain
- Dispatch
- Installation
- Maintenance
- Customer Support

### Knowledge Domain
- Documents
- Engineering Knowledge
- Knowledge Graph
- AI Copilot

## Guiding Architectural Principles

All future work on MITRA MUST be evaluated against these rules:

1. **The Project is the central aggregate** around which other domains are organized.
2. **Every entity should be traceable** back to its originating project and engineering decisions.
3. **Knowledge generated during execution should become reusable** organizational knowledge.
4. **Every significant operation should support** RBAC, audit logging, and version history.
5. **AI features should consume engineering knowledge**, explain their recommendations, and require explicit user approval before affecting engineering data.
6. **Domains communicate through the project lifecycle**, not through direct module-to-module integration.
7. **The platform must remain deployment-flexible**, supporting local-first, on-premises, and cloud deployment models.

## Technology Principles

- NestJS
- React + Vite
- PostgreSQL
- MinIO
- Redis
- Docker
- On-premises deployment

## AI Principles

- Local AI first.
- No external sharing of engineering IP.
- Explainable AI.
- Human approval for engineering decisions.
- Knowledge grows from completed projects.

## Data Library

The Data Library contains the evolving technical knowledge of the project, including:

- Architecture documents
- Design decisions and ADRs
- Phase completion reports
- Research and analysis
- API specifications
- Module documentation
- Reference materials

The Constitution defines what MITRA should become.
The Data Library explains how MITRA is built and records what has been built.

## Current Status

### Completed

- AIOS release infrastructure
- Core architecture foundation
- Documentation framework
- Initial data library structure

### In Progress

- Industrial business modules
- Production validation
- Deployment hardening

### Planned

- Enterprise intelligence capabilities
- Predictive analytics
- Engineering Knowledge Operating System maturity

## Quality Gates

- Backend builds successfully.
- Frontend builds successfully.
- Database verified.
- End-to-end workflow validated.
- RBAC working.
- Audit logs operational.
- Backup and restore tested.

## Guiding Rule

Every feature or milestone should move MITRA closer to this vision while remaining aligned with the Constitution and the accumulated knowledge in the Data Library.
