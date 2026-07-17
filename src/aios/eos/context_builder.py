"""EOSContextBuilder — construct execution context for AIOS decisions."""

from __future__ import annotations

import threading
from dataclasses import dataclass, field

from aios.core.exceptions import ContextBuilderError
from aios.core.logger import get_logger
from aios.eos.capability_discovery import CapabilityDiscovery, CapabilityMatch
from aios.eos.knowledge_service import KnowledgeDocument, KnowledgeMatch, KnowledgeService

_CHARS_PER_TOKEN = 4
_DEFAULT_TOKEN_BUDGET = 12_000
_DEFAULT_CAPABILITY_LIMIT = 10
_DEFAULT_KNOWLEDGE_LIMIT = 20
_EXPANSION_DEPTH = 1

_SOURCE_CAPABILITY = "capability"
_SOURCE_KNOWLEDGE = "knowledge"


@dataclass(frozen=True, slots=True)
class ContextItem:
    """A single piece of execution context."""

    item_id: str
    title: str
    category: str
    source: str
    score: float
    token_estimate: int
    match_reason: str = ""
    path: str = ""


@dataclass(slots=True)
class ExecutionContext:
    """Assembled execution context for a task."""

    task_description: str
    items: list[ContextItem] = field(default_factory=list)
    token_budget: int = _DEFAULT_TOKEN_BUDGET
    tokens_used: int = 0

    @property
    def is_empty(self) -> bool:
        return len(self.items) == 0

    @property
    def utilization_percent(self) -> float:
        if self.token_budget <= 0:
            return 0.0
        return round(self.tokens_used / self.token_budget * 100, 1)

    @property
    def available_tokens(self) -> int:
        return max(0, self.token_budget - self.tokens_used)


@dataclass(slots=True)
class ContextValidationResult:
    """Outcome of :meth:`EOSContextBuilder.validate`."""

    is_valid: bool = True
    duplicate_items: list[str] = field(default_factory=list)
    unresolved_references: list[str] = field(default_factory=list)
    empty_context: bool = False
    budget_exceeded: bool = False
    ordering_unstable: bool = False
    warnings: list[str] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class ContextStatistics:
    """Summary statistics about the context builder."""

    cached_contexts: int
    total_items_available: int
    default_token_budget: int
    capability_count: int
    knowledge_count: int


