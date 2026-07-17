#!/usr/bin/env python3
"""
AIOS Document Registry Generator
Extract metadata from all documents and generate registry.
"""

import os
import json
import hashlib
from pathlib import Path
from datetime import datetime
import re

class DocumentRegistryGenerator:
    """Generate document registry from markdown files."""
    
    def __init__(self, repo_root, index_path=None):
        self.repo_root = Path(repo_root).resolve()
        self.index_path = Path(index_path) if index_path else self.repo_root / ".ai" / "index" / "repository-index.json"
        self.registry = {
            "schemaVersion": "0.1.0",
            "status": "generated",
            "updated": datetime.now().isoformat(),
            "owner": "Platform Engineering",
            "description": "Document Registry",
            "data": {
                "documents": [],
                "categories": {},
                "tags": [],
                "versions": {},
                "authors": [],
                "relationships": [],
                "metadata": {}
            }
        }
        self.doc_id_counter = 0
    
    def load_repository_index(self):
        """Load repository index if available."""
        if self.index_path.exists():
            try:
                with open(self.index_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return None
        return None
    
    def generate(self):
        """Generate document registry."""
        print("[REGISTRY] Starting document registry generation")
        
        # Load repository index for file list
        repo_index = self.load_repository_index()
        
        # Get all markdown files
        if repo_index:
            md_files = [f for f in repo_index["data"]["files"] if f["extension"] == ".md"]
        else:
            # Fallback: scan directly
            md_files = []
            for root, dirs, files in os.walk(self.repo_root):
                for f in files:
                    if f.endswith(".md"):
                        path = Path(root) / f
                        rel_path = path.relative_to(self.repo_root)
                        md_files.append({
                            "path": str(rel_path).replace("\\", "/"),
                            "name": f
                        })
        
        print(f"[REGISTRY] Processing {len(md_files)} markdown documents")
        
        # Process each markdown file
        for file_info in md_files:
            file_path = self.repo_root / file_info["path"]
            doc = self._process_document(file_path, file_info["path"])
            if doc:
                self.registry["data"]["documents"].append(doc)
                
                # Track categories
                if doc.get("category"):
                    cat = doc["category"]
                    if cat not in self.registry["data"]["categories"]:
                        self.registry["data"]["categories"][cat] = []
                    self.registry["data"]["categories"][cat].append(doc["id"])
                
                # Track versions
                if doc.get("version"):
                    ver = doc["version"]
                    if ver not in self.registry["data"]["versions"]:
                        self.registry["data"]["versions"][ver] = []
                    self.registry["data"]["versions"][ver].append(doc["id"])
                
                # Track authors
                if doc.get("author") and doc["author"] not in self.registry["data"]["authors"]:
                    self.registry["data"]["authors"].append(doc["author"])
                
                # Track tags
                if doc.get("tags"):
                    self.registry["data"]["tags"].extend(doc["tags"])
        
        self.registry["data"]["tags"] = list(set(self.registry["data"]["tags"]))
        
        print(f"[REGISTRY] Registered {len(self.registry['data']['documents'])} documents")
        return self.registry
    
    def _process_document(self, file_path, rel_path):
        """Extract metadata from document."""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            self.doc_id_counter += 1
            doc_id = f"DOC-{self.doc_id_counter:05d}"
            
            # Extract metadata
            metadata = self._extract_metadata(content)
            
            stat = file_path.stat()
            
            doc = {
                "id": doc_id,
                "title": metadata.get("title", file_path.stem),
                "type": "markdown",
                "status": metadata.get("status", "unknown"),
                "version": metadata.get("version", "0.0.0"),
                "location": str(rel_path).replace("\\", "/"),
                "lastModified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "size": stat.st_size,
                "author": metadata.get("author", "unknown"),
                "category": self._categorize_document(rel_path),
                "checksum": self._calculate_hash(file_path),
                "references": self._extract_references(content),
                "tags": metadata.get("tags", []),
                "metadata": metadata
            }
            
            return doc
            
        except Exception as e:
            print(f"[ERROR] Processing {rel_path}: {e}")
            return None
    
    def _extract_metadata(self, content):
        """Extract metadata from markdown content."""
        metadata = {
            "title": None,
            "status": None,
            "version": None,
            "author": None,
            "tags": [],
            "sections": []
        }
        
        lines = content.split('\n')
        
        for i, line in enumerate(lines[:50]):  # Check first 50 lines
            line = line.strip()
            
            # Extract title
            if line.startswith("# ") and not metadata["title"]:
                metadata["title"] = line[2:].strip()
            
            # Extract metadata fields
            if line.startswith("## Status"):
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    if next_line.startswith("Status"):
                        match = re.search(r'Status[:\s]+(\w+)', next_line)
                        if match:
                            metadata["status"] = match.group(1)
            
            if line.startswith("## Version"):
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    match = re.search(r'[\d\.]+', next_line)
                    if match:
                        metadata["version"] = match.group(0)
            
            if line.startswith("## Author"):
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    if next_line:
                        metadata["author"] = next_line
            
            # Collect sections
            if line.startswith("##") and not line.startswith("## "):
                section = line.lstrip("#").strip()
                if section:
                    metadata["sections"].append(section)
        
        return metadata
    
    def _categorize_document(self, rel_path):
        """Categorize document based on path."""
        path_str = str(rel_path).lower()
        
        if "architecture" in path_str:
            return "architecture"
        elif "framework" in path_str:
            return "framework"
        elif "agent" in path_str:
            return "agents"
        elif "mode" in path_str:
            return "modes"
        elif "state" in path_str:
            return "state"
        elif "report" in path_str:
            return "reports"
        elif ".ai" in path_str:
            return "aios-core"
        else:
            return "other"
    
    def _extract_references(self, content):
        """Extract references from content."""
        references = []
        
        # Markdown links
        links = re.findall(r'\[([^\]]+)\]\(([^\)]+)\)', content)
        for _, link in links:
            if not link.startswith("http"):
                references.append(link)
        
        return list(set(references))
    
    def _calculate_hash(self, file_path):
        """Calculate file hash."""
        try:
            md5 = hashlib.md5()
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b''):
                    md5.update(chunk)
            return md5.hexdigest()
        except:
            return None
    
    def save(self, output_path):
        """Save registry to JSON."""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.registry, f, indent=2)
        
        print(f"[SAVE] Document registry saved to {output_path}")
        return str(output_path)

def main():
    """Main entry point."""
    import sys
    
    repo_root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    output_path = os.path.join(repo_root, ".ai", "index", "document-registry.json")
    
    generator = DocumentRegistryGenerator(repo_root)
    registry = generator.generate()
    generator.save(output_path)
    
    print("[SUCCESS] Document registry generation complete")
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())
