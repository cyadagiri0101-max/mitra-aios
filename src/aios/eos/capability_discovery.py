"""CapabilityDiscovery — discover reusable engineering capabilities before implementation."""

from __future__ import annotations

import re
import threading
from dataclasses import dataclass, field

from aios.core.exceptions import CapabilityDiscoveryError
from aios.core.logger import get_logger
from aios.eos.loader import EOSRegistryEntry
from aios.eos.registry import RegistryManager

_REGISTRY_SOURCES: tuple[str, ...] = (
    "engine",
    "agent",
    "playbook",
    "template",
    "knowledge",
    "capability",
    "prompt",
    "checklist",
    "workflow",
)

_DEPRECATED_STATUSES: tuple[str, ...] = (
    "deprecated",
    "deprecated — pending maintainer removal",
)

_STOP_WORDS: frozenset[str] = frozenset({
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "can", "shall", "this", "that",
    "these", "those", "it", "its", "as", "if", "not", "no", "so", "than",
    "too", "very", "just", "about", "also", "then", "more", "some", "any",
    "all", "each", "every", "both", "few", "most", "other", "such", "only",
    "own", "same", "up", "out", "what", "which", "who", "when", "where",
    "how", "need", "needs", "want", "wants", "use", "using", "used",
})

_MIN_TOKEN_LEN = 3


@dataclass(frozen=True, slots=True)
class Capability:
    """An enriched registry entry representing a discoverable capability."""

    entry: EOSRegistryEntry
    source_registry: str
    is_deprecated: bool = False


@dataclass(frozen=True, slots=True)
class CapabilityMatch:
    """A capability with a relevance score."""

    capability: Capability
    score: float
    match_reason: str = ""


@dataclass(slots=True)
class CapabilityValidationResult:
    """Outcome of :meth:`CapabilityDiscovery.validate`."""

    is_valid: bool = True
    duplicate_ids: list[str] = field(default_factory=list)
    deprecated_capabilities: list[str] = field(default_factory=list)
    missing_implementations: list[str] = field(default_factory=list)
    circular_references: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


