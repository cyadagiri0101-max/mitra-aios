#!/usr/bin/env python3
"""
AIOS Automation Orchestrator
Run all automation scripts in proper sequence.
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from datetime import datetime

class AutomationOrchestrator:
    """Orchestrate running all automation scripts."""
    
    def __init__(self, repo_root):
        self.repo_root = Path(repo_root).resolve()
        self.scripts_dir = self.repo_root / "tooling" / "scripts"
        self.execution_log = {
            "timestamp": datetime.now().isoformat(),
            "repository": str(self.repo_root),
            "scripts": [],
            "status": "running"
        }
    
    def run_all(self):
        """Run all automation scripts in sequence."""
        print("="*60)
        print("AIOS AUTOMATION ORCHESTRATOR")
        print("="*60)
        print(f"Repository: {self.repo_root}\n")
        
        scripts = [
            ("Repository Scanner", "repository-scanner/scan-repository.py"),
            ("Document Registry", "repository-scanner/generate-document-registry.py"),
            ("Framework Registry", "repository-scanner/generate-framework-registry.py"),
            ("State Generator", "state-generator/generate-state.py"),
            ("Health Report", "repository-scanner/generate-health-report.py"),
            ("Context Loader", "context-loader/load-context.py"),
            ("Validator", "validate/validate-repository.py"),
            ("Index Consolidation", "repository-scanner/consolidate-index.py"),
            ("Optimization Analysis", "analyze-optimization.py"),
        ]
        
        for script_name, script_path in scripts:
            full_path = self.scripts_dir / script_path
            self._run_script(script_name, full_path)

        # Generate mode-specific caches via SmartContextLoader
        modes = ["discovery", "architecture", "implementation", "validation", "review", "governance", "release"]
        for mode in modes:
            smart_loader = self.scripts_dir / "context-loader" / "smart-loader.py"
            self._run_script(f"Smart Context Loader ({mode})", smart_loader, extra_args=[mode])
        
        self.execution_log["status"] = "completed"
        self._save_log()
        
        print("\n" + "="*60)
        print("AUTOMATION ORCHESTRATION COMPLETE")
        print("="*60)
        
        return self.execution_log
    
    def _run_script(self, name, script_path, extra_args=None):
        """Run a single automation script."""
        print(f"\n[RUN] {name}")
        print(f"      Script: {script_path}")
        
        if not script_path.exists():
            print(f"[ERROR] Script not found: {script_path}")
            self.execution_log["scripts"].append({
                "name": name,
                "script": str(script_path),
                "status": "failed",
                "error": "Script not found"
            })
            return
        
        try:
            cmd = [sys.executable, str(script_path), str(self.repo_root)]
            if extra_args:
                cmd.extend(extra_args)
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                print(f"[OK] {name} completed successfully")
                self.execution_log["scripts"].append({
                    "name": name,
                    "script": str(script_path),
                    "status": "success",
                    "output": result.stdout[:200]
                })
            else:
                print(f"[ERROR] {name} failed")
                print(f"       {result.stderr[:200]}")
                self.execution_log["scripts"].append({
                    "name": name,
                    "script": str(script_path),
                    "status": "failed",
                    "error": result.stderr[:200]
                })
        
        except subprocess.TimeoutExpired:
            print(f"[ERROR] {name} timed out")
            self.execution_log["scripts"].append({
                "name": name,
                "script": str(script_path),
                "status": "timeout"
            })
        except Exception as e:
            print(f"[ERROR] {name} error: {e}")
            self.execution_log["scripts"].append({
                "name": name,
                "script": str(script_path),
                "status": "error",
                "error": str(e)
            })
    
    def _save_log(self):
        """Save execution log."""
        log_path = self.repo_root / ".ai" / "reports" / "automation-log.json"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(log_path, 'w', encoding='utf-8') as f:
            json.dump(self.execution_log, f, indent=2)
        
        print(f"\n[SAVE] Execution log saved to {log_path}")

def main():
    """Main entry point."""
    repo_root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    
    orchestrator = AutomationOrchestrator(repo_root)
    log = orchestrator.run_all()
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
