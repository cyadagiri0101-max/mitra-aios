"""EOSLoader — discover, validate, and load the Engineering Operating System (.ai)."""

from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from aios.core.config import AIOSConfig
from aios.core.exceptions import EOSLoaderError
from aios.core.logger import get_logger
from aios.utils.serialization import read_json

EOS_DIR_NAME = ".ai"

REQUIRED_KERNEL_FILES: tuple[str, ...] = (
    "CONSTITUTION.md",
    "IDENTITY.md",
    "MISSION.md",
    "ENGINEERING_LAWS.md",
)

REQUIRED_DIRECTORIES: tuple[str, ...] = (
    "kernel",
    "engines",
    "index",
)

REGISTRY_SUFFIX = "-registry.json"


@dataclass(frozen=True, slots=True)
class EOSMetadata:
    """Top-level metadata extracted from the EOS root."""

    version: str
    status: str
    owner: str
    description: str


@dataclass(frozen=True, slots=True)
class EOSRegistryEntry:
    """A single entry inside a registry's data array."""

    id: str
    title: str
    path: str
    category: str
    status: str
    version: str
    owner: str
    last_updated: str
    resolved_links: tuple[str, ...] = ()


@dataclass(slots=True)
class EOSLoadResult:
    """Summary returned by :meth:`EOSLoader.initialize`."""

    eos_root: Path
    metadata: EOSMetadata
    kernel_files: tuple[str, ...]
    registries_loaded: tuple[str, ...]
    documents_indexed: int
    elapsed_seconds: float