class CapabilityDiscovery:
    """Discover reusable engineering capabilities before implementation.

    Sits above :class:`RegistryManager` and aggregates capabilities from
    all known registries. Provides search, recommendation, and validation.
    """

    def __init__(self) -> None:
        self.logger = get_logger("aios.eos.capability_discovery")
        self._registry_manager: RegistryManager | None = None
        self._capabilities: dict[str, Capability] = {}
        self._by_category: dict[str, list[str]] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def registry_manager(self) -> RegistryManager:
        if self._registry_manager is None:
            raise CapabilityDiscoveryError(
                "CapabilityDiscovery has not been initialized"
            )
        return self._registry_manager

    def initialize(self, registry_manager: RegistryManager) -> CapabilityDiscovery:
        """Bind to an initialized RegistryManager and discover capabilities."""
        if not registry_manager.is_initialized:
            raise CapabilityDiscoveryError(
                "RegistryManager must be initialized before passing to CapabilityDiscovery"
            )

        with self._lock:
            self._registry_manager = registry_manager
            self._capabilities.clear()
            self._by_category.clear()

        self.discover()
        self._initialized = True

        self.logger.info(
            "CapabilityDiscovery initialized — %d capabilities from %d registries",
            len(self._capabilities),
            len(_REGISTRY_SOURCES),
        )
        return self

    def discover(self) -> list[Capability]:
        """Aggregate capabilities from all registries via RegistryManager."""
        rm = self.registry_manager
        collected: dict[str, Capability] = {}

        for source in _REGISTRY_SOURCES:
            try:
                entries = rm.get(source)
            except Exception:
                continue

            for entry in entries:
                is_dep = entry.status.lower() in _DEPRECATED_STATUSES
                cap = Capability(
                    entry=entry,
                    source_registry=source,
                    is_deprecated=is_dep,
                )
                collected[entry.id] = cap

        with self._lock:
            self._capabilities = collected
            self._by_category.clear()
            for cap in collected.values():
                cat = cap.entry.category
                self._by_category.setdefault(cat, []).append(cap.entry.id)

        return list(collected.values())

    def find(self, capability_id: str) -> Capability | None:
        """Look up a capability by exact ID."""
        return self._capabilities.get(capability_id)

    def search(self, query: str) -> list[CapabilityMatch]:
        """Fuzzy search across all capabilities.

        Returns matches ranked by relevance score (descending).
        """
        if not query or not query.strip():
            return []

        tokens = self._tokenize(query)
        if not tokens:
            return []

        matches: list[CapabilityMatch] = []

        for cap in self._capabilities.values():
            score, reason = self._score_capability(cap, tokens)
            if score > 0:
                matches.append(CapabilityMatch(
                    capability=cap,
                    score=score,
                    match_reason=reason,
                ))

        matches.sort(key=lambda m: m.score, reverse=True)
        return matches

    def recommend(self, task_description: str, limit: int = 10) -> list[CapabilityMatch]:
        """Recommend capabilities based on a task description.

        Extracts meaningful keywords and ranks capabilities by relevance.
        """
        if not task_description or not task_description.strip():
            return []

        tokens = self._tokenize(task_description)
        if not tokens:
            return []

        matches: list[CapabilityMatch] = []

        for cap in self._capabilities.values():
            if cap.is_deprecated:
                continue
            score, reason = self._score_recommendation(cap, tokens)
            if score > 0:
                matches.append(CapabilityMatch(
                    capability=cap,
                    score=score,
                    match_reason=reason,
                ))

        matches.sort(key=lambda m: m.score, reverse=True)
        return matches[:limit]

    def by_category(self, category: str) -> list[Capability]:
        """Return all capabilities in a given category."""
        ids = self._by_category.get(category, [])
        return [self._capabilities[cid] for cid in ids if cid in self._capabilities]

    def implemented(self) -> list[Capability]:
        """Return all non-deprecated, active capabilities."""
        return [
            cap for cap in self._capabilities.values()
            if not cap.is_deprecated and cap.entry.status.lower() == "active"
        ]

    def pending(self) -> list[Capability]:
        """Return capabilities with scaffolding, draft, or proposed status."""
        pending_statuses = {"scaffolding", "draft", "proposed", "open"}
        return [
            cap for cap in self._capabilities.values()
            if cap.entry.status.lower() in pending_statuses
        ]

    def deprecated(self) -> list[Capability]:
        """Return all deprecated capabilities."""
        return [cap for cap in self._capabilities.values() if cap.is_deprecated]

    def validate(self) -> CapabilityValidationResult:
        """Validate capability integrity."""
        result = CapabilityValidationResult()

        self._check_duplicate_ids(result)
        self._check_deprecated(result)
        self._check_missing_implementations(result)
        self._check_circular_references(result)

        if result.duplicate_ids:
            result.is_valid = False
        if result.missing_implementations:
            result.warnings.append(
                f"{len(result.missing_implementations)} missing implementation(s)"
            )
        if result.circular_references:
            result.is_valid = False

        self.logger.info(
            "Capability validation: valid=%s, duplicates=%d, deprecated=%d, missing=%d, circular=%d",
            result.is_valid,
            len(result.duplicate_ids),
            len(result.deprecated_capabilities),
            len(result.missing_implementations),
            len(result.circular_references),
        )
        return result

    def reload(self) -> CapabilityDiscovery:
        """Clear caches and re-discover from the bound RegistryManager."""
        self.logger.info("Reloading CapabilityDiscovery")
        with self._lock:
            self._capabilities.clear()
            self._by_category.clear()
        if self._registry_manager is not None:
            self.discover()
        return self

    def _score_capability(
        self, cap: Capability, tokens: list[str]
    ) -> tuple[float, str]:
        entry = cap.entry
        score = 0.0
        reasons: list[str] = []

        id_lower = entry.id.lower()
        title_lower = entry.title.lower()
        path_lower = entry.path.lower()
        category_lower = entry.category.lower()

        for token in tokens:
            if token in id_lower:
                score += 10.0
                reasons.append(f"id:{token}")
            if token in title_lower:
                score += 8.0
                reasons.append(f"title:{token}")
            if token in path_lower:
                score += 4.0
                reasons.append(f"path:{token}")
            if token in category_lower:
                score += 3.0
                reasons.append(f"category:{token}")
            for link in entry.resolved_links:
                if token in link.lower():
                    score += 2.0
                    reasons.append(f"link:{token}")
                    break

        if score == 0:
            return 0.0, ""

        return score, ", ".join(reasons[:5])

    def _score_recommendation(
        self, cap: Capability, tokens: list[str]
    ) -> tuple[float, str]:
        entry = cap.entry
        score = 0.0
        matched_tokens: list[str] = []

        searchable = " ".join([
            entry.id,
            entry.title,
            entry.category,
            entry.path,
        ]).lower()

        for token in tokens:
            if token in searchable:
                score += 1.0
                matched_tokens.append(token)

        if score == 0:
            return 0.0, ""

        coverage = len(matched_tokens) / len(tokens)
        score *= (1.0 + coverage)

        if entry.status.lower() == "active":
            score *= 1.2

        return round(score, 3), f"matched {len(matched_tokens)}/{len(tokens)} tokens"

    def _check_duplicate_ids(self, result: CapabilityValidationResult) -> None:
        seen: dict[str, list[str]] = {}
        for cap in self._capabilities.values():
            seen.setdefault(cap.entry.id, []).append(cap.source_registry)

        for cap_id, sources in seen.items():
            if len(sources) > 1:
                result.duplicate_ids.append(cap_id)

    def _check_deprecated(self, result: CapabilityValidationResult) -> None:
        for cap in self._capabilities.values():
            if cap.is_deprecated:
                result.deprecated_capabilities.append(cap.entry.id)

    def _check_missing_implementations(
        self, result: CapabilityValidationResult
    ) -> None:
        for cap in self._capabilities.values():
            if cap.source_registry == "capability":
                if cap.entry.status.lower() in {"scaffolding", "placeholder"}:
                    result.missing_implementations.append(cap.entry.id)

    def _check_circular_references(
        self, result: CapabilityValidationResult
    ) -> None:
        adjacency: dict[str, set[str]] = {}
        known_ids = set(self._capabilities)

        for cap in self._capabilities.values():
            deps: set[str] = set()
            for link in cap.entry.resolved_links:
                for other_id in known_ids:
                    if link in other_id or other_id.split("::")[-1].lower() in link.lower():
                        if other_id != cap.entry.id:
                            deps.add(other_id)
            if deps:
                adjacency[cap.entry.id] = deps

        visited: set[str] = set()
        rec_stack: set[str] = set()

        def dfs(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)
            for neighbor in adjacency.get(node, set()):
                if neighbor not in visited:
                    if dfs(neighbor):
                        return True
                elif neighbor in rec_stack:
                    result.circular_references.append(
                        f"{node} -> {neighbor}"
                    )
                    return True
            rec_stack.discard(node)
            return False

        for node in adjacency:
            if node not in visited:
                dfs(node)

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        words = re.findall(r"[a-zA-Z][a-zA-Z0-9_-]*", text.lower())
        return [
            w for w in words
            if len(w) >= _MIN_TOKEN_LEN and w not in _STOP_WORDS
        ]
