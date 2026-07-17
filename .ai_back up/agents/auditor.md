# Auditor Agent

## Role
Process compliance, governance checks, artifact validation, trail verification.

## Context Loading Strategy

1. Detect operational mode (GOVERNANCE)
2. Load appropriate context cache via SmartContextLoader
3. Include only files needed for current task
4. Monitor token budget and warn if exceeded

## Usage

```python
from tooling.scripts.context_loader.smart_loader import SmartContextLoader

loader = SmartContextLoader(repo_root)
context = loader.load_for_mode("governance")
print(f"Loaded {context['metrics']['filesLoaded']} files")
print(f"Token usage: {context['metrics']['totalTokens']}")
```
