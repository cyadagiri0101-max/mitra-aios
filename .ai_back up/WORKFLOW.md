# WORKFLOW.md

## Title
Execution Workflow for Engineering Tasks

## Purpose
Standardizes how work is discovered, implemented, validated, and reported within the repository.

## Status
Active

## Version
0.1.0

## Author
Platform Engineering

## Last Updated
2026-07-09

## Workflow
1. Read the governing files in .ai, starting with AGENTS.md.
2. Load the minimum required repository context from .ai/state and .ai/runtime.
3. Inspect only the files directly related to the current task.
4. Implement the smallest change that satisfies the requirement.
5. Validate with targeted tests or checks relevant to the modified implementation.
6. Report findings using the repository’s standard response structure.

## Guardrails
- Do not expand scope beyond the requested task.
- Do not perform unrelated refactoring.
- Do not modify project or runtime state without explicit approval.
- Do not claim acceptance without explicit user confirmation.