class EOSContextBuilder:
    """Construct execution context for AIOS decisions.

    Sits above :class:`KnowledgeService` and :class:`CapabilityDiscovery`.
    Builds ranked, deduplicated, budget-constrained execution contexts
    from task descriptions using discovered capabilities and related knowledge.
    """

    def __init__(self, token_budget: int = _DEFAULT_TOKEN_BUDGET) -> None:
        self.logger = get_logger("aios.eos.context_builder")
        self._knowledge_service: KnowledgeService | None = None
        self._capability_discovery: CapabilityDiscovery | None = None
        self._token_budget = token_budget
        self._context_cache: dict[str, ExecutionContext] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def knowledge_service(self) -> KnowledgeService:
        if self._knowledge_service is None:
            raise ContextBuilderError(
                "EOSContextBuilder has not been initialized"
            )
        return self._knowledge_service

    @property
    def capability_discovery(self) -> CapabilityDiscovery:
        if self._capability_discovery is None:
            raise ContextBuilderError(
                "EOSContextBuilder has not been initialized"
            )
        return self._capability_discovery

    def initialize(
        self, knowledge_service: KnowledgeService
    ) -> EOSContextBuilder:
        """Bind to an initialized KnowledgeService."""
        if not knowledge_service.is_initialized:
            raise ContextBuilderError(
                "KnowledgeService must be initialized before passing to EOSContextBuilder"
            )

        cd = knowledge_service.capability_discovery

        with self._lock:
            self._knowledge_service = knowledge_service
            self._capability_discovery = cd
            self._context_cache.clear()

        self._initialized = True

        self.logger.info(
            "EOSContextBuilder initialized — budget=%d tokens",
            self._token_budget,
        )
        return self

    def build(self, task: str) -> ExecutionContext:
        """Build execution context from a task description.

        Discovers relevant capabilities and knowledge, merges them,
        removes duplicates, ranks by relevance, and applies token budget.
        """
        if not task or not task.strip():
            raise ContextBuilderError("Task description must not be empty")

        cache_key = task.strip().lower()
        with self._lock:
            cached = self._context_cache.get(cache_key)
            if cached is not None:
                return ExecutionContext(
                    task_description=cached.task_description,
                    items=list(cached.items),
                    token_budget=cached.token_budget,
                    tokens_used=cached.tokens_used,
                )

        cd = self.capability_discovery
        ks = self.knowledge_service

        cap_matches = cd.recommend(task, limit=_DEFAULT_CAPABILITY_LIMIT)
        know_matches = ks.recommend(task, limit=_DEFAULT_KNOWLEDGE_LIMIT)

        items = self._merge_matches(cap_matches, know_matches)
        items = self._deduplicate(items)
        items = self._sort_deterministic(items)
        items = self._apply_budget(items, self._token_budget)

        tokens_used = sum(item.token_estimate for item in items)

        context = ExecutionContext(
            task_description=task.strip(),
            items=items,
            token_budget=self._token_budget,
            tokens_used=tokens_used,
        )

        with self._lock:
            self._context_cache[cache_key] = ExecutionContext(
                task_description=context.task_description,
                items=list(context.items),
                token_budget=context.token_budget,
                tokens_used=context.tokens_used,
            )

        self.logger.info(
            "Built context for task — %d items, %d/%d tokens (%.1f%%)",
            len(items),
            tokens_used,
            self._token_budget,
            context.utilization_percent,
        )
        return context

    def expand(self, context: ExecutionContext) -> ExecutionContext:
        """Expand context by adding related items from the dependency graph.

        Adds related documents and dependencies for each existing item,
        then deduplicates and re-applies the token budget.
        """
        ks = self.knowledge_service
        seen_ids = {item.item_id for item in context.items}
        new_items = list(context.items)

        for item in context.items:
            related_docs = ks.related(item.item_id)
            for doc in related_docs:
                if doc.entry.id not in seen_ids:
                    ci = self._knowledge_doc_to_item(doc, score=item.score * 0.5)
                    new_items.append(ci)
                    seen_ids.add(doc.entry.id)

            deps = ks.dependencies(item.item_id)
            for dep in deps:
                if dep.entry.id not in seen_ids:
                    ci = self._knowledge_doc_to_item(dep, score=item.score * 0.7)
                    new_items.append(ci)
                    seen_ids.add(dep.entry.id)

        new_items = self._deduplicate(new_items)
        new_items = self._sort_deterministic(new_items)
        new_items = self._apply_budget(new_items, context.token_budget)

        tokens_used = sum(item.token_estimate for item in new_items)

        return ExecutionContext(
            task_description=context.task_description,
            items=new_items,
            token_budget=context.token_budget,
            tokens_used=tokens_used,
        )

    def compress(self, context: ExecutionContext) -> ExecutionContext:
        """Compress context by removing lowest-scored items until under budget."""
        items = list(context.items)
        tokens_used = sum(item.token_estimate for item in items)

        while tokens_used > context.token_budget and items:
            items.sort(key=lambda x: (x.score, x.item_id))
            removed = items.pop(0)
            tokens_used -= removed.token_estimate

        items = self._sort_deterministic(items)

        return ExecutionContext(
            task_description=context.task_description,
            items=items,
            token_budget=context.token_budget,
            tokens_used=tokens_used,
        )

    def rank(self, context: ExecutionContext) -> ExecutionContext:
        """Re-rank context items by relevance score with deterministic ordering."""
        items = self._sort_deterministic(list(context.items))
        tokens_used = sum(item.token_estimate for item in items)

        return ExecutionContext(
            task_description=context.task_description,
            items=items,
            token_budget=context.token_budget,
            tokens_used=tokens_used,
        )

    def validate(self, context: ExecutionContext) -> ContextValidationResult:
        """Validate context integrity."""
        result = ContextValidationResult()

        self._check_duplicates(context, result)
        self._check_empty(context, result)
        self._check_budget(context, result)
        self._check_ordering_stability(context, result)

        if result.duplicate_items:
            result.is_valid = False
        if result.empty_context:
            result.warnings.append("Execution context is empty")
        if result.budget_exceeded:
            result.is_valid = False
        if result.ordering_unstable:
            result.warnings.append("Context ordering is not stable")

        self.logger.info(
            "Context validation: valid=%s, duplicates=%d, budget_exceeded=%s, empty=%s",
            result.is_valid,
            len(result.duplicate_items),
            result.budget_exceeded,
            result.empty_context,
        )
        return result

    def statistics(self) -> ContextStatistics:
        """Return summary statistics about the context builder."""
        cd = self.capability_discovery
        ks = self.knowledge_service

        return ContextStatistics(
            cached_contexts=len(self._context_cache),
            total_items_available=len(cd.implemented()) + ks.statistics().total_documents,
            default_token_budget=self._token_budget,
            capability_count=len(cd.implemented()),
            knowledge_count=ks.statistics().total_documents,
        )

    def reload(self) -> EOSContextBuilder:
        """Clear all caches."""
        self.logger.info("Reloading EOSContextBuilder")
        with self._lock:
            self._context_cache.clear()
        return self

    def _merge_matches(
        self,
        cap_matches: list[CapabilityMatch],
        know_matches: list[KnowledgeMatch],
    ) -> list[ContextItem]:
        items: list[ContextItem] = []

        for cm in cap_matches:
            entry = cm.capability.entry
            items.append(ContextItem(
                item_id=entry.id,
                title=entry.title,
                category=entry.category,
                source=_SOURCE_CAPABILITY,
                score=cm.score,
                token_estimate=self._estimate_tokens(entry.title + " " + entry.id),
                match_reason=cm.match_reason,
                path=entry.path,
            ))

        for km in know_matches:
            doc = km.document
            entry = doc.entry
            items.append(ContextItem(
                item_id=entry.id,
                title=entry.title,
                category=entry.category,
                source=_SOURCE_KNOWLEDGE,
                score=km.score,
                token_estimate=self._estimate_tokens(entry.title + " " + entry.id),
                match_reason=km.match_reason,
                path=entry.path,
            ))

        return items

    @staticmethod
    def _deduplicate(items: list[ContextItem]) -> list[ContextItem]:
        seen: dict[str, ContextItem] = {}
        for item in items:
            existing = seen.get(item.item_id)
            if existing is None or item.score > existing.score:
                seen[item.item_id] = item
        return list(seen.values())

    @staticmethod
    def _sort_deterministic(items: list[ContextItem]) -> list[ContextItem]:
        return sorted(items, key=lambda x: (-x.score, x.item_id))

    @staticmethod
    def _apply_budget(items: list[ContextItem], budget: int) -> list[ContextItem]:
        result: list[ContextItem] = []
        used = 0
        for item in items:
            if used + item.token_estimate <= budget:
                result.append(item)
                used += item.token_estimate
        return result

    @staticmethod
    def _estimate_tokens(text: str) -> int:
        return max(1, len(text.encode("utf-8")) // _CHARS_PER_TOKEN)

    @staticmethod
    def _knowledge_doc_to_item(
        doc: KnowledgeDocument, score: float
    ) -> ContextItem:
        entry = doc.entry
        return ContextItem(
            item_id=entry.id,
            title=entry.title,
            category=entry.category,
            source=_SOURCE_KNOWLEDGE,
            score=score,
            token_estimate=EOSContextBuilder._estimate_tokens(
                entry.title + " " + entry.id
            ),
            match_reason="expanded",
            path=entry.path,
        )

    @staticmethod
    def _check_duplicates(
        context: ExecutionContext, result: ContextValidationResult
    ) -> None:
        seen: set[str] = set()
        for item in context.items:
            if item.item_id in seen:
                result.duplicate_items.append(item.item_id)
            seen.add(item.item_id)

    @staticmethod
    def _check_empty(
        context: ExecutionContext, result: ContextValidationResult
    ) -> None:
        if context.is_empty:
            result.empty_context = True

    @staticmethod
    def _check_budget(
        context: ExecutionContext, result: ContextValidationResult
    ) -> None:
        if context.tokens_used > context.token_budget:
            result.budget_exceeded = True

    @staticmethod
    def _check_ordering_stability(
        context: ExecutionContext, result: ContextValidationResult
    ) -> None:
        items = context.items
        for i in range(len(items) - 1):
            if items[i].score < items[i + 1].score:
                result.ordering_unstable = True
                return
            if (
                items[i].score == items[i + 1].score
                and items[i].item_id > items[i + 1].item_id
            ):
                result.ordering_unstable = True
                return
