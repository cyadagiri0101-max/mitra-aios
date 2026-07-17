---
id: AIOS-RC1.1-008
title: AIOS RC1.1 CLI Design
version: 1.1.0
status: APPROVED
created: 2026-07-09
---

# AIOS RC1.1 CLI Design

## Current CLI

```
python -m aios [command] --repo-root PATH --config PATH --log-level LEVEL --version
```

Commands: `refresh`, `scan`, `all`, `validate`, `context`, `report`, `doctor`

### Problems
- `scan`, `refresh`, `all` all do the same thing
- No `--help` per command
- No `--verbose`/`--quiet`
- Exit code always 0
- No subcommand structure
- No `sync`, `resume`, `state`, `cache` commands

---

## Target CLI

```
aios <command> [options]
```

### Command Structure

```
aios scan          Scan repository, generate index
aios sync          Full synchronization (scan + index + state + context)
aios validate      Validate state, index, and repository integrity
aios doctor        Diagnose issues and recommend fixes
aios resume        Resume from last checkpoint (zero conversation history)
aios report        Generate health/verification reports
aios state         State management subcommands
aios cache         Cache management subcommands
aios context       Context loading subcommands
aios config        Configuration management
aios version       Show version information
```

### Subcommands

```
aios state sync        Regenerate state from repository evidence
aios state validate    Check state vs repository, report drift
aios state diff        Show changes since last sync
aios state history     Show state change timeline

aios cache clear       Clear all cached context
aios cache show        Show current cache contents and token usage
aios cache warm        Pre-load cache for current mode

aios context load      Load context for a specific mode
aios context show      Show loaded context and token budget
aios context modes     List available context modes
```

### Global Options

```
--repo-root PATH     Repository root (default: current directory)
--config PATH        Configuration file path
--log-level LEVEL    DEBUG | INFO | WARNING | ERROR
--verbose            Shorthand for --log-level DEBUG
--quiet              Suppress non-error output
--output FORMAT      json | yaml | text (default: text)
--no-color           Disable colored output
--version            Show version
--help               Show help
```

### Command Details

#### `aios scan`
```
Usage: aios scan [options]

Scan repository and generate/update indexes.

Options:
  --incremental      Only scan changed files (faster)
  --full             Force full rescan
  --skip-hash        Skip file hashing (faster, no duplicate detection)

Output:
  .ai/index/repository-index.json
  .ai/index/document-registry.json
  .ai/index/framework-registry.json
  .ai/index/consolidated-index.json

Events emitted: REPOSITORY_SCANNED, INDEX_UPDATED
```

#### `aios sync`
```
Usage: aios sync [options]

Full synchronization: scan → index → state → context → validate.

Options:
  --quick            Skip validation step
  --force            Regenerate everything, ignore cache

Events emitted: All events in sequence
```

#### `aios validate`
```
Usage: aios validate [options]

Validate repository structure, state integrity, and index consistency.

Options:
  --strict           Fail on warnings too
  --fix              Auto-fix detected issues

Checks:
  - Directory structure
  - State file consistency
  - Index freshness
  - Cross-file integrity
  - State drift detection
```

#### `aios doctor`
```
Usage: aios doctor [options]

Diagnose repository issues and recommend fixes.

Output:
  - Missing directories
  - Stale state files
  - Broken references
  - Orphan documents
  - Duplicate files
  - Empty directories
  - Recommended fix commands
```

#### `aios resume`
```
Usage: aios resume [options]

Resume from last checkpoint with zero conversation history.

Options:
  --checkpoint ID    Resume from specific checkpoint
  --list             List available checkpoints
  --mode MODE        Override context mode

Output:
  Recovery payload (~2,100 tokens):
  - Project status
  - Current task
  - Blockers
  - Next action
  - Loaded context files
```

#### `aios report`
```
Usage: aios report [type] [options]

Generate reports.

Types:
  health             Repository health report
  validation         Validation results report
  state              State synchronization report

Options:
  --output PATH      Output file path
  --format FORMAT    markdown | json | yaml
```

#### `aios state`
```
Usage: aios state <subcommand> [options]

Subcommands:
  sync               Regenerate state from evidence
  validate           Check state drift
  diff               Show changes since last sync
  history            Show state change timeline
  show [file]        Display state file contents
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Runtime error |
| 2 | Invalid arguments |
| 3 | Validation failed (drift detected) |
| 4 | Partial success (some plugins failed) |
| 130 | Interrupted by user |

### Output Format

Text mode (default):
```
$ aios sync
[SCAN] Scanning repository... 1,464 files in 437 directories
[INDEX] Generated 4 indexes
[STATE] State synchronized (3 fields updated)
[CONTEXT] Loaded 8 files (3,200 tokens / 16,000 budget)
[VALIDATE] 12/12 checks passed
[OK] Synchronization complete
```

JSON mode (`--output json`):
```json
{
  "status": "ok",
  "scan": {"files": 1464, "directories": 437},
  "index": {"generated": 4},
  "state": {"fieldsUpdated": 3},
  "context": {"files": 8, "tokens": 3200},
  "validate": {"passed": 12, "failed": 0}
}
```

---

## Implementation

```python
def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="aios", description="AI Operating System")
    parser.add_argument("--repo-root", default=os.getcwd())
    parser.add_argument("--config", default=None)
    parser.add_argument("--log-level", choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--quiet", action="store_true")
    parser.add_argument("--output", choices=["json", "yaml", "text"], default="text")
    parser.add_argument("--version", action="version", version=f"AIOS {__version__}")

    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("scan", help="Scan repository")
    subparsers.add_parser("sync", help="Full synchronization")
    subparsers.add_parser("validate", help="Validate integrity")
    subparsers.add_parser("doctor", help="Diagnose issues")
    subparsers.add_parser("resume", help="Resume from checkpoint")
    subparsers.add_parser("report", help="Generate reports")

    state_parser = subparsers.add_parser("state", help="State management")
    state_sub = state_parser.add_subparsers(dest="state_command")
    state_sub.add_parser("sync")
    state_sub.add_parser("validate")
    state_sub.add_parser("diff")
    state_sub.add_parser("history")
    state_sub.add_parser("show")

    # ... cache, context subparsers

    return parser
```

---

## File Layout

```
aios/cli/
├── __init__.py
├── cli.py             ← build_parser(), main()
├── commands/
│   ├── scan.py        ← scan command handler
│   ├── sync.py        ← sync command handler
│   ├── validate.py    ← validate command handler
│   ├── doctor.py      ← doctor command handler
│   ├── resume.py      ← resume command handler
│   ├── report.py      ← report command handler
│   └── state.py       ← state subcommand handler
└── output.py          ← Text/JSON/YAML output formatters
```

---

**End of CLI Design**
