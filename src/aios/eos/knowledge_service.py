"""KnowledgeService — discover, retrieve, rank, and relate engineering knowledge stored in the EOS."""

from __future__ import annotations

import re
import threading
from dataclasses import dataclass, field

from aios.core.exceptions import KnowledgeServiceError
from aios.core.logger import get_logger
from aios.eos.capability_discovery import CapabilityDiscovery
from aios.eos.loader import EOSRegistryEntry
from aios.eos.registry import RegistryManager

_REGISTRY_SOURCES: tuple[str, ...] = (
    "document",
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

_WEIGHT_ID = 10.0
_WEIGHT_TITLE = 8.0
_WEIGHT_PATH = 4.0
_WEIGHT_CATEGORY = 3.0
_WEIGHT_LINK = 2.0
_ACTIVE_BOOST = 1.2


@dataclass(frozen=True, slots=True)
class KnowledgeDocument:
    """An indexed document with graph metadata."""

    entry: EOSRegistryEntry
    source_registry: str
    forward_deps: tuple[str, ...] = ()
    reverse_deps: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class KnowledgeMatch:
    """A document with a relevance score."""

    document: KnowledgeDocument
    score: float
    match_reason: str = ""


@dataclass(slots=True)
class KnowledgeValidationResult:
    """Outcome of :meth:`KnowledgeService.validate`."""

    is_valid: bool = True
    broken_links: list[tuple[str, str]] = field(default_factory=list)
    orphan_documents: list[str] = field(default_factory=list)
    circular_references: list[str] = field(default_factory=list)
    index_inconsistencies: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class KnowledgeStatistics:
    """Summary statistics about the knowledge index."""

    total_documents: int
    total_categories: int
    total_links: int
    total_orphans: int
    categories: tuple[str, ...]
    average_links_per_document: float


class KnowledgeService:
    """Discover, retrieve, rank, and relate engineering knowledge stored in the EOS.

    Sits above :class:`CapabilityDiscovery` and :class:`RegistryManager`.
    Builds an indexed knowledge graph from all registry entries and provides
    search, related-document discovery, dependency traversal, and validation.
    """

    def __init__(self) -> None:
        self.logger = get_logger("aios.eos.knowledge_service")
        self._registry_manager: RegistryManager | None = None
        self._capability_discovery: CapabilityDiscovery | None = None
        self._documents: dict[str, KnowledgeDocument] = {}
        self._by_category: dict[str, list[str]] = {}
        self._forward_adj: dict[str, set[str]] = {}
        self._reverse_adj: dict[str, set[str]] = {}
        self._inverted_index: dict[str, set[str]] = {}
        self._search_cache: dict[str, list[KnowledgeMatch]] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def registry_manager(self) -> RegistryManager:
        if self._registry_manager is None:
            raise KnowledgeServiceError(
                "KnowledgeService has not been initialized"
            )
        return self._registry_manager

    @property
    def capability_discovery(self) -> CapabilityDiscovery:
        if self._capability_discovery is None:
            raise KnowledgeServiceError(
                "KnowledgeService has not been initialized"
            )
        return self._capability_discovery

    def initialize(
        self, capability_discovery: CapabilityDiscovery
    ) -> KnowledgeService:
        """Bind to an initialized CapabilityDiscovery and build the knowledge index."""
        if not capability_discovery.is_initialized:
            raise KnowledgeServiceError(
                "CapabilityDiscovery must be initialized before passing to KnowledgeService"
            )

        with self._lock:
            self._capability_discovery = capability_discovery
            self._registry_manager = capability_discovery.registry_manager
            self._documents.clear()
            self._by_category.clear()
            self._forward_adj.clear()
            self._reverse_adj.clear()
            self._inverted_index.clear()
            self._search_cache.clear()

        self.index()
        self._initialized = True

        self.logger.info(
            "KnowledgeService initialized — %d documents, %d categories, %d links",
            len(self._documents),
            len(self._by_category),
            sum(len(v) for v in self._forward_adj.values()),
        )
        return self

    def index(self) -> int:
        """Build the knowledge graph and search index from all registries."""
        rm = self.registry_manager
        collected: dict[str, tuple[EOSRegistryEntry, str]] = {}

        for source in _REGISTRY_SOURCES:
            try:
                entries = rm.get(source)
            except Exception:
                continue
            for entry in entries:
                if entry.id not in collected:
                    collected[entry.id] = (entry, source)

        self._build_graph(collected)
        self._build_search_index()

        with self._lock:
            self._search_cache.clear()

        return len(self._documents)

    def find(self, document_id: str) -> KnowledgeDocument | None:
        """Look up a document by exact ID."""
        return self._documents.get(document_id)

    def search(self, query: str) -> list[KnowledgeMatch]:
        """Search across all indexed documents.

        Returns matches ranked by relevance score (descending).
        Results are cached for repeated queries.
        """
        if not query or not query.strip():
            return []

        cache_key = query.strip().lower()
        with self._lock:
            cached = self._search_cache.get(cache_key)
            if cached is not None:
                return list(cached)

        tokens = self._tokenize(query)
        if not tokens:
            return []

        candidate_ids: set[str] = set()
        for token in tokens:
            if token in self._inverted_index:
                candidate_ids.update(self._inverted_index[token])

        matches: list[KnowledgeMatch] = []
        for doc_id in candidate_ids:
            doc = self._documents.get(doc_id)
            if doc is None:
                continue
            score, reason = self._score_document(doc, tokens)
            if score > 0:
                matches.append(KnowledgeMatch(
                    document=doc,
                    score=score,
                    match_reason=reason,
                ))

        matches.sort(key=lambda m: m.score, reverse=True)

        with self._lock:
            self._search_cache[cache_key] = matches

        return list(matches)

    def related(self, document_id: str) -> list[KnowledgeDocument]:
        """Return documents that are directly related (forward or reverse links)."""
        doc = self._documents.get(document_id)
        if doc is None:
            return []

        related_ids: set[str] = set()
        related_ids.update(doc.forward_deps)
        related_ids.update(doc.reverse_deps)
        related_ids.discard(document_id)

        return [
            self._documents[rid]
            for rid in sorted(related_ids)
            if rid in self._documents
        ]

    def dependencies(self, document_id: str) -> list[KnowledgeDocument]:
        """Return documents that this document depends on (forward links)."""
        doc = self._documents.get(document_id)
        if doc is None:
            return []
        return [
            self._documents[dep]
            for dep in doc.forward_deps
            if dep in self._documents
        ]

    def reverse_dependencies(self, document_id: str) -> list[KnowledgeDocument]:
        """Return documents that depend on this document (reverse links)."""
        doc = self._documents.get(document_id)
        if doc is None:
            return []
        return [
            self._documents[dep]
            for dep in doc.reverse_deps
            if dep in self._documents
        ]

    def recommend(
        self, task_description: str, limit: int = 10
    ) -> list[KnowledgeMatch]:
        """Recommend documents based on a task description.

        Extracts meaningful keywords and ranks documents by relevance.
        """
        if not task_description or not task_description.strip():
            return []

        tokens = self._tokenize(task_description)
        if not tokens:
            return []

        matches: list[KnowledgeMatch] = []
        for doc in self._documents.values():
            score, reason = self._score_recommendation(doc, tokens)
            if score > 0:
                matches.append(KnowledgeMatch(
                    document=doc,
                    score=score,
                    match_reason=reason,
                ))

        matches.sort(key=lambda m: m.score, reverse=True)
        return matches[:limit]

    def statistics(self) -> KnowledgeStatistics:
        """Return summary statistics about the knowledge index."""
        total_links = sum(len(v) for v in self._forward_adj.values())
        total_docs = len(self._documents)
        avg_links = total_links / total_docs if total_docs > 0 else 0.0

        all_path_ids = {doc.entry.path for doc in self._documents.values()}
        orphans = 0
        for doc in self._documents.values():
            for link in doc.entry.resolved_links:
                if link not in all_path_ids:
                    orphans += 1
                    break

        return KnowledgeStatistics(
            total_documents=total_docs,
            total_categories=len(self._by_category),
            total_links=total_links,
            total_orphans=orphans,
            categories=tuple(sorted(self._by_category)),
            average_links_per_document=round(avg_links, 2),
        )

    def validate(self) -> KnowledgeValidationResult:
        """Validate document references, detect broken links, orphans, and circular references."""
        result = KnowledgeValidationResult()

        self._check_broken_links(result)
        self._check_orphan_documents(result)
        self._check_circular_references(result)
        self._check_index_consistency(result)

        if result.broken_links:
            result.warnings.append(
                f"{len(result.broken_links)} broken link(s) detected"
            )
        if result.orphan_documents:
            result.warnings.append(
                f"{len(result.orphan_documents)} orphan document(s) detected"
            )
        if result.circular_references:
            result.is_valid = False
        if result.index_inconsistencies:
            result.is_valid = False

        self.logger.info(
            "Knowledge validation: valid=%s, broken=%d, orphans=%d, circular=%d, inconsistencies=%d",
            result.is_valid,
            len(result.broken_links),
            len(result.orphan_documents),
            len(result.circular_references),
            len(result.index_inconsistencies),
        )
        return result

    def reload(self) -> KnowledgeService:
        """Clear all caches and re-index from the bound services."""
        self.logger.info("Reloading KnowledgeService")
        with self._lock:
            self._documents.clear()
            self._by_category.clear()
            self._forward_adj.clear()
            self._reverse_adj.clear()
            self._inverted_index.clear()
            self._search_cache.clear()
        if self._registry_manager is not None:
            self.index()
        return self

    def _build_graph(
        self,
        collected: dict[str, tuple[EOSRegistryEntry, str]],
    ) -> None:
        known_ids = set(collected)
        forward_adj: dict[str, set[str]] = {}
        reverse_adj: dict[str, set[str]] = {}

        for doc_id, (entry, _source) in collected.items():
            deps: set[str] = set()
            for link in entry.resolved_links:
                for other_id in known_ids:
                    if other_id == doc_id:
                        continue
                    if self._link_matches_id(link, other_id):
                        deps.add(other_id)
            if deps:
                forward_adj[doc_id] = deps
                for dep_id in deps:
                    reverse_adj.setdefault(dep_id, set()).add(doc_id)

        documents: dict[str, KnowledgeDocument] = {}
        by_category: dict[str, list[str]] = {}

        for doc_id, (entry, source) in collected.items():
            fwd = tuple(sorted(forward_adj.get(doc_id, set())))
            rev = tuple(sorted(reverse_adj.get(doc_id, set())))
            doc = KnowledgeDocument(
                entry=entry,
                source_registry=source,
                forward_deps=fwd,
                reverse_deps=rev,
            )
            documents[doc_id] = doc
            by_category.setdefault(entry.category, []).append(doc_id)

        with self._lock:
            self._documents = documents
            self._by_category = by_category
            self._forward_adj = forward_adj
            self._reverse_adj = reverse_adj

    @staticmethod
    def _link_matches_id(link: str, doc_id: str) -> bool:
        if link in doc_id:
            return True
        suffix = doc_id.split("::")[-1].lower()
        if suffix and suffix in link.lower():
            return True
        link_stem = link.rsplit("/", 1)[-1].removesuffix(".md").lower()
        if link_stem and link_stem == suffix:
            return True
        return False

    def _build_search_index(self) -> None:
        inverted: dict[str, set[str]] = {}

        for doc_id, doc in self._documents.items():
            tokens = self._extract_tokens(doc.entry)
            for token in tokens:
                inverted.setdefault(token, set()).add(doc_id)

        with self._lock:
            self._inverted_index = inverted

    @staticmethod
    def _extract_tokens(entry: EOSRegistryEntry) -> set[str]:
        raw = " ".join([
            entry.id,
            entry.title,
            entry.path,
            entry.category,
        ])
        words = re.findall(r"[a-zA-Z][a-zA-Z0-9_-]*", raw.lower())
        return {
            w for w in words
            if len(w) >= _MIN_TOKEN_LEN and w not in _STOP_WORDS
        }

    def _score_document(
        self, doc: KnowledgeDocument, tokens: list[str]
    ) -> tuple[float, str]:
        entry = doc.entry
        score = 0.0
        reasons: list[str] = []

        id_lower = entry.id.lower()
        title_lower = entry.title.lower()
        path_lower = entry.path.lower()
        category_lower = entry.category.lower()

        for token in tokens:
            if token in id_lower:
                score += _WEIGHT_ID
                reasons.append(f"id:{token}")
            if token in title_lower:
                score += _WEIGHT_TITLE
                reasons.append(f"title:{token}")
            if token in path_lower:
                score += _WEIGHT_PATH
                reasons.append(f"path:{token}")
            if token in category_lower:
                score += _WEIGHT_CATEGORY
                reasons.append(f"category:{token}")
            for link in entry.resolved_links:
                if token in link.lower():
                    score += _WEIGHT_LINK
                    reasons.append(f"link:{token}")
                    break

        if score == 0:
            return 0.0, ""

        if entry.status.lower() == "active":
            score *= _ACTIVE_BOOST

        return round(score, 3), ", ".join(reasons[:5])

    def _score_recommendation(
        self, doc: KnowledgeDocument, tokens: list[str]
    ) -> tuple[float, str]:
        entry = doc.entry
        searchable = " ".join([
            entry.id,
            entry.title,
            entry.category,
            entry.path,
        ]).lower()

        matched_tokens: list[str] = []
        for token in tokens:
            if token in searchable:
                matched_tokens.append(token)

        if not matched_tokens:
            return 0.0, ""

        score = len(matched_tokens)
        coverage = len(matched_tokens) / len(tokens)
        score *= (1.0 + coverage)

        if entry.status.lower() == "active":
            score *= _ACTIVE_BOOST

        link_bonus = min(len(entry.resolved_links) * 0.1, 2.0)
        score += link_bonus

        return round(score, 3), f"matched {len(matched_tokens)}/{len(tokens)} tokens"

    def _check_broken_links(self, result: KnowledgeValidationResult) -> None:
        all_paths = {doc.entry.path for doc in self._documents.values()}
        for doc in self._documents.values():
            for link in doc.entry.resolved_links:
                if link and link not in all_paths:
                    result.broken_links.append((doc.entry.id, link))

    def _check_orphan_documents(self, result: KnowledgeValidationResult) -> None:
        for doc in self._documents.values():
            if not doc.forward_deps and not doc.reverse_deps:
                result.orphan_documents.append(doc.entry.id)

    def _check_circular_references(
        self, result: KnowledgeValidationResult
    ) -> None:
        visited: set[str] = set()
        rec_stack: set[str] = set()

        def dfs(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)
            for neighbor in self._forward_adj.get(node, set()):
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

        for node in self._forward_adj:
            if node not in visited:
                dfs(node)

    def _check_index_consistency(
        self, result: KnowledgeValidationResult
    ) -> None:
        for token, doc_ids in self._inverted_index.items():
            for doc_id in doc_ids:
                if doc_id not in self._documents:
                    result.index_inconsistencies.append(
                        f"token '{token}' references unknown document '{doc_id}'"
                    )

        for doc_id in self._documents:
            found = False
            for doc_ids in self._inverted_index.values():
                if doc_id in doc_ids:
                    found = True
                    break
            if not found:
                result.index_inconsistencies.append(
                    f"document '{doc_id}' not present in any search index entry"
                )

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        words = re.findall(r"[a-zA-Z][a-zA-Z0-9_-]*", text.lower())
        return [
            w for w in words
            if len(w) >= _MIN_TOKEN_LEN and w not in _STOP_WORDS
        ]
