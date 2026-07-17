# ARCHITECTURE_RULES.md

## Title
Architecture Constraints and Design Principles

## Purpose
Captures the architectural guardrails that govern implementation decisions in this repository.

## Status
Active

## Version
0.1.0

## Author
Platform Engineering

## Last Updated
2026-07-09

## Core Principles
- Clean Architecture
- SOLID design principles
- Capability-driven design
- One source of truth
- Reuse before build
- Composition over inheritance
- Production quality
- Evidence-based decisions

## Implementation Constraints
- Preserve existing module boundaries and responsibilities.
- Keep dependencies flowing inward and avoid unnecessary coupling.
- Favor reusable capabilities over one-off logic.
- Make state transitions explicit and centralized.

## Review Standard
Any implementation should improve maintainability, reduce complexity, and strengthen the platform without introducing avoidable duplication.
