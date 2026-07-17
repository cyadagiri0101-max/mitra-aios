"""RegistryManager — typed access, caching, schema validation, and integrity checks on top of EOSLoader."""

from __future__ import annotations

import threading
from dataclasses import dataclass, field
from typing import Any

from aios.core.exceptions import RegistryManagerError
from aios.core.logger import get_logger
from aios.eos.loader import EOSLoader, EOSRegistryEntry

_REGISTRY_REQUIRED_FIELDS: tuple[str, ...] = (
    "schemaVersion",
    "status",
    "data",
)

_ENTRY_REQUIRED_FIELDS: tuple[str, ...] = (
    "id",
    "title",
    "path",
)

_REGISTRY_ACCESSOR_MAP: dict[str, str] = {
    "engines": "engine",
    "agents": "agent",
    "playbooks": "playbook",
    "templates": "template",
    "knowledge": "knowledge",
    "capabilities": "capability",
    "prompts": "prompt",
    "documents": "document",
}


@dataclass(slots=True)
class RegistryValidationResult:
    """Outcome of :meth:`RegistryManager.validate`."""

    is_valid: bool = True
    schema_issues: list[str] = field(default_factory=list)
    duplicate_ids: list[str] = field(default_factory=list)
    orphan_references: list[tuple[str, str]] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


class RegistryManager:
    """Sits on top of :class:`EOSLoader` to provide typed registry access.

    Responsibilities:
    - Use EOSLoader as the only source of registry data.
    - Cache parsed registry entries per registry name.
    - Validate registry schemas and entry structure.
    - Detect duplicate IDs across all registries.
    - Detect orphan references (resolved_links pointing to non-existent paths).
    - Provide typed accessors for each known registry category.
    """

    def __init__(self) -> None:
        self.logger = get_logger("aios.eos.registry")
        self._loader: EOSLoader | None = None
        self._cache: dict[str, list[EOSRegistryEntry]] = {}
        self._known_paths: set[str] = set()
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def loader(self) -> EOSLoader:
        if self._loader is None:
            raise RegistryManagerError("RegistryManager has not been initialized")
        return self._loader

    def initialize(self, loader: EOSLoader) -> RegistryManager:
        """Bind to an initialized EOSLoader and build caches."""
        if not loader.is_initialized:
            raise RegistryManagerError(
                "EOSLoader must be initialized before passing to RegistryManager"
            )

        with self._lock:
            self._loader = loader
            self._cache.clear()
            self._known_paths.clear()
            self._build_path_index()
            self._initialized = True

        self.logger.info(
            "RegistryManager initialized — %d known document paths",
            len(self._known_paths),
        )
        return self

    def engines(self) -> list[EOSRegistryEntry]:
        return self._get_cached("engine")

    def agents(self) -> list[EOSRegistryEntry]:
        return self._get_cached("agent")

    def playbooks(self) -> list[EOSRegistryEntry]:
        return self._get_cached("playbook")

    def templates(self) -> list[EOSRegistryEntry]:
        return self._get_cached("template")

    def knowledge(self) -> list[EOSRegistryEntry]:
        return self._get_cached("knowledge")

    def capabilities(self) -> list[EOSRegistryEntry]:
        return self._get_cached("capability")

    def prompts(self) -> list[EOSRegistryEntry]:
        return self._get_cached("prompt")

    def documents(self) -> list[EOSRegistryEntry]:
        return self._get_cached("document")

    def get(self, name: str) -> list[EOSRegistryEntry]:
        """Return typed entries for any registry by its base name."""
        return self._get_cached(name)

    def validate(self) -> RegistryValidationResult:
        """Validate all loaded registries for schema, duplicates, and orphans."""
        result = RegistryValidationResult()
        loader = self.loader

        all_ids: dict[str, list[str]] = {}

        for reg_name in self._available_registries():
            raw = loader.get_registry(reg_name)
            self._check_schema(reg_name, raw, result)

            entries = self._get_cached(reg_name)
            for entry in entries:
                self._check_entry_fields(reg_name, entry, raw, result)
                all_ids.setdefault(entry.id, []).append(reg_name)

        for entry_id, sources in all_ids.items():
            if len(sources) > 1:
                result.duplicate_ids.append(entry_id)
                result.is_valid = False

        self._check_orphan_references(result)

        if result.schema_issues:
            result.is_valid = False

        if result.orphan_references:
            result.warnings.append(
                f"{len(result.orphan_references)} orphan reference(s) detected"
            )

        self.logger.info(
            "Registry validation: valid=%s, schema_issues=%d, duplicates=%d, orphans=%d",
            result.is_valid,
            len(result.schema_issues),
            len(result.duplicate_ids),
            len(result.orphan_references),
        )
        return result

    def reload(self) -> RegistryManager:
        """Clear caches and re-initialize from the bound loader."""
        self.logger.info("Reloading RegistryManager")
        with self._lock:
            self._cache.clear()
            self._known_paths.clear()
            if self._loader is not None:
                self._build_path_index()
        return self

    def _get_cached(self, name: str) -> list[EOSRegistryEntry]:
        with self._lock:
            if name in self._cache:
                return list(self._cache[name])

        loader = self.loader
        try:
            entries = loader.get_registry_entries(name)
        except Exception as exc:
            raise RegistryManagerError(
                f"Registry not available: {name}",
                details={"cause": str(exc)},
            ) from exc

        with self._lock:
            self._cache[name] = entries

        return list(entries)

    def _build_path_index(self) -> None:
        loader = self._loader
        if loader is None:
            return

        try:
            doc_entries = loader.get_registry_entries("document")
        except Exception:
            doc_entries = []

        for entry in doc_entries:
            if entry.path:
                self._known_paths.add(entry.path)

    def _available_registries(self) -> list[str]:
        loader = self.loader
        try:
            raw_registries = loader.load_registries()
        except Exception:
            return []
        return sorted(raw_registries)

    def _check_schema(
        self,
        name: str,
        raw: dict[str, Any],
        result: RegistryValidationResult,
    ) -> None:
        for field_name in _REGISTRY_REQUIRED_FIELDS:
            if field_name not in raw:
                result.schema_issues.append(
                    f"{name}: missing required field '{field_name}'"
                )

        data = raw.get("data")
        if data is not None and not isinstance(data, dict):
            result.schema_issues.append(
                f"{name}: 'data' must be an object, got {type(data).__name__}"
            )

    def _check_entry_fields(
        self,
        reg_name: str,
        entry: EOSRegistryEntry,
        raw: dict[str, Any],
        result: RegistryValidationResult,
    ) -> None:
        data = raw.get("data", {})
        for key, items in data.items():
            if not isinstance(items, list):
                continue
            for item in items:
                if not isinstance(item, dict):
                    continue
                item_id = item.get("id", "")
                if item_id == entry.id:
                    for field_name in _ENTRY_REQUIRED_FIELDS:
                        if not item.get(field_name):
                            result.schema_issues.append(
                                f"{reg_name}::{item_id}: missing or empty '{field_name}'"
                            )

    def _check_orphan_references(self, result: RegistryValidationResult) -> None:
        if not self._known_paths:
            return

        for reg_name in _REGISTRY_ACCESSOR_MAP.values():
            try:
                entries = self._get_cached(reg_name)
            except RegistryManagerError:
                continue

            for entry in entries:
                for link in entry.resolved_links:
                    if link and link not in self._known_paths:
                        result.orphan_references.append((entry.id, link))
