"""File classification by extension and content heuristics."""

from __future__ import annotations

_LANGUAGE_MAP: dict[str, str] = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".rs": "rust",
    ".go": "go",
    ".java": "java",
    ".cs": "csharp",
    ".rb": "ruby",
    ".sh": "shell",
    ".ps1": "powershell",
    ".bat": "batch",
    ".md": "markdown",
    ".rst": "restructuredtext",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".xml": "xml",
    ".html": "html",
    ".css": "css",
    ".sql": "sql",
    ".graphql": "graphql",
}

_TYPE_MAP: dict[str, str] = {
    ".md": "document",
    ".rst": "document",
    ".txt": "document",
    ".py": "code",
    ".ts": "code",
    ".tsx": "code",
    ".js": "code",
    ".jsx": "code",
    ".rs": "code",
    ".go": "code",
    ".java": "code",
    ".cs": "code",
    ".rb": "code",
    ".sh": "code",
    ".ps1": "code",
    ".bat": "code",
    ".json": "config",
    ".yaml": "config",
    ".yml": "config",
    ".toml": "config",
    ".ini": "config",
    ".cfg": "config",
    ".conf": "config",
    ".env": "config",
    ".xml": "config",
    ".html": "markup",
    ".css": "markup",
    ".png": "image",
    ".jpg": "image",
    ".jpeg": "image",
    ".gif": "image",
    ".svg": "image",
    ".glb": "model",
    ".xlsx": "data",
    ".csv": "data",
    ".db": "data",
    ".docx": "document",
}


class FileClassifier:
    """Classify files by extension into type and language categories."""

    def classify_type(self, extension: str) -> str:
        """Return the file type category for the given extension."""
        return _TYPE_MAP.get(extension.lower(), "file")

    def classify_language(self, extension: str) -> str | None:
        """Return the programming language for the given extension, or None."""
        return _LANGUAGE_MAP.get(extension.lower())

    def is_document(self, extension: str) -> bool:
        return self.classify_type(extension) == "document"

    def is_code(self, extension: str) -> bool:
        return self.classify_type(extension) == "code"

    def is_config(self, extension: str) -> bool:
        return self.classify_type(extension) == "config"

    def is_binary(self, extension: str) -> bool:
        return self.classify_type(extension) in {"image", "model", "data"}

    def is_text_readable(self, extension: str) -> bool:
        return self.classify_type(extension) in {
            "document",
            "code",
            "config",
            "markup",
        }
