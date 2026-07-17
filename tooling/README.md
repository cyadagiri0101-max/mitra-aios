# Tooling Layer

## Title
Tooling Layer - Tools and Automation

## Purpose
Provides tools, automation, and utility scripts that support AIOS operations.

## Status
Scaffolding

## Version
0.1.0

## Author
Platform Engineering

## Last Updated
2026-07-08

## References
- AIOS-001-Layer-Architecture.md

## Content Sections

### Overview
- Tooling layer purpose
- Scope and responsibilities
- Tool categories
- Integration approach

### Tool Categories
- Development tools
- Build and deployment tools
- Monitoring and diagnostics tools
- Administration tools
- Analysis tools

### Tool Documentation
- Tool purposes
- Tool usage
- Configuration options
- Best practices

### Tool Integration
- Integration procedures
- Dependency management
- Version management
- Compatibility matrix

### Tool Development
- Development guidelines
- Quality standards
- Testing requirements
- Documentation requirements

### Automation and Scripting
- Automation frameworks
- Scripting guidelines
- Error handling
- Logging and monitoring

### Tool Maintenance
- Update procedures
- Deprecation procedures
- Support procedures
- Lifecycle management

## EOS Migration Tool

The EOS migration utility is available at [tooling/scripts/eos-migration.ps1](tooling/scripts/eos-migration.ps1).

### Usage

Verify the migration without mutating the repository:

```powershell
powershell -ExecutionPolicy Bypass -File .\tooling\scripts\eos-migration.ps1 -Verify
```

```powershell
powershell -ExecutionPolicy Bypass -File .\tooling\scripts\eos-migration.ps1 --verify
```

Perform the migration and rename the original folders to backup names:

```powershell
powershell -ExecutionPolicy Bypass -File .\tooling\scripts\eos-migration.ps1 -Commit
```

```powershell
powershell -ExecutionPolicy Bypass -File .\tooling\scripts\eos-migration.ps1 --commit
```

Restore previously renamed backup folders:

```powershell
powershell -ExecutionPolicy Bypass -File .\tooling\scripts\eos-migration.ps1 -Rollback
```

```powershell
powershell -ExecutionPolicy Bypass -File .\tooling\scripts\eos-migration.ps1 --rollback
```

### Notes

- The script uses the canonical [.ai](.ai) directory as the destination.
- It writes reports to [.ai/verification/eos_migration_report.json](.ai/verification/eos_migration_report.json) and [.ai/verification/eos_migration_report.md](.ai/verification/eos_migration_report.md).
- The script does not delete anything in verify mode and preserves backup folders in commit mode.

