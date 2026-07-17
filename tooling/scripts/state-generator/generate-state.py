#!/usr/bin/env python3
"""
AIOS State Generator
Automatically generate and populate state files.
"""

import os
import json
from pathlib import Path
from datetime import datetime
import re

# Try to import yaml, but fallback if not available
try:
    import yaml
except ImportError:
    yaml = None

class StateGenerator:
    """Generate state files from repository analysis."""
    
    def __init__(self, repo_root):
        self.repo_root = Path(repo_root).resolve()
    
    def generate_all(self):
        """Generate all state files."""
        print("[STATE] Starting state generation")
        
        states = {
            "project": self._generate_project_state(),
            "framework": self._generate_framework_state(),
            "repository": self._generate_repository_state(),
            "session": self._generate_session_state(),
            "next_task": self._generate_next_task_state()
        }
        
        return states
    
    def _generate_project_state(self):
        """Generate project state."""
        return {
            "version": "0.1.0",
            "status": "scaffolding",
            "updated": datetime.now().isoformat(),
            "owner": "Platform Engineering",
            "description": "Project State Snapshot",
            "project": {
                "name": "AI Operating System (AIOS)",
                "id": "AIOS-001",
                "created": datetime.now().isoformat(),
                "owner": "Platform Engineering"
            },
            "state": {
                "phase": "Foundation",
                "completionPercentage": 5,
                "activeWorkItems": [
                    "Automation foundation implementation"
                ],
                "blockers": []
            },
            "objectives": {
                "primary": [
                    "Create reusable AI Operating System",
                    "Support Software Verification Framework (SVF)",
                    "Support MITRA",
                    "Enable future engineering projects"
                ],
                "successCriteria": [
                    "Scaffolding complete",
                    "Automation implemented",
                    "Documentation comprehensive",
                    "Ready for content population"
                ],
                "keyMilestones": [
                    "P0.1 - Architecture scaffolding",
                    "P0.2 - Automation foundation",
                    "P1.0 - Framework implementation",
                    "P2.0 - Production readiness"
                ],
                "deadline": None
            },
            "stakeholders": {
                "projectLead": "Platform Engineering",
                "teamMembers": [
                    "Architect",
                    "Implementer",
                    "Validator"
                ],
                "stakeholders": [
                    "SVF Team",
                    "MITRA Team",
                    "Enterprise Projects"
                ],
                "communicationPlan": "Weekly status meetings"
            },
            "resources": {
                "budgetAllocated": "TBD",
                "peopleAssigned": [
                    "Platform Engineers"
                ],
                "toolsAvailable": [
                    "Python 3.8+",
                    "PowerShell 5.1+",
                    "Git"
                ],
                "infrastructure": "Local development environment"
            },
            "timeline": {
                "currentPhaseDates": datetime.now().isoformat(),
                "completedPhases": [
                    "P0.1 - Architecture scaffolding"
                ],
                "upcomingPhases": [
                    "P0.2 - Automation foundation",
                    "P1.0 - Framework implementation"
                ],
                "riskAssessment": "Low - scaffolding phase"
            }
        }
    
    def _generate_framework_state(self):
        """Generate framework state."""
        framework_dir = self.repo_root / "framework"
        framework_exists = framework_dir.exists()
        
        return {
            "version": "0.1.0",
            "status": "scaffolding",
            "updated": datetime.now().isoformat(),
            "owner": "Platform Engineering",
            "description": "Framework State Snapshot",
            "framework": {
                "name": "AIOS Framework",
                "version": "0.1.0",
                "installationStatus": "scaffolded",
                "configurationStatus": "initialized"
            },
            "components": {
                "list": [
                    "Core Agent System",
                    "Mode System",
                    "State Management",
                    "Context Loading",
                    "Model Routing",
                    "Knowledge Management"
                ],
                "versions": {
                    "agents": "0.1.0",
                    "modes": "0.1.0",
                    "state": "0.1.0"
                },
                "status": {
                    "agents": "scaffolded",
                    "modes": "scaffolded",
                    "state": "scaffolded"
                },
                "dependencies": []
            },
            "configuration": {
                "parameters": {},
                "environmentVariables": {},
                "featureFlags": {
                    "discovery_mode": True,
                    "architecture_mode": True,
                    "implementation_mode": False
                },
                "customizations": []
            },
            "integrations": {
                "connectedSystems": [],
                "apiEndpoints": [],
                "dataFlows": [],
                "integrationStatus": "not_started"
            },
            "health": {
                "componentHealth": {
                    "agents": "healthy",
                    "modes": "healthy",
                    "state": "healthy"
                },
                "performanceMetrics": {},
                "errorRates": {},
                "recoveryProcedures": []
            },
            "maintenance": {
                "lastUpdate": datetime.now().isoformat(),
                "knownIssues": [],
                "upgradeSchedule": "TBD",
                "supportContacts": [
                    "Platform Engineering"
                ]
            }
        }
    
    def _generate_repository_state(self):
        """Generate repository state."""
        # Try to get git info
        git_info = self._get_git_info()
        
        return {
            "version": "0.1.0",
            "status": "scaffolding",
            "updated": datetime.now().isoformat(),
            "owner": "Platform Engineering",
            "description": "Repository State Snapshot",
            "repository": {
                "url": git_info.get("url", "local"),
                "owner": "Platform Engineering",
                "defaultBranch": git_info.get("branch", "main"),
                "lastCommit": git_info.get("commit", "unknown")
            },
            "branches": {
                "active": [
                    git_info.get("branch", "main")
                ],
                "purposes": {
                    git_info.get("branch", "main"): "Main development branch"
                },
                "status": {
                    git_info.get("branch", "main"): "active"
                },
                "mergeConflicts": []
            },
            "codeState": {
                "linesOfCode": 0,
                "qualityMetrics": {},
                "testCoverage": 0,
                "buildStatus": "passing"
            },
            "mergeStatus": {
                "pendingPRs": [],
                "prReviews": [],
                "mergeReadiness": "ready",
                "deploymentReadiness": "not_ready"
            },
            "dependencies": {
                "direct": [],
                "versions": {},
                "licenseCompliance": "compliant",
                "securityVulnerabilities": []
            },
            "releases": {
                "latest": "0.1.0",
                "currentVersion": "0.1.0",
                "nextVersion": "0.2.0",
                "releaseSchedule": "Quarterly"
            }
        }
    
    def _generate_session_state(self):
        """Generate session state."""
        return {
            "version": "0.1.0",
            "status": "scaffolding",
            "updated": datetime.now().isoformat(),
            "owner": "Platform Engineering",
            "description": "Session State Snapshot",
            "session": {
                "id": f"SESSION-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "startTime": datetime.now().isoformat(),
                "lastActivityTime": datetime.now().isoformat(),
                "duration": "0:00:00"
            },
            "currentAgent": {
                "name": "system",
                "mode": "initialization",
                "currentTask": "State generation",
                "agentState": "idle"
            },
            "contextState": {
                "loadedContext": [],
                "contextSize": 0,
                "tokenUsage": 0,
                "memoryStatus": "available"
            },
            "progress": {
                "tasksCompleted": [],
                "currentProgress": "Initializing",
                "blockers": [],
                "nextSteps": [
                    "Load repository index",
                    "Initialize agent system",
                    "Start discovery mode"
                ]
            },
            "executionHistory": {
                "actionsTaken": [],
                "resultsProduced": [],
                "errorsEncountered": [],
                "decisionsMade": []
            },
            "recovery": {
                "checkpointData": {},
                "stateSnapshot": {},
                "recoveryPoint": datetime.now().isoformat(),
                "recoveryProcedure": "Reload state files"
            }
        }
    
    def _generate_next_task_state(self):
        """Generate next task state."""
        return {
            "version": "0.1.0",
            "status": "scaffolding",
            "updated": datetime.now().isoformat(),
            "owner": "Platform Engineering",
            "description": "Next Task Definition",
            "task": {
                "id": "TASK-0001",
                "title": "Review automation foundation",
                "createdDate": datetime.now().isoformat(),
                "assignedTo": "Platform Engineer"
            },
            "description": {
                "problemStatement": "Need to verify automation scripts are working correctly",
                "objective": "Ensure all automation scripts execute properly",
                "expectedOutcome": "All scripts running, indexes generated, validation passing",
                "successCriteria": [
                    "Repository scanner completes successfully",
                    "Document registry generated",
                    "Framework registry generated",
                    "State files populated",
                    "Validation reports created"
                ]
            },
            "context": {
                "previousTasksCompleted": [
                    "TASK-0000: Architecture scaffolding"
                ],
                "currentState": "Automation foundation implemented",
                "dependencies": [],
                "relatedTasks": []
            },
            "requirements": {
                "functional": [
                    "Scan repository successfully",
                    "Generate all required indexes",
                    "Populate state files",
                    "Validate consistency"
                ],
                "nonFunctional": [
                    "Execution completes in < 30 seconds",
                    "JSON output is valid",
                    "All files created"
                ],
                "acceptanceCriteria": [
                    "All scripts execute without errors",
                    "Generated files are valid JSON/YAML",
                    "Validation reports show green status"
                ],
                "constraints": [
                    "Must work on Windows and Linux",
                    "Must not modify existing framework documents"
                ]
            },
            "resources": {
                "requiredTools": [
                    "Python 3.8+",
                    "PowerShell 5.1+",
                    "Text editor"
                ],
                "requiredKnowledge": [
                    "AIOS architecture",
                    "JSON/YAML formats",
                    "Repository structure"
                ],
                "availableContext": [
                    "Architecture documents",
                    "Framework registry",
                    "State templates"
                ],
                "estimatedEffort": "2-4 hours"
            },
            "timeline": {
                "startDate": datetime.now().isoformat(),
                "targetCompletion": None,
                "milestoneDates": [],
                "criticalPath": []
            }
        }
    
    def _get_git_info(self):
        """Get git repository information."""
        info = {}
        try:
            # Try to get current branch
            import subprocess
            result = subprocess.run(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                cwd=str(self.repo_root),
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                info["branch"] = result.stdout.strip()
            
            # Try to get latest commit
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=str(self.repo_root),
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                info["commit"] = result.stdout.strip()[:8]
        except:
            pass
        
        return info
    
    def save_state(self, state_dict, state_name):
        """Save state as YAML and JSON."""
        base_path = self.repo_root / ".ai" / "state" / state_name
        base_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save YAML (with or without yaml module)
        yaml_path = Path(str(base_path) + ".yaml")
        
        if yaml:
            with open(yaml_path, 'w', encoding='utf-8') as f:
                yaml.dump(state_dict, f, default_flow_style=False, sort_keys=False)
        else:
            # Fallback: use JSON-to-YAML conversion
            with open(yaml_path, 'w', encoding='utf-8') as f:
                self._write_yaml_manually(f, state_dict)
        
        print(f"[SAVE] State saved to {yaml_path}")
        
        # Also save as JSON for compatibility
        json_path = Path(str(base_path) + ".json")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(state_dict, f, indent=2)
        
        return str(yaml_path)
    
    def _write_yaml_manually(self, f, data, indent=0):
        """Write YAML format manually without yaml module."""
        indent_str = "  " * indent
        
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, (dict, list)):
                    f.write(f"{indent_str}{key}:\n")
                    self._write_yaml_manually(f, value, indent + 1)
                else:
                    if isinstance(value, str) and ('\n' in value or ':' in value):
                        f.write(f'{indent_str}{key}: "{value}"\n')
                    else:
                        f.write(f"{indent_str}{key}: {value}\n")
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, (dict, list)):
                    f.write(f"{indent_str}- \n")
                    self._write_yaml_manually(f, item, indent + 1)
                else:
                    f.write(f"{indent_str}- {item}\n")
        else:
            f.write(f"{indent_str}{data}\n")

def main():
    """Main entry point."""
    import sys
    
    repo_root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    
    generator = StateGenerator(repo_root)
    states = generator.generate_all()
    
    for state_name, state_data in states.items():
        generator.save_state(state_data, state_name)
    
    print("[SUCCESS] State generation complete")
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())
