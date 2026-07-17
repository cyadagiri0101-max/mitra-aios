#!/usr/bin/env python3
"""
AIOS Repository Scanner
Recursively scan repository, classify files, detect issues, and generate index.
"""

import os
import sys
import json
import hashlib
from pathlib import Path
from datetime import datetime
from collections import defaultdict
import re

class RepositoryScanner:
    """Scan AIOS repository and generate comprehensive index."""
    
    def __init__(self, repo_root):
        self.repo_root = Path(repo_root).resolve()
        self.index = {
            "schemaVersion": "0.1.0",
            "status": "generated",
            "updated": datetime.now().isoformat(),
            "repositoryRoot": str(self.repo_root),
            "summary": {
                "totalFiles": 0,
                "totalDirectories": 0,
                "totalSize": 0,
                "fileTypes": {},
                "emptyDirectories": [],
                "duplicateFiles": [],
                "brokenReferences": [],
                "orphanDocuments": []
            },
            "data": {
                "repositories": [str(self.repo_root)],
                "directories": [],
                "files": [],
                "fileTypes": {},
                "metadata": {}
            }
        }
        self.files_by_hash = defaultdict(list)
        self.all_references = set()
        self.existing_files = set()
        
    def calculate_hash(self, file_path):
        """Calculate MD5 hash of file."""
        try:
            md5 = hashlib.md5()
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b''):
                    md5.update(chunk)
            return md5.hexdigest()
        except:
            return None
    
    def scan(self):
        """Scan repository and populate index."""
        print(f"[SCAN] Starting repository scan: {self.repo_root}")
        
        for root, dirs, files in os.walk(self.repo_root):
            # Skip hidden directories and node_modules
            dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'node_modules']
            
            rel_root = Path(root).relative_to(self.repo_root)
            
            # Record directory
            if rel_root != Path('.'):
                self.index["data"]["directories"].append({
                    "path": str(rel_root),
                    "name": Path(root).name,
                    "fileCount": len(files),
                    "subdirectoryCount": len(dirs)
                })
                self.index["summary"]["totalDirectories"] += 1
                
                # Check for empty directories
                if len(files) == 0 and len(dirs) == 0:
                    self.index["summary"]["emptyDirectories"].append(str(rel_root))
            
            # Process files
            for filename in files:
                file_path = Path(root) / filename
                rel_path = file_path.relative_to(self.repo_root)
                
                file_info = self._process_file(file_path, rel_path, filename)
                if file_info:
                    self.index["data"]["files"].append(file_info)
                    self.existing_files.add(str(rel_path))
                    
                    # Track file type
                    ext = file_info["extension"]
                    if ext not in self.index["data"]["fileTypes"]:
                        self.index["data"]["fileTypes"][ext] = []
                    self.index["data"]["fileTypes"][ext].append(str(rel_path))
                    
                    # Update summary
                    self.index["summary"]["totalFiles"] += 1
                    if ext not in self.index["summary"]["fileTypes"]:
                        self.index["summary"]["fileTypes"][ext] = 0
                    self.index["summary"]["fileTypes"][ext] += 1
                    
                    # Track hash for duplicates
                    file_hash = file_info.get("checksum")
                    if file_hash:
                        self.files_by_hash[file_hash].append(str(rel_path))
        
        print(f"[SCAN] Found {self.index['summary']['totalFiles']} files in {self.index['summary']['totalDirectories']} directories")
        
        # Detect issues
        self._detect_duplicates()
        self._detect_broken_references()
        self._detect_orphans()
        
        return self.index
    
    def _process_file(self, file_path, rel_path, filename):
        """Process individual file and extract metadata."""
        try:
            stat = file_path.stat()
            ext = file_path.suffix.lower() if file_path.suffix else "no_extension"
            
            file_info = {
                "path": str(rel_path).replace("\\", "/"),
                "name": filename,
                "extension": ext,
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            }
            
            self.index["summary"]["totalSize"] += stat.st_size
            
            # Calculate hash
            file_hash = self.calculate_hash(file_path)
            if file_hash:
                file_info["checksum"] = file_hash
            
            # Extract metadata for specific file types
            if ext in [".md", ".yaml", ".yml", ".json"]:
                file_info["references"] = self._extract_references(file_path, ext)
                self.all_references.update(file_info["references"])
            
            # Classify file type
            if ext == ".md":
                file_info["type"] = "markdown"
                file_info["metadata"] = self._extract_markdown_metadata(file_path)
            elif ext in [".yaml", ".yml"]:
                file_info["type"] = "yaml"
                file_info["metadata"] = {"format": "yaml"}
            elif ext == ".json":
                file_info["type"] = "json"
                file_info["metadata"] = {"format": "json"}
            elif ext in [".py", ".ps1"]:
                file_info["type"] = "script"
                file_info["metadata"] = {"executable": True}
            else:
                file_info["type"] = "file"
                file_info["metadata"] = {}
            
            return file_info
            
        except Exception as e:
            print(f"[ERROR] Processing {rel_path}: {e}")
            return None
    
    def _extract_references(self, file_path, ext):
        """Extract file references from document."""
        references = []
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Find markdown links
            links = re.findall(r'\[([^\]]+)\]\(([^\)]+)\)', content)
            for _, link in links:
                references.append(link)
            
            # Find file paths
            paths = re.findall(r'([\w\-\.]+(?:/[\w\-\.]+)*)', content)
            for path in paths:
                if '/' in path or '.' in path:
                    references.append(path)
            
        except:
            pass
        
        return list(set(references))
    
    def _extract_markdown_metadata(self, file_path):
        """Extract metadata from markdown file."""
        metadata = {}
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
            
            for line in lines[:20]:  # Check first 20 lines
                if line.startswith("# "):
                    metadata["title"] = line[2:].strip()
                elif line.startswith("## Title"):
                    # Next line usually contains the title
                    continue
                elif line.startswith("## Status"):
                    # Extract status from next line
                    continue
                elif line.startswith("## Version"):
                    # Extract version from next line
                    continue
            
            # Count sections
            section_count = sum(1 for line in lines if line.startswith("#"))
            metadata["sections"] = section_count
            
        except:
            pass
        
        return metadata
    
    def _detect_duplicates(self):
        """Detect duplicate files by hash."""
        for file_hash, files in self.files_by_hash.items():
            if len(files) > 1:
                self.index["summary"]["duplicateFiles"].append({
                    "hash": file_hash,
                    "files": files
                })
        
        print(f"[DETECT] Found {len(self.index['summary']['duplicateFiles'])} duplicate file groups")
    
    def _detect_broken_references(self):
        """Detect references to non-existent files."""
        for reference in self.all_references:
            # Skip URLs and anchors
            if reference.startswith("http") or reference.startswith("#"):
                continue
            
            # Normalize reference
            ref_path = Path(reference).as_posix()
            
            # Check if referenced file exists
            found = False
            for existing in self.existing_files:
                if existing.endswith(ref_path) or ref_path in existing:
                    found = True
                    break
            
            if not found and not reference.startswith("["):
                self.index["summary"]["brokenReferences"].append(reference)
        
        print(f"[DETECT] Found {len(self.index['summary']['brokenReferences'])} potential broken references")
    
    def _detect_orphans(self):
        """Detect orphan documents (not referenced anywhere)."""
        # Documents that are unlikely to be referenced
        critical_extensions = [".md"]
        
        for file_info in self.index["data"]["files"]:
            if file_info["extension"] in critical_extensions:
                # Check if this file is referenced
                found = False
                for references in [f.get("references", []) for f in self.index["data"]["files"]]:
                    if any(file_info["path"] in ref for ref in references):
                        found = True
                        break
                
                if not found:
                    self.index["summary"]["orphanDocuments"].append(file_info["path"])
        
        print(f"[DETECT] Found {len(self.index['summary']['orphanDocuments'])} potential orphan documents")
    
    def save(self, output_path):
        """Save index to JSON file."""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.index, f, indent=2)
        
        print(f"[SAVE] Repository index saved to {output_path}")
        return str(output_path)

def main():
    """Main entry point."""
    if len(sys.argv) > 1:
        repo_root = sys.argv[1]
    else:
        repo_root = os.getcwd()
    
    output_path = os.path.join(repo_root, ".ai", "index", "repository-index.json")
    
    scanner = RepositoryScanner(repo_root)
    index = scanner.scan()
    output = scanner.save(output_path)
    
    print(f"[SUCCESS] Repository scan complete")
    print(json.dumps(index["summary"], indent=2))
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
