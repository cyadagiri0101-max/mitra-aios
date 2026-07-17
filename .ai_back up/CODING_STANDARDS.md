# CODING_STANDARDS.md

## Title
Coding Standards and Conventions

## Purpose
Provides baseline conventions for implementation quality, readability, and maintainability across the repository.

## Status
Active

## Version
0.1.0

## Author
Platform Engineering

## Last Updated
2026-07-09

## General Rules
- Favor clarity over cleverness.
- Keep logic localized and reusable.
- Avoid duplication of workflows, schemas, prompts, or state management logic.
- Prefer composition and explicit interfaces over inheritance-heavy design.

## Language Guidance
- Python code should remain readable, typed where practical, and consistent with repository patterns.
- Scripts and automation should be deterministic, idempotent, and safe to rerun.
- Documentation should be concise, factual, and aligned with the implementation.

## Quality Expectations
- Add or update tests for changed behavior when practical.
- Validate changes with targeted checks rather than broad repository sweeps.
- Preserve existing architectural boundaries and dependencies.
