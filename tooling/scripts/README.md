# AIOS Automation Scripts

## Title
Automation Foundation - Repository Scanner, Registry Generation, State Management

## Purpose
Automated tooling to transform the AIOS repository from a document collection into an AI-native platform with comprehensive indexing, state management, and context loading.

## Status
Implementation

## Version
0.1.0

## Author
Platform Engineering

## Last Updated
2026-07-08

## References
- .ai/README.md
- .ai/AGENTS.md
- .ai/state/

## Overview

The automation layer provides comprehensive Python and PowerShell scripts that:

1. **Repository Scanner** - Recursively scan repository, classify files, detect issues
2. **Document Registry** - Extract metadata from all markdown documents
3. **Framework Registry** - Automatically detect frameworks, standards, templates
4. **State Generator** - Create and populate state files (project, framework, repository, session, task)
5. **Repository Health** - Generate health assessment and issues report
6. **Context Loader** - Load and organize context for agent execution
7. **Validators** - Validate repository structure, state integrity, index consistency

## Directory Structure

```
tooling/
├── scripts/
│   ├── repository-scanner/
│   │   ├── scan-repository.py              # Main scanner
│   │   ├── scan-repository.ps1             # PowerShell version
│   │   ├── generate-document-registry.py   # Document extractor
│   │   ├── generate-framework-registry.py  # Framework detector
│   │   └── generate-health-report.py       # Health assessor
│   ├── state-generator/
│   │   └── generate-state.py               # State file generator
│   ├── context-loader/
│   │   └── load-context.py                 # Context aggregator
│   ├── validate/
│   │   └── validate-repository.py          # Validation suite
│   ├── orchestrate.py                      # Master orchestrator
│   └── README.md                           # This file
```

## Quick Start

### Run All Automation

Execute the orchestrator to run all scripts in sequence:

```bash
# Python (recommended)
python3 tooling/scripts/orchestrate.py

# Or with explicit repository path
python3 tooling/scripts/orchestrate.py d:\Mitra3.0
```

### Run Individual Scripts

#### 1. Repository Scanner

Scan repository and generate index:

```bash
# Python
python3 tooling/scripts/repository-scanner/scan-repository.py [repo_path]

# Output: .ai/index/repository-index.json
```

**Output includes:**
- All directories and files
- File classifications (markdown, yaml, json, script, etc.)
- File metadata (size, modified date, checksum)
- References and links
- Duplicate files by hash
- Broken references
- Empty directories
- Orphan documents

#### 2. Document Registry

Extract metadata from all markdown documents:

```bash
# Python
python3 tooling/scripts/repository-scanner/generate-document-registry.py [repo_path]

# Output: .ai/index/document-registry.json
```

**Extracts:**
- Title, status, version, author
- Document category and tags
- Section structure
- File checksum
- Cross-document references
- Metadata indexed by version and author

#### 3. Framework Registry

Auto-detect frameworks, standards, templates:

```bash
# Python
python3 tooling/scripts/repository-scanner/generate-framework-registry.py [repo_path]

# Output: .ai/index/framework-registry.json
```

**Detects:**
- Framework definitions
- Components and capabilities
- Standards and governance documents
- Methodologies and processes
- Templates and scaffolds
- Knowledge base entries
- Report definitions

#### 4. State Generator

Create and populate all state files:

```bash
# Python
python3 tooling/scripts/state-generator/generate-state.py [repo_path]

# Output:
#   .ai/state/project.yaml
#   .ai/state/framework.yaml
#   .ai/state/repository.yaml
#   .ai/state/session.yaml
#   .ai/state/next-task.yaml
```

**Generates:**
- Project state with objectives, team, timeline
- Framework state with components, health, configuration
- Repository state with branches, code metrics, releases
- Session state with agent info, context, progress
- Next task state with requirements and timeline

#### 5. Repository Health Report

Generate health assessment:

```bash
# Python
python3 tooling/scripts/repository-scanner/generate-health-report.py [repo_path]

# Output: .ai/reports/repository-health.md
```

**Reports:**
- Overall health score (0-100)
- Structure validation
- Documentation completeness
- Consistency checks
- Integrity issues
- Recommendations

#### 6. Context Loader

Load all context into unified cache:

```bash
# Python
python3 tooling/scripts/context-loader/load-context.py [repo_path]

# Output: .ai/cache/context.json
```

**Loads:**
- All state files
- All indexes
- Knowledge base entries
- Calculates total size and token estimate

#### 7. Validation Scripts

Validate repository integrity:

```bash
# Python
python3 tooling/scripts/validate/validate-repository.py [repo_path]

# Output: .ai/reports/validation-results.json
```

**Validates:**
- Directory structure
- Required files
- YAML/JSON format
- Index integrity
- Cross-file references

## How AI Should Load Context

### For Agents

Agents should load context in this priority order:

1. **Load current state** from `.ai/state/[state_name].yaml`
2. **Load repository index** from `.ai/index/repository-index.json`
3. **Load task-specific index** from `.ai/index/[registry].json`
4. **Load knowledge base** from `.ai/knowledge/[kb_name].json`
5. **Load cached context** from `.ai/cache/context.json` (if available)

### Token Budget Management

```
Total budget = model_limit - reserved
Reserved = system_prompt + completion_space
Available = total_budget - reserved

Load in order of relevance:
1. Current task state
2. Project state
3. Repository index summary
4. Specific framework knowledge
5. Architecture decisions
6. Lessons learned
```

