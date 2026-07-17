#!/usr/bin/env python3
"""
AIOS Context Loader
Load context from state, index, and knowledge layers into a unified cache.
"""

import os
import json
from pathlib import Path
from datetime import datetime

# Try to import yaml, but fallback if not available
try:
    import yaml
except ImportError:
    yaml = None

class ContextLoader:
    """Load and organize context for agent execution."""
    
    def __init__(self, repo_root):
        self.repo_root = Path(repo_root).resolve()
        self.context = {
            "schemaVersion": "0.1.0",
            "generatedAt": datetime.now().isoformat(),
            "status": "loaded",
            "repositoryRoot": str(self.repo_root),
            "state": {},
            "indexes": {},
            "knowledge": {},
            "metadata": {
                "loadedComponents": [],
                "totalSize": 0,
                "tokenEstimate": 0
            }
        }
    
    def load(self):
        """Load all context components."""
        print("[CONTEXT] Starting context loading")
        
        self._load_state()
        self._load_indexes()
        self._load_knowledge()
        self._calculate_metrics()
        
        print("[CONTEXT] Context loading complete")
        return self.context
    
    def _load_state(self):
        """Load state files."""
        state_dir = self.repo_root / ".ai" / "state"
        
        if state_dir.exists():
            # Try YAML first, fallback to JSON
            for yaml_file in state_dir.glob("*.yaml"):
                state_name = yaml_file.stem
                try:
                    if yaml:
                        with open(yaml_file, 'r', encoding='utf-8') as f:
                            data = yaml.safe_load(f)
                    else:
                        # Try loading as JSON
                        json_file = yaml_file.parent / f"{yaml_file.stem}.json"
                        if json_file.exists():
                            with open(json_file, 'r', encoding='utf-8') as f:
                                data = json.load(f)
                        else:
                            continue
                    
                    self.context["state"][state_name] = data
                    self.context["metadata"]["loadedComponents"].append(f"state:{state_name}")
                    print(f"[LOAD] State: {state_name}")
                except Exception as e:
                    print(f"[ERROR] Loading state {state_name}: {e}")
    
    def _load_indexes(self):
        """Load index files."""
        index_dir = self.repo_root / ".ai" / "index"
        
        if index_dir.exists():
            for json_file in index_dir.glob("*.json"):
                index_name = json_file.stem
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        self.context["indexes"][index_name] = data
                        self.context["metadata"]["loadedComponents"].append(f"index:{index_name}")
                        print(f"[LOAD] Index: {index_name}")
                except Exception as e:
                    print(f"[ERROR] Loading index {index_name}: {e}")
    
    def _load_knowledge(self):
        """Load knowledge base files."""
        knowledge_dir = self.repo_root / ".ai" / "knowledge"
        
        if knowledge_dir.exists():
            for json_file in knowledge_dir.glob("*.json"):
                kb_name = json_file.stem
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        self.context["knowledge"][kb_name] = data
                        self.context["metadata"]["loadedComponents"].append(f"knowledge:{kb_name}")
                        print(f"[LOAD] Knowledge: {kb_name}")
                except Exception as e:
                    print(f"[ERROR] Loading knowledge {kb_name}: {e}")
    
    def _calculate_metrics(self):
        """Calculate context metrics."""
        # Estimate size
        json_str = json.dumps(self.context)
        self.context["metadata"]["totalSize"] = len(json_str.encode('utf-8'))
        
        # Rough token estimation (1 token ≈ 4 chars)
        self.context["metadata"]["tokenEstimate"] = len(json_str) // 4
        
        print(f"[METRICS] Total size: {self.context['metadata']['totalSize']} bytes")
        print(f"[METRICS] Token estimate: {self.context['metadata']['tokenEstimate']} tokens")
    
    def save(self, output_path):
        """Save context cache."""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.context, f, indent=2)
        
        print(f"[SAVE] Context cache saved to {output_path}")
        return str(output_path)
    
    def get_project_context(self):
        """Get project-specific context."""
        project_state = self.context["state"].get("project", {})
        return {
            "project": project_state.get("project", {}),
            "objectives": project_state.get("objectives", {}),
            "state": project_state.get("state", {})
        }
    
    def get_repository_context(self):
        """Get repository context."""
        return {
            "index": self.context["indexes"].get("repository-index", {}),
            "registry": self.context["indexes"].get("document-registry", {}),
            "state": self.context["state"].get("repository", {})
        }
    
    def get_framework_context(self):
        """Get framework context."""
        return {
            "registry": self.context["indexes"].get("framework-registry", {}),
            "knowledge": self.context["knowledge"].get("framework", {}),
            "state": self.context["state"].get("framework", {})
        }

def main():
    """Main entry point."""
    import sys
    
    repo_root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    output_path = os.path.join(repo_root, ".ai", "cache", "context.json")
    
    loader = ContextLoader(repo_root)
    context = loader.load()
    loader.save(output_path)
    
    print("[SUCCESS] Context loading complete")
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())
