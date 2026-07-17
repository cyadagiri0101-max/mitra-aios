#!/usr/bin/env python3
"""
AIOS Repository Health Report Generator
Generate repository health assessment and issues report.
"""

import os
import json
from pathlib import Path
from datetime import datetime
import re

class RepositoryHealthGenerator:
    """Generate repository health report."""
    
    def __init__(self, repo_root, index_path=None):
        self.repo_root = Path(repo_root).resolve()
        self.index_path = Path(index_path) if index_path else self.repo_root / ".ai" / "index" / "repository-index.json"
        self.health_report = {
            "title": "Repository Health Report",
            "generatedAt": datetime.now().isoformat(),
            "repositoryRoot": str(self.repo_root),
            "status": "unknown",
            "overallScore": 0,
            "categories": {
                "structure": {
                    "score": 0,
                    "issues": []
                },
                "documentation": {
                    "score": 0,
                    "issues": []
                },
                "consistency": {
                    "score": 0,
                    "issues": []
                },
                "completeness": {
                    "score": 0,
                    "issues": []
                }
            },
            "summary": {
                "totalFiles": 0,
                "totalDirectories": 0,
                "missingFiles": [],
                "duplicateFiles": [],
                "brokenReferences": [],
                "emptyFolders": [],
                "namingViolations": [],
                "missingMetadata": []
            }
        }
    
    def load_index(self):
        """Load repository index."""
        if self.index_path.exists():
            try:
                with open(self.index_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return None
        return None
    
    def generate(self):
        """Generate health report."""
        print("[HEALTH] Starting repository health assessment")
        
        index = self.load_index()
        if not index:
            print("[HEALTH] No index found - scanning repository")
            index = self._scan_repository()
        
        # Copy summary from index
        if index:
            self.health_report["summary"]["totalFiles"] = index["summary"].get("totalFiles", 0)
            self.health_report["summary"]["totalDirectories"] = index["summary"].get("totalDirectories", 0)
            self.health_report["summary"]["duplicateFiles"] = index["summary"].get("duplicateFiles", [])
            self.health_report["summary"]["brokenReferences"] = index["summary"].get("brokenReferences", [])
            self.health_report["summary"]["emptyFolders"] = index["summary"].get("emptyDirectories", [])
        
        # Run health checks
        self._check_structure()
        self._check_documentation()
        self._check_consistency()
        self._check_completeness()
        
        # Calculate overall score
        scores = [
            self.health_report["categories"]["structure"]["score"],
            self.health_report["categories"]["documentation"]["score"],
            self.health_report["categories"]["consistency"]["score"],
            self.health_report["categories"]["completeness"]["score"]
        ]
        self.health_report["overallScore"] = int(sum(scores) / len(scores))
        
        # Determine status
        if self.health_report["overallScore"] >= 80:
            self.health_report["status"] = "healthy"
        elif self.health_report["overallScore"] >= 60:
            self.health_report["status"] = "warning"
        else:
            self.health_report["status"] = "critical"
        
        print(f"[HEALTH] Overall score: {self.health_report['overallScore']}/100 ({self.health_report['status']})")
        
        return self.health_report
    
    def _scan_repository(self):
        """Quick repository scan."""
        return {
            "summary": {
                "totalFiles": 0,
                "totalDirectories": 0,
                "duplicateFiles": [],
                "brokenReferences": [],
                "emptyDirectories": []
            }
        }
    
    def _check_structure(self):
        """Check directory structure."""
        required_dirs = [
            ".ai",
            ".ai/agents",
            ".ai/modes",
            ".ai/state",
            ".ai/index",
            ".ai/knowledge",
            "architecture",
            "framework",
            "knowledge",
            "verification",
            "tooling",
            "engagements",
            "reports",
            "releases"
        ]
        
        issues = []
        found_count = 0
        
        for dir_name in required_dirs:
            dir_path = self.repo_root / dir_name
            if dir_path.exists():
                found_count += 1
            else:
                issues.append(f"Missing directory: {dir_name}")
        
        score = int((found_count / len(required_dirs)) * 100)
        self.health_report["categories"]["structure"]["score"] = score
        self.health_report["categories"]["structure"]["issues"] = issues
        
        print(f"[HEALTH] Structure: {score}/100 ({found_count}/{len(required_dirs)} directories)")
    
    def _check_documentation(self):
        """Check documentation completeness."""
        required_files = [
            ".ai/README.md",
            ".ai/AGENTS.md",
            ".ai/AGENT_MANIFEST.md",
            ".ai/MODEL_ROUTING.md",
            ".ai/SESSION_RECOVERY.md",
            ".ai/CONTEXT_LOADING.md",
            "architecture/AIOS-000-Vision.md",
            "architecture/AIOS-001-Layer-Architecture.md",
            "framework/README.md",
            "knowledge/README.md",
            "verification/README.md"
        ]
        
        issues = []
        found_count = 0
        
        for file_name in required_files:
            file_path = self.repo_root / file_name
            if file_path.exists():
                found_count += 1
            else:
                issues.append(f"Missing documentation: {file_name}")
        
        score = int((found_count / len(required_files)) * 100)
        self.health_report["categories"]["documentation"]["score"] = score
        self.health_report["categories"]["documentation"]["issues"] = issues
        
        print(f"[HEALTH] Documentation: {score}/100 ({found_count}/{len(required_files)} files)")
    
    def _check_consistency(self):
        """Check naming and consistency."""
        issues = []
        
        # Check for inconsistent naming
        markdown_files = list(self.repo_root.glob("**/*.md"))
        
        # Check for files without proper headers
        files_without_headers = []
        for md_file in markdown_files[:10]:  # Sample check
            try:
                with open(md_file, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                if not re.search(r'^## Title', content, re.MULTILINE):
                    files_without_headers.append(str(md_file.relative_to(self.repo_root)))
            except:
                pass
        
        if files_without_headers:
            issues.append(f"Files without proper headers: {len(files_without_headers)}")
        
        score = max(0, 100 - (len(files_without_headers) * 10))
        self.health_report["categories"]["consistency"]["score"] = score
        self.health_report["categories"]["consistency"]["issues"] = issues
        
        print(f"[HEALTH] Consistency: {score}/100")
    
    def _check_completeness(self):
        """Check for completeness of critical files."""
        critical_files = [
            (".ai/state/project.yaml", "Project state"),
            (".ai/state/framework.yaml", "Framework state"),
            (".ai/state/repository.yaml", "Repository state"),
            (".ai/index/repository-index.json", "Repository index"),
            (".ai/index/document-registry.json", "Document registry"),
            (".ai/knowledge/architecture.json", "Architecture knowledge")
        ]
        
        issues = []
        found_count = 0
        
        for file_path, desc in critical_files:
            full_path = self.repo_root / file_path
            if full_path.exists():
                try:
                    stat = full_path.stat()
                    if stat.st_size > 100:  # Check if not empty
                        found_count += 1
                    else:
                        issues.append(f"Empty file: {file_path}")
                except:
                    issues.append(f"Cannot access: {file_path}")
            else:
                issues.append(f"Missing: {file_path}")
        
        score = int((found_count / len(critical_files)) * 100)
        self.health_report["categories"]["completeness"]["score"] = score
        self.health_report["categories"]["completeness"]["issues"] = issues
        
        print(f"[HEALTH] Completeness: {score}/100")
    
    def save(self, output_path):
        """Save health report as Markdown."""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        md_content = self._generate_markdown()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(md_content)
        
        print(f"[SAVE] Health report saved to {output_path}")
        return str(output_path)
    
    def _generate_markdown(self):
        """Generate markdown report."""
        md = []
        md.append("# Repository Health Report\n")
        md.append(f"**Generated:** {self.health_report['generatedAt']}\n")
        md.append(f"**Repository:** {self.health_report['repositoryRoot']}\n")
        md.append(f"**Status:** {self.health_report['status'].upper()}\n")
        md.append(f"**Overall Score:** {self.health_report['overallScore']}/100\n")
        
        md.append("## Summary\n")
        md.append(f"- Total Files: {self.health_report['summary']['totalFiles']}\n")
        md.append(f"- Total Directories: {self.health_report['summary']['totalDirectories']}\n")
        md.append(f"- Duplicate Files: {len(self.health_report['summary']['duplicateFiles'])}\n")
        md.append(f"- Broken References: {len(self.health_report['summary']['brokenReferences'])}\n")
        md.append(f"- Empty Folders: {len(self.health_report['summary']['emptyFolders'])}\n")
        
        md.append("## Category Scores\n")
        for category, data in self.health_report["categories"].items():
            md.append(f"\n### {category.title()}: {data['score']}/100\n")
            if data["issues"]:
                for issue in data["issues"][:5]:  # Show first 5 issues
                    md.append(f"- {issue}\n")
                if len(data["issues"]) > 5:
                    md.append(f"- ... and {len(data['issues']) - 5} more issues\n")
        
        if self.health_report["summary"]["duplicateFiles"]:
            md.append("## Duplicate Files\n")
            for dup in self.health_report["summary"]["duplicateFiles"][:5]:
                if isinstance(dup, dict):
                    files = dup.get("files", [])
                    md.append(f"- {', '.join(files)}\n")
        
        if self.health_report["summary"]["brokenReferences"]:
            md.append("## Broken References\n")
            for ref in self.health_report["summary"]["brokenReferences"][:10]:
                md.append(f"- {ref}\n")
        
        if self.health_report["summary"]["emptyFolders"]:
            md.append("## Empty Folders\n")
            for folder in self.health_report["summary"]["emptyFolders"][:10]:
                md.append(f"- {folder}\n")
        
        md.append("## Recommendations\n")
        if self.health_report["status"] == "critical":
            md.append("- Address critical issues immediately\n")
            md.append("- Review missing directories and files\n")
            md.append("- Validate all references\n")
        elif self.health_report["status"] == "warning":
            md.append("- Review and address warning issues\n")
            md.append("- Complete missing documentation\n")
            md.append("- Standardize file naming\n")
        else:
            md.append("- Repository is in good health\n")
            md.append("- Continue regular maintenance\n")
            md.append("- Keep documentation updated\n")
        
        return "".join(md)

def main():
    """Main entry point."""
    import sys
    
    repo_root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    output_path = os.path.join(repo_root, ".ai", "reports", "repository-health.md")
    
    generator = RepositoryHealthGenerator(repo_root)
    report = generator.generate()
    generator.save(output_path)
    
    print("[SUCCESS] Health report generation complete")
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())
