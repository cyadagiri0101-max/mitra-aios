#!/usr/bin/env python3
"""
AIOS Framework Registry Generator
Automatically detect and catalog frameworks, standards, templates, etc.
"""

import os
import json
from pathlib import Path
from datetime import datetime
import re

class FrameworkRegistryGenerator:
    """Generate framework registry by detecting framework elements."""
    
    def __init__(self, repo_root):
        self.repo_root = Path(repo_root).resolve()
        self.registry = {
            "schemaVersion": "0.1.0",
            "status": "generated",
            "updated": datetime.now().isoformat(),
            "owner": "Platform Engineering",
            "description": "Framework Registry",
            "data": {
                "frameworks": [],
                "components": [],
                "standards": [],
                "methodologies": [],
                "taxonomies": [],
                "templates": [],
                "architectures": [],
                "knowledge": [],
                "reports": [],
                "metadata": {}
            }
        }
    
    def generate(self):
        """Generate framework registry by scanning directory structure."""
        print("[FRAMEWORK] Starting framework registry generation")
        
        # Detect frameworks by directory structure and content
        self._detect_frameworks()
        self._detect_components()
        self._detect_standards()
        self._detect_methodologies()
        self._detect_templates()
        self._detect_knowledge()
        self._detect_reports()
        
        print(f"[FRAMEWORK] Detected {len(self.registry['data']['frameworks'])} frameworks")
        print(f"[FRAMEWORK] Detected {len(self.registry['data']['components'])} components")
        print(f"[FRAMEWORK] Detected {len(self.registry['data']['standards'])} standards")
        
        return self.registry
    
    def _detect_frameworks(self):
        """Detect framework definitions."""
        framework_dir = self.repo_root / "framework"
        
        if framework_dir.exists():
            readme = framework_dir / "README.md"
            if readme.exists():
                self.registry["data"]["frameworks"].append({
                    "id": "FRAMEWORK-001",
                    "name": "AIOS Framework Layer",
                    "location": "framework/",
                    "type": "framework",
                    "status": "scaffolding",
                    "description": "Reusable frameworks and components",
                    "components": [],
                    "capabilities": [],
                    "extensionPoints": []
                })
    
    def _detect_components(self):
        """Detect framework components."""
        # Scan for .md files in framework directory that describe components
        framework_dir = self.repo_root / "framework"
        
        if framework_dir.exists():
            for md_file in framework_dir.glob("*.md"):
                if md_file.name != "README.md":
                    title = md_file.stem.replace("_", " ").title()
                    self.registry["data"]["components"].append({
                        "id": f"COMP-{len(self.registry['data']['components']) + 1:03d}",
                        "name": title,
                        "location": f"framework/{md_file.name}",
                        "type": "component",
                        "status": "scaffolding"
                    })
    
    def _detect_standards(self):
        """Detect standards and governance."""
        # Look for governance-related documents
        governance_patterns = ["governance", "standard", "guideline", "policy"]
        
        for root, dirs, files in os.walk(self.repo_root):
            for f in files:
                if f.endswith(".md"):
                    f_lower = f.lower()
                    if any(pattern in f_lower for pattern in governance_patterns):
                        path = Path(root) / f
                        rel_path = path.relative_to(self.repo_root)
                        
                        self.registry["data"]["standards"].append({
                            "id": f"STD-{len(self.registry['data']['standards']) + 1:03d}",
                            "name": f.replace("_", " ").replace(".md", "").title(),
                            "location": str(rel_path).replace("\\", "/"),
                            "type": "standard",
                            "status": "active"
                        })
    
    def _detect_methodologies(self):
        """Detect methodologies."""
        methodology_patterns = ["methodology", "process", "workflow", "procedure"]
        
        for root, dirs, files in os.walk(self.repo_root):
            for f in files:
                if f.endswith(".md"):
                    f_lower = f.lower()
                    if any(pattern in f_lower for pattern in methodology_patterns):
                        path = Path(root) / f
                        rel_path = path.relative_to(self.repo_root)
                        
                        self.registry["data"]["methodologies"].append({
                            "id": f"METH-{len(self.registry['data']['methodologies']) + 1:03d}",
                            "name": f.replace("_", " ").replace(".md", "").title(),
                            "location": str(rel_path).replace("\\", "/"),
                            "type": "methodology"
                        })
    
    def _detect_templates(self):
        """Detect templates."""
        template_patterns = ["template", "scaffold", "boilerplate", "sample"]
        
        for root, dirs, files in os.walk(self.repo_root):
            for f in files:
                if f.endswith(".md"):
                    f_lower = f.lower()
                    if any(pattern in f_lower for pattern in template_patterns):
                        path = Path(root) / f
                        rel_path = path.relative_to(self.repo_root)
                        
                        self.registry["data"]["templates"].append({
                            "id": f"TMPL-{len(self.registry['data']['templates']) + 1:03d}",
                            "name": f.replace("_", " ").replace(".md", "").title(),
                            "location": str(rel_path).replace("\\", "/"),
                            "type": "template"
                        })
    
    def _detect_knowledge(self):
        """Detect knowledge layer."""
        knowledge_dir = self.repo_root / "knowledge"
        
        if knowledge_dir.exists():
            for json_file in knowledge_dir.glob("*.json"):
                title = json_file.stem.replace("_", " ").title()
                self.registry["data"]["knowledge"].append({
                    "id": f"KB-{len(self.registry['data']['knowledge']) + 1:03d}",
                    "name": title,
                    "location": f"knowledge/{json_file.name}",
                    "type": "knowledge",
                    "format": "json"
                })
            
            for md_file in knowledge_dir.glob("*.md"):
                title = md_file.stem.replace("_", " ").title()
                self.registry["data"]["knowledge"].append({
                    "id": f"KB-{len(self.registry['data']['knowledge']) + 1:03d}",
                    "name": title,
                    "location": f"knowledge/{md_file.name}",
                    "type": "knowledge",
                    "format": "markdown"
                })
    
    def _detect_reports(self):
        """Detect report definitions."""
        reports_dir = self.repo_root / "reports"
        
        if reports_dir.exists():
            for md_file in reports_dir.glob("*.md"):
                title = md_file.stem.replace("_", " ").title()
                self.registry["data"]["reports"].append({
                    "id": f"RPT-{len(self.registry['data']['reports']) + 1:03d}",
                    "name": title,
                    "location": f"reports/{md_file.name}",
                    "type": "report"
                })
    
    def save(self, output_path):
        """Save registry to JSON."""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.registry, f, indent=2)
        
        print(f"[SAVE] Framework registry saved to {output_path}")
        return str(output_path)

def main():
    """Main entry point."""
    import sys
    
    repo_root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    output_path = os.path.join(repo_root, ".ai", "index", "framework-registry.json")
    
    generator = FrameworkRegistryGenerator(repo_root)
    registry = generator.generate()
    generator.save(output_path)
    
    print("[SUCCESS] Framework registry generation complete")
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())
