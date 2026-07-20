# MITRA AIOS CLI Reference

## Global Options

```
aios [OPTIONS] COMMAND [ARGS]
```

| Option | Short | Description |
|--------|-------|-------------|
| `--root` | `-r` | Repository root directory |
| `--mode` | `-m` | Operating mode |
| `--log-level` | `-l` | Log level (DEBUG, INFO, WARNING, ERROR) |
| `--version` | | Show version and exit |
| `--help` | | Show help and exit |

---

## Commands

### aios scan
Scan the repository and produce a scan report.

```bash
aios scan [OPTIONS]
```

| Option | Description |
|--------|-------------|
| `--verbose` | Show detailed output |
| `--json` | Output as JSON |

**Example:**
```bash
aios scan --verbose
aios scan --json > scan_report.json
```

---

### aios index
Build file registry, dependency graph, and search index.

```bash
aios index [OPTIONS]
```

| Option | Description |
|--------|-------------|
| `--verbose` | Show detailed output |
| `--json` | Output as JSON |

**Requires:** `scan` to be run first.

---

### aios state
Manage evidence-derived state.

```bash
aios state ACTION [OPTIONS]
```

**Actions:**

| Action | Description |
|--------|-------------|
| `generate` | Generate state files |
| `sync` | Synchronize state with evidence |
| `validate` | Validate state files |
| `diff` | Show changes since last sync |
| `history` | Show state change timeline |

**Example:**
```bash
aios state generate
aios state validate --verbose
aios state diff
```

---

### aios context
Load context for a given mode profile.

```bash
aios context MODE [OPTIONS]
```

**Modes:** `recovery`, `discovery`, `architecture`, `implementation`, `validation`, `review`, `governance`, `release`

| Option | Description |
|--------|-------------|
| `--verbose` | Show detailed output |
| `--json` | Output as JSON |

**Example:**
```bash
aios context implementation --verbose
```

---

### aios checkpoint
Manage session checkpoints.

```bash
aios checkpoint ACTION [OPTIONS]
```

**Actions:**

| Action | Description |
|--------|-------------|
| `create` | Create a new checkpoint |
| `list` | List all checkpoints |
| `resume` | Resume from a checkpoint |
| `prune` | Remove old checkpoints |

**Example:**
```bash
aios checkpoint create --name "before-refactor"
aios checkpoint list
aios checkpoint resume <checkpoint_id>
```

---

### aios run
Execute the full autonomous workflow.

```bash
aios run [OPTIONS]
```

| Option | Description |
|--------|-------------|
| `--mode` | Operating mode (default: implementation) |
| `--dry-run` | Show what would be done |
| `--profile` | Execution profile |
| `--json` | Output as JSON |

**Example:**
```bash
aios run --mode implementation
aios run --dry-run --json
```

---

### aios execute
Run the executor with a plan.

```bash
aios execute [OPTIONS]
```

| Option | Description |
|--------|-------------|
| `--dry-run` | Show what would be done |
| `--profile` | Execution profile |
| `--json` | Output as JSON |

---

### aios report
Generate reports.

```bash
aios report TYPE [OPTIONS]
```

**Types:** `system`, `execution`, `metrics`, `health`, `all`

**Example:**
```bash
aios report health --verbose
aios report all --json
```

---

### aios metrics
Collect and display runtime metrics.

```bash
aios metrics [OPTIONS]
```

| Option | Description |
|--------|-------------|
| `--verbose` | Show detailed output |
| `--json` | Output as JSON |

---

### aios memory
Manage long-term and short-term memories.

```bash
aios memory ACTION [OPTIONS]
```

**Actions:**

| Action | Description |
|--------|-------------|
| `store` | Store a memory |
| `recall` | Recall memories |
| `search` | Search memories |
| `snapshot` | Create memory snapshot |
| `compress` | Compress old memories |
| `prune` | Remove old memories |

**Example:**
```bash
aios memory store "Important fact" --type semantic --importance 0.9
aios memory recall "fact" --limit 5
aios memory search "user preferences" --method hybrid
```

