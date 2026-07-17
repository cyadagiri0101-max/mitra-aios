#!/usr/bin/env python3
"""Audit architecture compliance across subsystems."""

import ast
import os
from pathlib import Path

SUBSYSTEMS = {
    'src/aios/agent/agent_manager.py': 'AgentManager',
    'src/aios/eos/runtime_engine.py': 'RuntimeEngine',
    'src/aios/eos/workflow_engine.py': 'WorkflowEngine',
    'src/aios/plugins/manager.py': 'PluginManager',
    'src/aios/llm/manager.py': 'LLMManager',
    'src/aios/embedding/manager.py': 'EmbeddingManager',
    'src/aios/memory/memory_manager.py': 'MemoryManager',
    'src/aios/api/websocket_manager.py': 'ConnectionManager',
    'src/aios/core/event_bus.py': 'EventBus',
}

REQUIRED_METHODS = {'initialize', 'validate', 'reload', 'shutdown', 'health', 'statistics'}

print("=" * 80)
print("ARCHITECTURE COMPLIANCE AUDIT")
print("=" * 80)
print()

for filepath, class_name in SUBSYSTEMS.items():
    full_path = Path(filepath)
    if not full_path.exists():
        print(f"❌ {class_name:30} NOT FOUND: {filepath}")
        continue

    with open(full_path) as f:
        content = f.read()

    try:
        tree = ast.parse(content)
        class_node = None
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef) and node.name == class_name:
                class_node = node
                break

        if class_node is None:
            print(f"❌ {class_name:30} CLASS NOT FOUND in {filepath}")
            continue

        methods = {n.name for n in class_node.body if isinstance(n, ast.FunctionDef)}
        found = methods & REQUIRED_METHODS
        missing = REQUIRED_METHODS - found

        status = "✅" if len(missing) == 0 else "⚠️ "
        print(f"{status} {class_name:30} {len(found)}/6 found, {len(missing)} missing: {', '.join(sorted(missing)) if missing else 'None'}")

        # Also check for common mistakes: bare except: pass
        if 'except Exception' in content and ': pass' in content:
            print(f"   ⚠️  Contains bare except: pass (error silencing)")

        # Check for shell=True
        if 'shell=True' in content:
            print(f"   ⚠️  Contains shell=True (injection risk)")

        # Check for os.path.join without validation
        if 'os.path.join' in content and 'relative_to' not in content:
            print(f"   ⚠️  Uses os.path.join without path traversal validation")

    except SyntaxError as e:
        print(f"❌ {class_name:30} SYNTAX ERROR: {e}")

print()
print("=" * 80)