### Example Context Loading

```python
# Load context for a task
context = {
    "task": load_yaml(".ai/state/next-task.yaml"),
    "project": load_yaml(".ai/state/project.yaml"),
    "repository": load_json(".ai/index/repository-index.json")["summary"],
    "framework": load_json(".ai/knowledge/framework.json"),
}

# Calculate available tokens
available = 8000 - len(system_prompt) - 1000
```

## How to Regenerate Indexes

### Full Regeneration

```bash
# Regenerate all indexes in order
python3 tooling/scripts/repository-scanner/scan-repository.py
python3 tooling/scripts/repository-scanner/generate-document-registry.py
python3 tooling/scripts/repository-scanner/generate-framework-registry.py
python3 tooling/scripts/state-generator/generate-state.py
python3 tooling/scripts/repository-scanner/generate-health-report.py
python3 tooling/scripts/context-loader/load-context.py
```

### Partial Regeneration

```bash
# Regenerate only document registry
python3 tooling/scripts/repository-scanner/generate-document-registry.py

# Regenerate only health report
python3 tooling/scripts/repository-scanner/generate-health-report.py

# Regenerate only context cache
python3 tooling/scripts/context-loader/load-context.py
```

## How to Regenerate State

```bash
# Regenerate all state files
python3 tooling/scripts/state-generator/generate-state.py

# Individual state files will be created/updated:
# .ai/state/project.yaml
# .ai/state/framework.yaml
# .ai/state/repository.yaml
# .ai/state/session.yaml
# .ai/state/next-task.yaml
```

## How to Validate

### Full Validation

```bash
# Run complete validation suite
python3 tooling/scripts/validate/validate-repository.py

# View results
cat .ai/reports/validation-results.json
```

### Validation Checks

Validates:
- ✓ All required directories exist
- ✓ All required core files exist
- ✓ YAML files are valid syntax
- ✓ JSON files are valid syntax
- ✓ Schema versions present
- ✓ Index files reference existing files
- ✓ State files are readable

## Generated Files

### Index Files (JSON)

**Location:** `.ai/index/`

- `repository-index.json` - Complete file/directory listing
- `document-registry.json` - Document metadata registry
- `framework-registry.json` - Framework and component registry
- `prompt-registry.json` - Prompt template registry
- `engagement-registry.json` - Engagement tracking registry

### State Files (YAML)

**Location:** `.ai/state/`

- `project.yaml` - Project state and objectives
- `framework.yaml` - Framework configuration and health
- `repository.yaml` - Repository and codebase state
- `session.yaml` - Current session state and context
- `next-task.yaml` - Next task definition and requirements

### Cache Files (JSON)

**Location:** `.ai/cache/`

- `context.json` - Unified context cache (all state + indexes)
- `framework.cache.json` - Framework knowledge cache
- `repository.cache.json` - Repository index cache
- `knowledge.cache.json` - Knowledge base cache

### Report Files (Markdown/JSON)

**Location:** `.ai/reports/`

- `repository-health.md` - Health assessment report
- `validation-results.json` - Validation check results
- `automation-log.json` - Automation execution log

## Troubleshooting

### Python Not Found

```bash
# Ensure Python 3.8+ is installed
python3 --version

# Use explicit path if needed
/usr/bin/python3 tooling/scripts/orchestrate.py
```

### YAML Library Missing

```bash
# Install PyYAML
pip install pyyaml

# Or
pip3 install pyyaml
```

### Permission Denied

```bash
# Make scripts executable (Linux/Mac)
chmod +x tooling/scripts/**/*.py
chmod +x tooling/scripts/**/*.ps1

# Run with python explicitly (Windows)
python3 tooling/scripts/orchestrate.py
```

### Files Not Generated

1. Check that repository root is correct
2. Verify `.ai/` directory exists
3. Check output directory permissions
4. Review error messages in console output
5. Run validation to identify issues

## Integration with Agents

### Agent Initialization

When an agent starts:

1. Load `.ai/state/project.yaml` for project context
2. Load current mode configuration
3. Load relevant registries based on task
4. Load knowledge bases needed for task
5. Check `.ai/reports/repository-health.md` for blockers

### Agent Task Execution

During task execution:

1. Update `.ai/state/session.yaml` with current activity
2. Reference `.ai/index/repository-index.json` for file locations
3. Access `.ai/knowledge/` for domain knowledge
4. Check `.ai/reports/` for validation results
5. Query context from `.ai/cache/context.json`

### Agent Completion

When agent completes:

1. Update `.ai/state/next-task.yaml` with next task
2. Record results in `.ai/state/session.yaml`
3. Generate validation report
4. Trigger repository health check
5. Update cache

## Performance Metrics

Typical execution times (on standard hardware):

- Repository Scanner: 2-5 seconds
- Document Registry: 1-2 seconds
- Framework Registry: 0.5-1 second
- State Generator: 0.2-0.5 seconds
- Health Report: 1-2 seconds
- Context Loader: 0.2-0.5 seconds
- Validator: 0.5-1 second
- **Total Orchestration: 5-15 seconds**

## Future Enhancements

- [ ] Incremental update support (only changed files)
- [ ] Real-time file monitoring
- [ ] Performance profiling
- [ ] Caching optimization
- [ ] Parallel processing
- [ ] Advanced analytics
- [ ] Integration webhooks

