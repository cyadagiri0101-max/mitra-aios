# AUTHORITY.md

## Title
Repository Authority and Approval Model

## Purpose
Defines who may make changes, approve execution, and alter repository state within the Engineering Intelligence Platform.

## Status
Active

## Version
0.1.0

## Author
Platform Engineering

## Last Updated
2026-07-09

## Authority Model
- The repository is the source of truth for implementation scope, task lifecycle, and dependency order.
- The user retains authority for priorities, approvals, releases, and repository mutations.
- The engineering agent may inspect code, implement requested work, add or update tests, and perform targeted validation.

## Restricted Actions
The engineering agent must not autonomously:
- archive or delete repository content
- rename or restructure folders
- update roadmap, changelog, or version numbers
- modify .ai/state content or runtime state
- perform release activities

## Approval Expectations
- Changes that affect architecture, interfaces, or persistence must be reviewed against repository intent.
- Any mutation that changes repository structure or state requires explicit user approval.
- Validation results are evidence for review, not acceptance.
