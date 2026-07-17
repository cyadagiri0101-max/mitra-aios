#!/usr/bin/env python3
"""
AIOS Index Consolidator
Merge 5 indexes into 1 consolidated index for minimal context loading.
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, List, Any

class IndexConsolidator:
    """Consolidate multiple indexes into single unified index."""
    
    def __init__(self, repo_root: str):
        self.repo_root = Path(repo_root).resolve()
        self.ai_root = self.repo_root / ".ai"
        self.index_dir = self.ai_root / "index"
        self.consolidated = {
            "schemaVersion": "1.0.0",
            "type": "consolidated-index",
            "description": "Unified AIOS index - minimal context version",
            "generated": True,
            "summary": {
                "totalDocuments": 0,
                "totalFrameworks": 0,
                "totalPrompts": 0,
                "totalEngagements": 0
            },
            "registry": {
                "documents": {},
                "frameworks": {},
                "prompts": {},
                "engagements": {}
            },
            "references": {
                "repository": {},
                "knowledge": {}
            }
        }
    
    def consolidate(self) -> Dict[str, Any]:
        """Consolidate all indexes."""
        print("[CONSOLIDATE] Starting index consolidation")
        
        # Load and consolidate each index
        self._consolidate_document_registry()
        self._consolidate_framework_registry()
        self._consolidate_prompt_registry()
        self._consolidate_engagement_registry()
        self._add_repository_summary()
        
        print("[CONSOLIDATE] Consolidation complete")
        return self.consolidated
    
    def _consolidate_document_registry(self):
        """Consolidate document registry (reduced)."""
        registry_path = self.index_dir / "document-registry.json"
        
        if not registry_path.exists():
            print("[SKIP] Document registry not found")
            return
        
        try:
            with open(registry_path, 'r', encoding='utf-8') as f:
                registry = json.load(f)
            
            # Extract only essential metadata
            for doc in registry.get("data", {}).get("documents", [])[:50]:  # Limit to top 50
                doc_id = doc.get("id", "UNKNOWN")
                self.consolidated["registry"]["documents"][doc_id] = {
                    "title": doc.get("title", ""),
                    "location": doc.get("location", ""),
                    "type": doc.get("type", ""),
                    "status": doc.get("status", "")
                }
            
            self.consolidated["summary"]["totalDocuments"] = len(self.consolidated["registry"]["documents"])
            print(f"[OK] Consolidated {self.consolidated['summary']['totalDocuments']} documents")
        
        except Exception as e:
            print(f"[ERROR] Consolidating document registry: {e}")
    
    def _consolidate_framework_registry(self):
        """Consolidate framework registry."""
        registry_path = self.index_dir / "framework-registry.json"
        
        if not registry_path.exists():
            print("[SKIP] Framework registry not found")
            return
        
        try:
            with open(registry_path, 'r', encoding='utf-8') as f:
                registry = json.load(f)
            
            # Extract frameworks and components
            for fw in registry.get("data", {}).get("frameworks", []):
                fw_id = fw.get("id", "UNKNOWN")
                self.consolidated["registry"]["frameworks"][fw_id] = {
                    "name": fw.get("name", ""),
                    "location": fw.get("location", ""),
                    "type": fw.get("type", "")
                }
            
            self.consolidated["summary"]["totalFrameworks"] = len(self.consolidated["registry"]["frameworks"])
            print(f"[OK] Consolidated {self.consolidated['summary']['totalFrameworks']} frameworks")
        
        except Exception as e:
            print(f"[ERROR] Consolidating framework registry: {e}")
    
    def _consolidate_prompt_registry(self):
        """Consolidate prompt registry."""
        registry_path = self.index_dir / "prompt-registry.json"
        
        if not registry_path.exists():
            print("[SKIP] Prompt registry not found")
            return
        
        try:
            with open(registry_path, 'r', encoding='utf-8') as f:
                registry = json.load(f)
            
            # Extract only essential prompt info
            for prompt in registry.get("data", {}).get("prompts", [])[:20]:
                prompt_id = prompt.get("id", "UNKNOWN")
                self.consolidated["registry"]["prompts"][prompt_id] = {
                    "name": prompt.get("name", ""),
                    "category": prompt.get("category", "")
                }
            
            self.consolidated["summary"]["totalPrompts"] = len(self.consolidated["registry"]["prompts"])
            print(f"[OK] Consolidated {self.consolidated['summary']['totalPrompts']} prompts")
        
        except Exception as e:
            print(f"[ERROR] Consolidating prompt registry: {e}")
    
    def _consolidate_engagement_registry(self):
        """Consolidate engagement registry."""
        registry_path = self.index_dir / "engagement-registry.json"
        
        if not registry_path.exists():
            print("[SKIP] Engagement registry not found")
            return
        
        try:
            with open(registry_path, 'r', encoding='utf-8') as f:
                registry = json.load(f)
            
            # Extract engagements
            for engagement in registry.get("data", {}).get("engagements", []):
                eng_id = engagement.get("id", "UNKNOWN")
                self.consolidated["registry"]["engagements"][eng_id] = {
                    "name": engagement.get("name", ""),
                    "status": engagement.get("status", "")
                }
            
            self.consolidated["summary"]["totalEngagements"] = len(self.consolidated["registry"]["engagements"])
            print(f"[OK] Consolidated {self.consolidated['summary']['totalEngagements']} engagements")
        
        except Exception as e:
            print(f"[ERROR] Consolidating engagement registry: {e}")
    
    def _add_repository_summary(self):
        """Add repository summary (not full listing)."""
        repo_index_path = self.index_dir / "repository-index.json"
        
        if not repo_index_path.exists():
            print("[SKIP] Repository index not found")
            return
        
        try:
            with open(repo_index_path, 'r', encoding='utf-8') as f:
                repo_index = json.load(f)
            
            # Add only summary, NOT full file listing
            summary = repo_index.get("summary", {})
            self.consolidated["references"]["repository"] = {
                "totalFiles": summary.get("totalFiles", 0),
                "totalDirectories": summary.get("totalDirectories", 0),
                "totalSize": summary.get("totalSize", 0),
                "fileTypes": summary.get("fileTypes", {}),
                "criticalIssues": {
                    "emptyDirectories": len(summary.get("emptyDirectories", [])),
                    "duplicateFiles": len(summary.get("duplicateFiles", [])),
                    "brokenReferences": len(summary.get("brokenReferences", []))
                }
            }
            
            print(f"[OK] Added repository summary")
        
        except Exception as e:
            print(f"[ERROR] Processing repository index: {e}")
    
    def save(self, output_path: str = None) -> str:
        """Save consolidated index."""
        if not output_path:
            output_path = self.index_dir / "consolidated-index.json"
        else:
            output_path = Path(output_path)
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Calculate size before and after
        original_size = sum(
            f.stat().st_size for f in self.index_dir.glob("*.json") 
            if f.name != "consolidated-index.json"
        )
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.consolidated, f, indent=2)
        
        consolidated_size = output_path.stat().st_size
        
        print(f"[SAVE] Consolidated index saved to {output_path}")
        print(f"[SIZE] Original indexes: {original_size / 1024 / 1024:.2f} MB")
        print(f"[SIZE] Consolidated:    {consolidated_size / 1024:.1f} KB")
        print(f"[REDUCTION] {((original_size - consolidated_size) / original_size * 100):.1f}% smaller")
        
        return str(output_path)

def main():
    """Main entry point."""
    import sys
    
    repo_root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    
    consolidator = IndexConsolidator(repo_root)
    consolidated = consolidator.consolidate()
    consolidator.save()
    
    print("[SUCCESS] Index consolidation complete")
    return 0

if __name__ == "__main__":
    sys.exit(main())
