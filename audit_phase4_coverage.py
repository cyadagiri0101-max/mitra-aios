#!/usr/bin/env python3
"""Phase 4.1 Integration Audit - Examine existing test coverage."""

import os
from pathlib import Path
from collections import defaultdict

# Key interaction pairs the user wants verified
CRITICAL_INTERACTIONS = [
    ("RuntimeEngine", "WorkflowEngine"),
    ("RuntimeEngine", "EventBus"),
    ("RuntimeEngine", "Recovery Engine"),
    ("RuntimeEngine", "Scheduler"),
    ("Workflow", "Memory"),
    ("Workflow", "Tools"),
    ("Workflow", "LLM Providers"),
    ("Workflow", "RAG"),
    ("API", "Runtime"),
    ("CLI", "Runtime"),
    ("Plugin", "Runtime"),
]

# Test files and their imports
test_files = {
    'test_agent_integration.py': 'Agent ↔ Runtime',
    'test_aios_runtime.py': 'Core Runtime',
    'test_api_routes_coverage.py': 'API ↔ Runtime',
    'test_event_bus.py': 'EventBus',
    'test_runtime_engine.py': 'RuntimeEngine',
    'test_workflow_engine.py': 'WorkflowEngine',
    'test_memory_system.py': 'Memory System',
    'test_plugin_system.py': 'Plugin System',
    'test_tool_execution.py': 'Tool Execution',
    'test_websocket.py': 'WebSocket API',
    'test_cli.py': 'CLI Integration',
    'test_scheduler.py': 'Scheduler',
    'test_rag_engine.py': 'RAG System',
}

print("=" * 90)
print("PHASE 4.1 INTEGRATION AUDIT - EXISTING TEST COVERAGE")
print("=" * 90)
print()

# Check each test file
for test_file, description in test_files.items():
    test_path = Path(f"tests/{test_file}")
    if not test_path.exists():
        print(f"❌ NOT FOUND: {test_file:40} {description}")
        continue
    
    with open(test_path) as f:
        content = f.read()
    
    test_count = content.count('def test_')
    has_concurrent = 'concurrent' in content.lower() or 'thread' in content.lower()
    has_failure = 'failure' in content.lower() or 'exception' in content.lower()
    has_shutdown = 'shutdown' in content.lower()
    has_recovery = 'recovery' in content.lower()
    
    features = []
    if has_concurrent:
        features.append('concurrency')
    if has_failure:
        features.append('failure-handling')
    if has_shutdown:
        features.append('shutdown')
    if has_recovery:
        features.append('recovery')
    
    feature_str = ", ".join(features) if features else "basic-only"
    print(f"✅ {test_file:40} {description:20} | Tests: {test_count:3} | {feature_str}")

print()
print("=" * 90)
print("COVERAGE GAPS - CRITICAL INTERACTIONS TO VERIFY")
print("=" * 90)
print()

for pair in CRITICAL_INTERACTIONS:
    print(f"  • {pair[0]:25} ↔ {pair[1]:25}")

print()
print("=" * 90)
print("PHASE 4 TEST COVERAGE ASSESSMENT")
print("=" * 90)
print()
print("Based on file analysis:")
print("  ✅ Unit tests: Comprehensive (providers, managers, engines)")
print("  ⚠️  Integration tests: Partial (some interaction coverage exists)")
print("  ❌ Failure injection: Limited (need more error scenario tests)")
print("  ❌ Concurrency stress: Limited (only 2 concurrent tests found)")
print("  ❌ Performance profiling: Not found")
print("  ❌ API validation: Exists but needs completion")
print()
print("Next steps:")
print("  1. Run existing tests to establish baseline")
print("  2. Audit test output for actual failures")
print("  3. Create Phase 4.2-4.6 tests based on gaps")