---

### aios decision
Evaluate execution paths and make decisions.

```bash
aios decision [OPTIONS]
```

| Option | Description |
|--------|-------------|
| `--verbose` | Show detailed output |
| `--profile` | Execution profile |
| `--json` | Output as JSON |

---

### aios validate
Validate state files against repository evidence.

```bash
aios validate [OPTIONS]
```

| Option | Description |
|--------|-------------|
| `--verbose` | Show detailed output |
| `--json` | Output as JSON |

---

### aios health
Check system health status.

```bash
aios health [OPTIONS]
```

| Option | Description |
|--------|-------------|
| `--verbose` | Show detailed output |
| `--json` | Output as JSON |

**Example:**
```bash
aios health --verbose
```

---

### aios doctor
Run comprehensive system diagnostics.

```bash
aios doctor [OPTIONS]
```

| Option | Description |
|--------|-------------|
| `--verbose` | Show detailed output |
| `--json` | Output as JSON |

---

### aios recover
Restore from checkpoint or snapshot.

```bash
aios recover [SNAPSHOT_ID] [OPTIONS]
```

| Option | Description |
|--------|-------------|
| `--list` | List available snapshots |

**Example:**
```bash
aios recover --list
aios recover <snapshot_id>
```

---

### aios chat
Interactive conversation with AI agents.

```bash
aios chat MESSAGE [OPTIONS]
```

| Option | Description |
|--------|-------------|
| `--agent` | Agent name to chat with |
| `--model` | LLM model to use |
| `--json` | Output as JSON |

**Example:**
```bash
aios chat "Hello, how can you help me?"
aios chat "Research quantum computing" --agent researcher
```

---

### aios workflow
Manage multi-agent workflows.

```bash
aios workflow ACTION [OPTIONS]
```

**Actions:**

| Action | Description |
|--------|-------------|
| `list` | List workflows |
| `start` | Start a workflow |
| `status` | Check workflow status |
| `cancel` | Cancel a workflow |

**Example:**
```bash
aios workflow list
aios workflow start "Build a REST API"
aios workflow status <workflow_id>
```

---

### aios tools
List, inspect, and run registered tools.

```bash
aios tools ACTION [OPTIONS]
```

**Actions:**

| Action | Description |
|--------|-------------|
| `list` | List all tools |
| `inspect` | Inspect a tool |
| `run` | Run a tool |
| `permissions` | Manage tool permissions |

**Example:**
```bash
aios tools list
aios tools inspect search
aios tools run search --query "AI news"
```

---

### aios plugins
Manage AIOS plugins.

```bash
aios plugins ACTION [OPTIONS]
```

**Actions:**

| Action | Description |
|--------|-------------|
| `list` | List plugins |
| `install` | Install a plugin |
| `uninstall` | Uninstall a plugin |
| `enable` | Enable a plugin |
| `disable` | Disable a plugin |
| `info` | Get plugin info |

**Example:**
```bash
aios plugins list
aios plugins install my-plugin
aios plugins enable my-plugin
```

---

### aios agent
Manage AI agents.

```bash
aios agent ACTION [OPTIONS]
```

**Actions:**

| Action | Description |
|--------|-------------|
| `list` | List agents |
| `create` | Create an agent |
| `status` | Check agent status |
| `stop` | Stop an agent |
| `info` | Get agent info |

**Example:**
```bash
aios agent list
aios agent create --name researcher --role "Research specialist"
aios agent status researcher
```

---

### aios config
View and manage AIOS configuration.

```bash
aios config ACTION [OPTIONS]
```

**Actions:**

| Action | Description |
|--------|-------------|
| `show` | Show current config |
| `get` | Get a config value |
| `set` | Set a config value |
| `reset` | Reset config to defaults |
| `validate` | Validate configuration |

**Example:**
```bash
aios config show
aios config get llm.provider
aios config set llm.provider openai
aios config validate
```

---

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Configuration error |
| 4 | Runtime error |