class EOSLoader:
    """Discover, validate, and cache the Engineering Operating System.

    The loader is intentionally free of engineering-domain knowledge:
    it treats the ``.ai`` tree as structured data and exposes it through
    a uniform API.
    """

    def __init__(self, config: AIOSConfig) -> None:
        self.config = config
        self.logger = get_logger("aios.eos", config.log_level)
        self._eos_root: Path | None = None
        self._metadata: EOSMetadata | None = None
        self._kernel_docs: dict[str, str] = {}
        self._registries: dict[str, dict[str, Any]] = {}
        self._document_index: dict[str, dict[str, Any]] = {}
        self._initialized: bool = False

    @property
    def eos_root(self) -> Path:
        if self._eos_root is None:
            raise EOSLoaderError("EOSLoader has not been initialized")
        return self._eos_root

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> EOSLoadResult:
        """Full bootstrap: discover, validate, load kernel, load registries."""
        start = time.monotonic()
        self.logger.info("Initializing EOSLoader")

        self._eos_root = self._discover()
        self.validate()
        self._metadata = self._load_metadata()
        self.load_kernel()
        self.load_registries()
        self._build_document_index()

        self._initialized = True
        elapsed = round(time.monotonic() - start, 3)

        result = EOSLoadResult(
            eos_root=self._eos_root,
            metadata=self._metadata,
            kernel_files=tuple(sorted(self._kernel_docs)),
            registries_loaded=tuple(sorted(self._registries)),
            documents_indexed=len(self._document_index),
            elapsed_seconds=elapsed,
        )
        self.logger.info(
            "EOSLoader initialized in %.2fs — %d kernel docs, %d registries, %d indexed docs",
            elapsed,
            len(self._kernel_docs),
            len(self._registries),
            len(self._document_index),
        )
        return result

    def validate(self) -> list[str]:
        """Validate the EOS directory structure.

        Returns a list of warning strings for non-critical issues.
        Raises :class:`EOSLoaderError` for fatal structural problems.
        """
        root = self._eos_root or self._discover()
        self._eos_root = root
        warnings: list[str] = []
        failed: list[str] = []

        if not root.is_dir():
            failed.append(f"EOS root not found: {root}")
            raise EOSLoaderError(
                "EOS directory not found",
                failed_checks=failed,
            )

        for dirname in REQUIRED_DIRECTORIES:
            dirpath = root / dirname
            if not dirpath.is_dir():
                failed.append(f"Required directory missing: {dirname}/")

        kernel_dir = root / "kernel"
        if kernel_dir.is_dir():
            for fname in REQUIRED_KERNEL_FILES:
                if not (kernel_dir / fname).is_file():
                    failed.append(f"Required kernel file missing: kernel/{fname}")

        if failed:
            raise EOSLoaderError(
                "EOS validation failed",
                failed_checks=failed,
            )

        index_dir = root / "index"
        if index_dir.is_dir():
            registry_files = list(index_dir.glob(f"*{REGISTRY_SUFFIX}"))
            if not registry_files:
                warnings.append("index/ contains no registry files")

        return warnings

    def load_kernel(self) -> dict[str, str]:
        """Load all kernel documents into the in-memory cache."""
        root = self.eos_root
        kernel_dir = root / "kernel"
        self._kernel_docs.clear()

        if not kernel_dir.is_dir():
            self.logger.warning("kernel/ directory not found — skipping")
            return dict(self._kernel_docs)

        for md_file in sorted(kernel_dir.glob("*.md")):
            content = md_file.read_text(encoding="utf-8")
            key = md_file.stem
            self._kernel_docs[key] = content
            self.logger.debug("Loaded kernel doc: %s", key)

        self.logger.info("Loaded %d kernel documents", len(self._kernel_docs))
        return dict(self._kernel_docs)

    def load_registries(self) -> dict[str, dict[str, Any]]:
        """Load all machine-readable registries from index/."""
        root = self.eos_root
        index_dir = root / "index"
        self._registries.clear()

        if not index_dir.is_dir():
            self.logger.warning("index/ directory not found — skipping registries")
            return dict(self._registries)

        for json_file in sorted(index_dir.glob(f"*{REGISTRY_SUFFIX}")):
            name = json_file.stem.removesuffix("-registry")
            try:
                data = read_json(json_file)
                self._registries[name] = data
                self.logger.debug("Loaded registry: %s", name)
            except Exception as exc:
                self.logger.warning("Failed to load registry %s: %s", name, exc)

        self.logger.info("Loaded %d registries", len(self._registries))
        return dict(self._registries)

    def get_registry(self, name: str) -> dict[str, Any]:
        """Return a loaded registry by name (without the ``-registry`` suffix)."""
        if name not in self._registries:
            available = sorted(self._registries)
            raise EOSLoaderError(
                f"Registry not found: {name}",
                details={"available": available},
            )
        return self._registries[name]

    def get_registry_entries(self, name: str) -> list[EOSRegistryEntry]:
        """Parse a registry's data array into typed entries."""
        registry = self.get_registry(name)
        data = registry.get("data", {})
        entries: list[EOSRegistryEntry] = []

        for key, items in data.items():
            if not isinstance(items, list):
                continue
            for item in items:
                if not isinstance(item, dict) or "id" not in item:
                    continue
                links = item.get("resolved_links") or []
                entries.append(
                    EOSRegistryEntry(
                        id=str(item["id"]),
                        title=str(item.get("title", "")),
                        path=str(item.get("path", "")),
                        category=str(item.get("category", "")),
                        status=str(item.get("status", "")),
                        version=str(item.get("version", "")),
                        owner=str(item.get("owner", "")),
                        last_updated=str(item.get("last_updated", "")),
                        resolved_links=tuple(str(link) for link in links),
                    )
                )

        return entries

    def get_document(self, path: str) -> str:
        """Return the text content of an EOS document by relative path."""
        root = self.eos_root
        full = root / path
        if not full.is_file():
            raise EOSLoaderError(
                f"Document not found: {path}",
                details={"resolved": str(full)},
            )
        return full.read_text(encoding="utf-8")

    def get_kernel_doc(self, name: str) -> str:
        """Return a kernel document by stem name (e.g. ``CONSTITUTION``)."""
        if name not in self._kernel_docs:
            available = sorted(self._kernel_docs)
            raise EOSLoaderError(
                f"Kernel document not found: {name}",
                details={"available": available},
            )
        return self._kernel_docs[name]

    def get_document_metadata(self, path: str) -> dict[str, Any] | None:
        """Return the document-registry metadata for a given relative path."""
        return self._document_index.get(path)

    def reload(self) -> EOSLoadResult:
        """Clear all caches and re-initialize from disk."""
        self.logger.info("Reloading EOS")
        self._kernel_docs.clear()
        self._registries.clear()
        self._document_index.clear()
        self._metadata = None
        self._initialized = False
        return self.initialize()

    def _discover(self) -> Path:
        root = self.config.repo_root / EOS_DIR_NAME
        if not root.is_dir():
            raise EOSLoaderError(
                f"EOS directory not found at {root}",
                failed_checks=[f"{EOS_DIR_NAME}/ missing from repo root"],
            )
        return root

    def _load_metadata(self) -> EOSMetadata:
        root = self.eos_root
        readme = root / "README.md"
        if not readme.is_file():
            return EOSMetadata(
                version="unknown",
                status="unknown",
                owner="unknown",
                description="",
            )

        content = readme.read_text(encoding="utf-8")
        return EOSMetadata(
            version=self._extract_field(content, "Version") or "unknown",
            status=self._extract_field(content, "Status") or "unknown",
            owner=self._extract_field(content, "Owner") or "unknown",
            description=self._extract_description(content),
        )

    @staticmethod
    def _extract_field(content: str, field_name: str) -> str | None:
        marker = f"**{field_name}:**"
        for line in content.splitlines():
            if marker not in line:
                continue
            _, _, after = line.partition(marker)
            value = after.split("|")[0].strip().strip("*").strip()
            if value:
                return value
        return None

    @staticmethod
    def _extract_description(content: str) -> str:
        lines = content.splitlines()
        for i, line in enumerate(lines):
            if line.startswith("# "):
                for subsequent in lines[i + 1 :]:
                    stripped = subsequent.strip()
                    if not stripped:
                        continue
                    if stripped.startswith("**"):
                        continue
                    return stripped
        return ""

    def _build_document_index(self) -> None:
        self._document_index.clear()
        doc_registry = self._registries.get("document")
        if doc_registry is None:
            return

        data = doc_registry.get("data", {})
        for key, items in data.items():
            if not isinstance(items, list):
                continue
            for item in items:
                if isinstance(item, dict) and "path" in item:
                    self._document_index[str(item["path"])] = item
