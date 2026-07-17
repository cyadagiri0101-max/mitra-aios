#!/usr/bin/env python3
"""
AIOS Validation Scripts
Validate repository structure, state integrity, and index consistency.
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

class RepositoryValidator:
    """Validate repository structure and integrity."""
    
    def __init__(self, repo_root):
        self.repo_root = Path(repo_root).resolve()
        self.validation_results = {
            "timestamp": datetime.now().isoformat(),
            "repository": str(self.repo_root),
            "results": {
                "structure": {"passed": False, "errors": [], "warnings": []},
                "state": {"passed": False, "errors": [], "warnings": []},
                "index": {"passed": False, "errors": [], "warnings": []},
                "integrity": {"passed": False, "errors": [], "warnings": []}
            },
            "summary": {
                "totalChecks": 0,
                "passedChecks": 0,
                "failedChecks": 0,
                "warnings": 0
            }
        }
    
    def validate_all(self):
        """Run all validation checks."""
        print("[VALIDATE] Starting repository validation")
        
        self.validate_structure()
        self.validate_state()
        self.validate_index()
        self.validate_integrity()
        
        self._calculate_summary()
        
        return self.validation_results
    
    def validate_structure(self):
        """Validate directory structure."""
        print("[VALIDATE] Checking structure...")
        results = self.validation_results["results"]["structure"]
        
        required_dirs = [
            ".ai", ".ai/agents", ".ai/modes", ".ai/state", ".ai/index",
            ".ai/knowledge", ".ai/routing", ".ai/prompts", ".ai/reports",
            ".ai/cache", ".ai/sessions", ".ai/config",
            "architecture", "framework", "knowledge", "verification",
            "tooling", "engagements", "reports", "releases"
        ]
        
        for dir_name in required_dirs:
            dir_path = self.repo_root / dir_name
            if not dir_path.exists():
                results["errors"].append(f"Missing directory: {dir_name}")
            else:
                self.validation_results["summary"]["totalChecks"] += 1
                self.validation_results["summary"]["passedChecks"] += 1
        
        # Check for required files in .ai
        required_files = [
            ".ai/README.md", ".ai/AGENTS.md", ".ai/AGENT_MANIFEST.md",
            ".ai/MODEL_ROUTING.md", ".ai/SESSION_RECOVERY.md",
            ".ai/CONTEXT_LOADING.md", ".ai/ROADMAP.md", ".ai/CHANGELOG.md"
        ]
        
        for file_name in required_files:
            file_path = self.repo_root / file_name
            if not file_path.exists():
                results["warnings"].append(f"Missing file: {file_name}")
            else:
                self.validation_results["summary"]["totalChecks"] += 1
                self.validation_results["summary"]["passedChecks"] += 1
        
        results["passed"] = len(results["errors"]) == 0
    
    def validate_state(self):
        """Validate state files."""
        print("[VALIDATE] Checking state files...")
        results = self.validation_results["results"]["state"]
        
        state_dir = self.repo_root / ".ai" / "state"
        if not state_dir.exists():
            results["errors"].append("State directory does not exist")
            return
        
        required_states = ["project", "framework", "repository", "session", "next-task"]
        
        for state_name in required_states:
            yaml_path = state_dir / f"{state_name}.yaml"
            json_path = state_dir / f"{state_name}.json"
            
            if yaml_path.exists() or json_path.exists():
                self.validation_results["summary"]["totalChecks"] += 1
                self.validation_results["summary"]["passedChecks"] += 1
            else:
                results["errors"].append(f"Missing state: {state_name}")
            
            # Validate YAML format if exists
            if yaml_path.exists():
                try:
                    if yaml:
                        with open(yaml_path, 'r', encoding='utf-8') as f:
                            yaml.safe_load(f)
                    else:
                        # Skip yaml validation if module not available
                        pass
                except Exception as e:
                    results["errors"].append(f"Invalid YAML in {state_name}: {e}")
        
        results["passed"] = len(results["errors"]) == 0
    
    def validate_index(self):
        """Validate index files."""
        print("[VALIDATE] Checking index files...")
        results = self.validation_results["results"]["index"]
        
        index_dir = self.repo_root / ".ai" / "index"
        if not index_dir.exists():
            results["errors"].append("Index directory does not exist")
            return
        
        required_indexes = [
            "repository-index.json",
            "document-registry.json",
            "framework-registry.json",
            "prompt-registry.json",
            "engagement-registry.json"
        ]
        
        for idx_name in required_indexes:
            idx_path = index_dir / idx_name
            
            if idx_path.exists():
                self.validation_results["summary"]["totalChecks"] += 1
                
                # Validate JSON format
                try:
                    with open(idx_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    # Check schema version
                    if "schemaVersion" in data:
                        self.validation_results["summary"]["passedChecks"] += 1
                    else:
                        results["warnings"].append(f"Missing schemaVersion in {idx_name}")
                
                except json.JSONDecodeError as e:
                    results["errors"].append(f"Invalid JSON in {idx_name}: {e}")
            else:
                results["warnings"].append(f"Missing index: {idx_name}")
        
        results["passed"] = len(results["errors"]) == 0
    
    def validate_integrity(self):
        """Validate cross-file integrity."""
        print("[VALIDATE] Checking integrity...")
        results = self.validation_results["results"]["integrity"]
        
        # Check that referenced files exist
        index_path = self.repo_root / ".ai" / "index" / "repository-index.json"
        if index_path.exists():
            try:
                with open(index_path, 'r', encoding='utf-8') as f:
                    index = json.load(f)
                
                # Check files in index actually exist
                file_count = 0
                missing_count = 0
                for file_info in index.get("data", {}).get("files", []):
                    file_count += 1
                    file_path = self.repo_root / file_info["path"]
                    if not file_path.exists():
                        missing_count += 1
                
                self.validation_results["summary"]["totalChecks"] += 1
                if missing_count == 0:
                    self.validation_results["summary"]["passedChecks"] += 1
                else:
                    results["warnings"].append(f"Index references {missing_count}/{file_count} missing files")
                
            except Exception as e:
                results["errors"].append(f"Cannot read index: {e}")
        
        results["passed"] = len(results["errors"]) == 0
    
    def _calculate_summary(self):
        """Calculate summary statistics."""
        for category in self.validation_results["results"].values():
            if isinstance(category, dict):
                self.validation_results["summary"]["warnings"] += len(category.get("warnings", []))
                if not category.get("passed", True):
                    self.validation_results["summary"]["failedChecks"] += 1
    
    def save(self, output_path):
        """Save validation results."""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.validation_results, f, indent=2)
        
        print(f"[SAVE] Validation results saved to {output_path}")
        return str(output_path)
    
    def print_summary(self):
        """Print validation summary."""
        summary = self.validation_results["summary"]
        print("\n" + "="*60)
        print("VALIDATION SUMMARY")
        print("="*60)
        print(f"Total Checks: {summary['totalChecks']}")
        print(f"Passed: {summary['passedChecks']}")
        print(f"Failed: {summary['failedChecks']}")
        print(f"Warnings: {summary['warnings']}")
        
        all_passed = all(r.get("passed", False) for r in self.validation_results["results"].values())
        status = "✓ PASSED" if all_passed else "✗ FAILED"
        print(f"Status: {status}")
        print("="*60 + "\n")

def main():
    """Main entry point."""
    import sys
    
    repo_root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    output_path = os.path.join(repo_root, ".ai", "reports", "validation-results.json")
    
    validator = RepositoryValidator(repo_root)
    results = validator.validate_all()
    validator.save(output_path)
    validator.print_summary()
    
    print("[SUCCESS] Validation complete")
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())
