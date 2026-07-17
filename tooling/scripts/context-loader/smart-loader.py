#!/usr/bin/env python3
"""
AIOS Smart Context Loader - Minimal Context Loading
Load only required files based on mode with token budgeting.
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, List
import sys

class ContextProfile:
    """Define context loading profiles for each mode."""
    
    PROFILES = {
        "discovery": {
            "description": "Exploratory mode - learning and discovery",
            "maxTokens": 8000,
            "files": [
                "state/project.yaml",
                "index/consolidated-index.json",
                "knowledge/glossary.json"
            ]
        },
        "architecture": {
            "description": "Design mode - system architecture",
            "maxTokens": 12000,
            "files": [
                "state/project.yaml",
                "index/consolidated-index.json",
                "knowledge/architecture.json",
                "knowledge/decisions.json"
            ]
        },
        "implementation": {
            "description": "Execution mode - building solutions",
            "maxTokens": 16000,
            "files": [
                "state/project.yaml",
                "state/next-task.yaml",
                "index/consolidated-index.json",
                "knowledge/framework.json",
                "knowledge/patterns.json"
            ]
        },
        "validation": {
            "description": "Testing mode - verification",
            "maxTokens": 10000,
            "files": [
                "state/project.yaml",
                "state/session.yaml",
                "index/consolidated-index.json",
                "knowledge/glossary.json"
            ]
        },
        "review": {
            "description": "Quality mode - code and design review",
            "maxTokens": 14000,
            "files": [
                "state/project.yaml",
                "index/consolidated-index.json",
                "knowledge/patterns.json",
                "knowledge/decisions.json"
            ]
        },
        "governance": {
            "description": "Compliance mode - audit and governance",
            "maxTokens": 9000,
            "files": [
                "state/project.yaml",
                "index/consolidated-index.json"
            ]
        },
        "release": {
            "description": "Deployment mode - releases and operations",
            "maxTokens": 11000,
            "files": [
                "state/project.yaml",
                "state/repository.yaml",
                "index/consolidated-index.json"
            ]
        }
    }

class TokenAnalyzer:
    """Estimate token usage and costs."""
    
    # Token estimation: 1 token ≈ 4 characters average
    CHARS_PER_TOKEN = 4
    
    # Cost models (USD per 1M tokens)
    COST_MODELS = {
        "claude-haiku": 0.25,
        "claude-sonnet": 3.00,
        "claude-opus": 15.00,
        "gpt-4": 30.00,
        "gpt-4-turbo": 10.00
    }
    
    @staticmethod
    def estimate_tokens(text: str) -> int:
        """Estimate tokens from text."""
        return max(1, len(text.encode('utf-8')) // TokenAnalyzer.CHARS_PER_TOKEN)
    
    @staticmethod
    def estimate_cost(tokens: int, model: str = "claude-haiku") -> float:
        """Estimate cost for given tokens and model."""
        cost_per_million = TokenAnalyzer.COST_MODELS.get(model, 1.0)
        return (tokens / 1_000_000) * cost_per_million
    
    @staticmethod
    def format_tokens(tokens: int) -> str:
        """Format token count for display."""
        if tokens >= 1_000_000:
            return f"{tokens / 1_000_000:.2f}M"
        elif tokens >= 1_000:
            return f"{tokens / 1_000:.1f}K"
        else:
            return str(tokens)

class SmartContextLoader:
    """Load minimum context based on mode."""
    
    def __init__(self, repo_root: str):
        self.repo_root = Path(repo_root).resolve()
        self.ai_root = self.repo_root / ".ai"
        self.loaded_files = set()
        self.total_size = 0
        self.total_tokens = 0
    
    def load_for_mode(self, mode: str) -> Dict[str, Any]:
        """Load context for specific mode."""
        if mode not in ContextProfile.PROFILES:
            raise ValueError(f"Unknown mode: {mode}. Available: {list(ContextProfile.PROFILES.keys())}")
        
        profile = ContextProfile.PROFILES[mode]
        
        context = {
            "mode": mode,
            "description": profile["description"],
            "maxTokens": profile["maxTokens"],
            "profile": {},
            "metrics": {}
        }
        
        print(f"\n[LOAD] Mode: {mode}")
        print(f"[LOAD] Max tokens: {TokenAnalyzer.format_tokens(profile['maxTokens'])}")
        print(f"[LOAD] Files to load: {len(profile['files'])}\n")
        
        self.loaded_files.clear()
        self.total_size = 0
        self.total_tokens = 0
        
        # Load each required file
        for file_path in profile["files"]:
            full_path = self.ai_root / file_path
            if full_path.exists():
                data = self._load_file(full_path)
                if data:
                    # Extract section name for context
                    section = file_path.split('/')[-1].replace('.yaml', '').replace('.json', '')
                    context["profile"][section] = data
                    self.loaded_files.add(file_path)
            else:
                print(f"[WARN] File not found: {file_path}")
        
        # Calculate metrics
        context["metrics"] = self._calculate_metrics(profile["maxTokens"])
        
        return context
    
    def _load_file(self, file_path: Path) -> Any:
        """Load individual file with size tracking."""
        try:
            stat = file_path.stat()
            size = stat.st_size
            
            # Load content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse format
            if file_path.suffix == '.json':
                data = json.loads(content)
            elif file_path.suffix in ['.yaml', '.yml']:
                import yaml
                try:
                    data = yaml.safe_load(content)
                except:
                    # Fallback: load as JSON
                    data = json.loads(content)
            else:
                data = content
            
            # Track metrics
            tokens = TokenAnalyzer.estimate_tokens(content)
            self.total_size += size
            self.total_tokens += tokens
            
            print(f"[OK] {file_path.name}: {size:,} bytes ({TokenAnalyzer.format_tokens(tokens)} tokens)")
            
            return data
        except Exception as e:
            print(f"[ERROR] Loading {file_path}: {e}")
            return None
    
    def _calculate_metrics(self, max_tokens: int) -> Dict[str, Any]:
        """Calculate context metrics and warnings."""
        metrics = {
            "filesLoaded": len(self.loaded_files),
            "totalSize": self.total_size,
            "totalTokens": self.total_tokens,
            "maxTokens": max_tokens,
            "utilizationPercent": int((self.total_tokens / max_tokens * 100)) if max_tokens > 0 else 0,
            "availableTokens": max(0, max_tokens - self.total_tokens),
            "costEstimates": {
                "claude-haiku": f"${TokenAnalyzer.estimate_cost(self.total_tokens, 'claude-haiku'):.4f}",
                "claude-sonnet": f"${TokenAnalyzer.estimate_cost(self.total_tokens, 'claude-sonnet'):.4f}",
                "gpt-4-turbo": f"${TokenAnalyzer.estimate_cost(self.total_tokens, 'gpt-4-turbo'):.4f}"
            },
            "warnings": self._check_warnings(max_tokens)
        }
        
        return metrics
    
    def _check_warnings(self, max_tokens: int) -> List[str]:
        """Check for context warnings."""
        warnings = []
        
        utilization = (self.total_tokens / max_tokens * 100) if max_tokens > 0 else 0
        
        if utilization >= 90:
            warnings.append(f"⚠ CRITICAL: Context utilization {utilization:.1f}% - approaching limit")
        elif utilization >= 75:
            warnings.append(f"⚠ WARNING: Context utilization {utilization:.1f}% - high usage")
        
        return warnings
    
    def print_summary(self, context: Dict[str, Any]):
        """Print context loading summary."""
        metrics = context["metrics"]
        
        print(f"\n{'='*60}")
        print(f"CONTEXT LOADING SUMMARY")
        print(f"{'='*60}")
        print(f"Mode:                 {context['mode'].upper()}")
        print(f"Description:          {context['description']}")
        print(f"Files Loaded:         {metrics['filesLoaded']}")
        print(f"Total Size:           {metrics['totalSize']:,} bytes ({metrics['totalSize']/1024:.1f} KB)")
        print(f"Token Usage:          {TokenAnalyzer.format_tokens(metrics['totalTokens'])} / {TokenAnalyzer.format_tokens(metrics['maxTokens'])}")
        print(f"Utilization:          {metrics['utilizationPercent']}%")
        print(f"Available Tokens:     {TokenAnalyzer.format_tokens(metrics['availableTokens'])}")
        print(f"\nCost Estimates (this load):")
        for model, cost in metrics['costEstimates'].items():
            print(f"  {model:20} {cost}")
        
        if metrics['warnings']:
            print(f"\nWarnings:")
            for warning in metrics['warnings']:
                print(f"  {warning}")
        
        print(f"{'='*60}\n")

def main():
    """Main entry point."""
    import sys
    
    repo_root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    mode = sys.argv[2] if len(sys.argv) > 2 else "discovery"
    
    # Try to import yaml for YAML parsing
    try:
        import yaml
    except ImportError:
        print("[WARN] PyYAML not available, YAML files will be loaded as JSON")
    
    try:
        loader = SmartContextLoader(repo_root)
        context = loader.load_for_mode(mode)
        loader.print_summary(context)
        
        # Optionally save context
        output_path = Path(repo_root) / ".ai" / "cache" / f"context-{mode}.json"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(context, f, indent=2, default=str)
        
        print(f"[SAVE] Mode-specific context saved to {output_path}\n")
        return 0
    
    except Exception as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
