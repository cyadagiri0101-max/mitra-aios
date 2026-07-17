"""EOSDecisionEngine — convert ExecutionContext into explainable ExecutionPlan."""

from __future__ import annotations

import threading
from dataclasses import dataclass, field
from enum import StrEnum

from aios.core.exceptions import DecisionEngineError
from aios.core.logger import get_logger
from aios.eos.context_builder import ContextItem, EOSContextBuilder, ExecutionContext

_CONFIDENCE_HIGH = 0.8
_CONFIDENCE_MEDIUM = 0.5
_CONFIDENCE_LOW = 0.3
_AMBIGUITY_THRESHOLD = 0.15
_MIN_ACTIONS_FOR_PLAN = 1
_PARALLEL_INDEPENDENCE_THRESHOLD = 0.6


class ExecutionStrategy(StrEnum):
    """Execution strategy for the plan."""

    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    MIXED = "mixed"


@dataclass(frozen=True, slots=True)
class PlannedAction:
    """A single action in the execution plan."""

    action_id: str
    title: str
    category: str
    source: str
    confidence: float
    dependencies: tuple[str, ...] = ()
    rationale: str = ""
    priority: int = 0


@dataclass(frozen=True, slots=True)
class ReasoningTrace:
    """Step-by-step explanation of how the plan was derived."""

    steps: tuple[str, ...] = ()
    strategy_rationale: str = ""
    confidence_factors: dict[str, float] = field(default_factory=dict)


@dataclass(slots=True)
class ExecutionPlan:
    """Deterministic execution plan derived from ExecutionContext."""

    task_description: str
    strategy: ExecutionStrategy
    actions: list[PlannedAction] = field(default_factory=list)
    overall_confidence: float = 0.0
    reasoning_trace: ReasoningTrace = field(default_factory=ReasoningTrace)
    recommendations: list[str] = field(default_factory=list)

    @property
    def is_empty(self) -> bool:
        return len(self.actions) == 0

    @property
    def action_count(self) -> int:
        return len(self.actions)


@dataclass(slots=True)
class DecisionValidationResult:
    """Outcome of :meth:`EOSDecisionEngine.validate`."""

    is_valid: bool = True
    empty_plan: bool = False
    duplicate_actions: list[str] = field(default_factory=list)
    missing_rationale: list[str] = field(default_factory=list)
    invalid_confidence: list[str] = field(default_factory=list)
    missing_dependencies: list[str] = field(default_factory=list)
    strategy_inconsistent: bool = False
    warnings: list[str] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class DecisionStatistics:
    """Summary statistics about the decision engine."""

    cached_plans: int
    total_plans_generated: int
    average_confidence: float
    strategy_distribution: dict[str, int]


class EOSDecisionEngine:
    """Convert ExecutionContext into explainable ExecutionPlan.

    Sits above :class:`EOSContextBuilder`. Produces deterministic,
    confidence-scored execution plans with full reasoning traces.
    Detects ambiguity, missing context, and recommends additional information.
    """

    def __init__(self) -> None:
        self.logger = get_logger("aios.eos.decision_engine")
        self._context_builder: EOSContextBuilder | None = None
        self._plan_cache: dict[str, ExecutionPlan] = {}
        self._total_plans: int = 0
        self._confidence_sum: float = 0.0
        self._strategy_counts: dict[str, int] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def context_builder(self) -> EOSContextBuilder:
        if self._context_builder is None:
            raise DecisionEngineError(
                "EOSDecisionEngine has not been initialized"
            )
        return self._context_builder

    def initialize(
        self, context_builder: EOSContextBuilder
    ) -> EOSDecisionEngine:
        """Bind to an initialized EOSContextBuilder."""
        if not context_builder.is_initialized:
            raise DecisionEngineError(
                "EOSContextBuilder must be initialized before passing to EOSDecisionEngine"
            )

        with self._lock:
            self._context_builder = context_builder
            self._plan_cache.clear()
            self._total_plans = 0
            self._confidence_sum = 0.0
            self._strategy_counts.clear()

        self._initialized = True

        self.logger.info("EOSDecisionEngine initialized")
        return self

    def plan(self, task: str) -> ExecutionPlan:
        """Build execution plan from task description.

        Uses ContextBuilder to build context, then converts it into
        a deterministic ExecutionPlan with strategy selection, action ranking,
        confidence scoring, and reasoning trace.
        """
        if not task or not task.strip():
            raise DecisionEngineError("Task description must not be empty")

        cache_key = task.strip().lower()
        with self._lock:
            cached = self._plan_cache.get(cache_key)
            if cached is not None:
                return ExecutionPlan(
                    task_description=cached.task_description,
                    strategy=cached.strategy,
                    actions=list(cached.actions),
                    overall_confidence=cached.overall_confidence,
                    reasoning_trace=cached.reasoning_trace,
                    recommendations=list(cached.recommendations),
                )

        cb = self.context_builder
        context = cb.build(task)

        plan = self._generate_plan(context)

        with self._lock:
            self._plan_cache[cache_key] = ExecutionPlan(
                task_description=plan.task_description,
                strategy=plan.strategy,
                actions=list(plan.actions),
                overall_confidence=plan.overall_confidence,
                reasoning_trace=plan.reasoning_trace,
                recommendations=list(plan.recommendations),
            )
            self._total_plans += 1
            self._confidence_sum += plan.overall_confidence
            strategy_name = plan.strategy.value
            self._strategy_counts[strategy_name] = (
                self._strategy_counts.get(strategy_name, 0) + 1
            )

        self.logger.info(
            "Generated plan for task — strategy=%s, actions=%d, confidence=%.2f",
            plan.strategy.value,
            plan.action_count,
            plan.overall_confidence,
        )
        return plan

    def evaluate(self, context: ExecutionContext) -> ExecutionPlan:
        """Evaluate an existing ExecutionContext and produce an ExecutionPlan."""
        return self._generate_plan(context)

    def select_strategy(self, context: ExecutionContext) -> ExecutionStrategy:
        """Select the optimal execution strategy based on context characteristics."""
        if context.is_empty:
            return ExecutionStrategy.SEQUENTIAL

        items = context.items
        total_items = len(items)

        if total_items == 0:
            return ExecutionStrategy.SEQUENTIAL

        independent_count = sum(
            1 for item in items if item.source == "capability"
        )
        independence_ratio = independent_count / total_items

        if independence_ratio >= _PARALLEL_INDEPENDENCE_THRESHOLD:
            return ExecutionStrategy.PARALLEL

        if independence_ratio <= (1.0 - _PARALLEL_INDEPENDENCE_THRESHOLD):
            return ExecutionStrategy.SEQUENTIAL

        return ExecutionStrategy.MIXED

    def rank_actions(self, context: ExecutionContext) -> list[PlannedAction]:
        """Rank context items into ordered PlannedActions."""
        if context.is_empty:
            return []

        actions: list[PlannedAction] = []
        seen_ids: set[str] = set()

        for idx, item in enumerate(context.items):
            if item.item_id in seen_ids:
                continue
            seen_ids.add(item.item_id)

            confidence = self._score_confidence(item, context)
            rationale = self._generate_rationale(item, confidence)

            action = PlannedAction(
                action_id=item.item_id,
                title=item.title,
                category=item.category,
                source=item.source,
                confidence=confidence,
                dependencies=(),
                rationale=rationale,
                priority=idx,
            )
            actions.append(action)

        actions.sort(key=lambda a: (-a.confidence, a.action_id))
        return actions

    def confidence(self, plan: ExecutionPlan) -> float:
        """Calculate overall confidence score for an ExecutionPlan."""
        if plan.is_empty:
            return 0.0

        action_confidences = [a.confidence for a in plan.actions]
        avg_confidence = sum(action_confidences) / len(action_confidences)

        coverage_factor = min(1.0, plan.action_count / 5.0)
        adjusted = avg_confidence * (0.7 + 0.3 * coverage_factor)

        return round(min(1.0, adjusted), 3)

    def explain(self, plan: ExecutionPlan) -> ReasoningTrace:
        """Generate or return the reasoning trace for an ExecutionPlan."""
        return plan.reasoning_trace

    def validate(self, plan: ExecutionPlan) -> DecisionValidationResult:
        """Validate execution plan integrity."""
        result = DecisionValidationResult()

        self._check_empty(plan, result)
        self._check_duplicates(plan, result)
        self._check_rationale(plan, result)
        self._check_confidence(plan, result)
        self._check_dependencies(plan, result)
        self._check_strategy_consistency(plan, result)

        if plan.is_empty:
            result.warnings.append("Execution plan is empty")
        if result.duplicate_actions:
            result.is_valid = False
        if result.invalid_confidence:
            result.is_valid = False
        if result.missing_dependencies:
            result.is_valid = False
        if result.strategy_inconsistent:
            result.warnings.append("Strategy may not match action dependencies")

        self.logger.info(
            "Plan validation: valid=%s, empty=%s, duplicates=%d, invalid_confidence=%d",
            result.is_valid,
            result.empty_plan,
            len(result.duplicate_actions),
            len(result.invalid_confidence),
        )
        return result

    def statistics(self) -> DecisionStatistics:
        """Return summary statistics about the decision engine."""
        avg_confidence = (
            self._confidence_sum / self._total_plans
            if self._total_plans > 0
            else 0.0
        )

        return DecisionStatistics(
            cached_plans=len(self._plan_cache),
            total_plans_generated=self._total_plans,
            average_confidence=round(avg_confidence, 3),
            strategy_distribution=dict(self._strategy_counts),
        )

    def reload(self) -> EOSDecisionEngine:
        """Clear all caches and reset statistics."""
        self.logger.info("Reloading EOSDecisionEngine")
        with self._lock:
            self._plan_cache.clear()
            self._total_plans = 0
            self._confidence_sum = 0.0
            self._strategy_counts.clear()
        return self

    def _generate_plan(self, context: ExecutionContext) -> ExecutionPlan:
        """Generate ExecutionPlan from ExecutionContext."""
        trace_steps: list[str] = []

        trace_steps.append(
            f"Received context with {len(context.items)} items for task: {context.task_description}"
        )

        strategy = self.select_strategy(context)
        strategy_rationale = self._explain_strategy(strategy, context)
        trace_steps.append(f"Selected strategy: {strategy.value} — {strategy_rationale}")

        actions = self.rank_actions(context)
        trace_steps.append(f"Ranked {len(actions)} actions by confidence")

        dependencies = self._infer_dependencies(actions, context)
        actions = self._apply_dependencies(actions, dependencies)
        trace_steps.append(f"Inferred {len(dependencies)} dependency relationships")

        confidence_factors = self._calculate_confidence_factors(context, actions)
        overall_confidence = self._calculate_overall_confidence(confidence_factors)
        trace_steps.append(f"Calculated overall confidence: {overall_confidence:.2f}")

        recommendations = self._generate_recommendations(
            context, actions, overall_confidence
        )
        if recommendations:
            trace_steps.append(
                f"Generated {len(recommendations)} recommendations for additional context"
            )

        reasoning_trace = ReasoningTrace(
            steps=tuple(trace_steps),
            strategy_rationale=strategy_rationale,
            confidence_factors=confidence_factors,
        )

        return ExecutionPlan(
            task_description=context.task_description,
            strategy=strategy,
            actions=actions,
            overall_confidence=overall_confidence,
            reasoning_trace=reasoning_trace,
            recommendations=recommendations,
        )

    def _score_confidence(
        self, item: ContextItem, context: ExecutionContext
    ) -> float:
        """Score confidence for a single context item."""
        base_score = min(1.0, item.score / 20.0)

        source_boost = 0.05 if item.source == "capability" else 0.0

        coverage_bonus = 0.0
        if len(context.items) > 0:
            rank_position = next(
                (i for i, ci in enumerate(context.items) if ci.item_id == item.item_id),
                len(context.items),
            )
            coverage_bonus = 0.1 * (1.0 - rank_position / len(context.items))

        confidence = base_score + source_boost + coverage_bonus
        return round(min(1.0, max(0.0, confidence)), 3)

    def _generate_rationale(self, item: ContextItem, confidence: float) -> str:
        """Generate rationale for including an action."""
        parts = []

        if confidence >= _CONFIDENCE_HIGH:
            parts.append(f"High confidence ({confidence:.2f})")
        elif confidence >= _CONFIDENCE_MEDIUM:
            parts.append(f"Medium confidence ({confidence:.2f})")
        else:
            parts.append(f"Low confidence ({confidence:.2f})")

        parts.append(f"source: {item.source}")
        parts.append(f"category: {item.category}")

        if item.match_reason:
            parts.append(f"match: {item.match_reason}")

        return "; ".join(parts)

    def _explain_strategy(
        self, strategy: ExecutionStrategy, context: ExecutionContext
    ) -> str:
        """Explain why a strategy was selected."""
        if strategy == ExecutionStrategy.PARALLEL:
            return (
                "High proportion of independent capabilities suggests parallel execution"
            )
        if strategy == ExecutionStrategy.SEQUENTIAL:
            return (
                "Knowledge-dominant context with dependencies suggests sequential execution"
            )
        return "Mixed context with both independent and dependent items suggests hybrid execution"

    def _infer_dependencies(
        self, actions: list[PlannedAction], context: ExecutionContext
    ) -> dict[str, list[str]]:
        """Infer dependencies between actions based on context relationships."""
        dependencies: dict[str, list[str]] = {}

        for action in actions:
            if action.source == "knowledge":
                for other in actions:
                    if (
                        other.action_id != action.action_id
                        and other.source == "capability"
                        and other.category == action.category
                    ):
                        dependencies.setdefault(action.action_id, []).append(
                            other.action_id
                        )

        return dependencies

    def _apply_dependencies(
        self,
        actions: list[PlannedAction],
        dependencies: dict[str, list[str]],
    ) -> list[PlannedAction]:
        """Apply inferred dependencies to actions."""
        if not dependencies:
            return actions

        updated: list[PlannedAction] = []
        for action in actions:
            deps = dependencies.get(action.action_id, [])
            if deps:
                updated_action = PlannedAction(
                    action_id=action.action_id,
                    title=action.title,
                    category=action.category,
                    source=action.source,
                    confidence=action.confidence,
                    dependencies=tuple(sorted(deps)),
                    rationale=action.rationale,
                    priority=action.priority,
                )
                updated.append(updated_action)
            else:
                updated.append(action)

        return updated

    def _calculate_confidence_factors(
        self, context: ExecutionContext, actions: list[PlannedAction]
    ) -> dict[str, float]:
        """Calculate confidence factors for the plan."""
        factors: dict[str, float] = {}

        if actions:
            avg_action_confidence = sum(a.confidence for a in actions) / len(actions)
            factors["action_confidence"] = round(avg_action_confidence, 3)
        else:
            factors["action_confidence"] = 0.0

        coverage = min(1.0, len(actions) / 5.0)
        factors["coverage"] = round(coverage, 3)

        if context.items:
            scores = [item.score for item in context.items]
            avg_score = sum(scores) / len(scores)
            variance = sum((s - avg_score) ** 2 for s in scores) / len(scores)
            ambiguity = min(1.0, variance / 100.0)
            factors["ambiguity"] = round(1.0 - ambiguity, 3)
        else:
            factors["ambiguity"] = 0.0

        capability_count = sum(1 for a in actions if a.source == "capability")
        knowledge_count = sum(1 for a in actions if a.source == "knowledge")
        if capability_count + knowledge_count > 0:
            balance = min(capability_count, knowledge_count) / max(
                capability_count, knowledge_count
            )
            factors["balance"] = round(balance, 3)
        else:
            factors["balance"] = 0.0

        return factors

    def _calculate_overall_confidence(
        self, factors: dict[str, float]
    ) -> float:
        """Calculate overall confidence from factors."""
        weights = {
            "action_confidence": 0.4,
            "coverage": 0.2,
            "ambiguity": 0.2,
            "balance": 0.2,
        }

        total = sum(
            factors.get(key, 0.0) * weight for key, weight in weights.items()
        )

        return round(min(1.0, max(0.0, total)), 3)

    def _generate_recommendations(
        self,
        context: ExecutionContext,
        actions: list[PlannedAction],
        overall_confidence: float,
    ) -> list[str]:
        """Generate recommendations for additional context when confidence is low."""
        recommendations: list[str] = []

        if overall_confidence < _CONFIDENCE_MEDIUM:
            recommendations.append(
                "Overall confidence is low — consider expanding context with related documents"
            )

        if not actions:
            recommendations.append(
                "No actions generated — task may require more specific description"
            )
            return recommendations

        categories = {a.category for a in actions}
        if len(categories) == 1:
            recommendations.append(
                "Single category coverage — consider cross-domain knowledge"
            )

        low_confidence_actions = [
            a for a in actions if a.confidence < _CONFIDENCE_LOW
        ]
        if low_confidence_actions:
            recommendations.append(
                f"{len(low_confidence_actions)} action(s) have low confidence — verify with additional sources"
            )

        if context.utilization_percent < 50.0:
            recommendations.append(
                "Context budget underutilized — consider expanding with dependencies"
            )

        return recommendations

    @staticmethod
    def _check_empty(
        plan: ExecutionPlan, result: DecisionValidationResult
    ) -> None:
        if plan.is_empty:
            result.empty_plan = True

    @staticmethod
    def _check_duplicates(
        plan: ExecutionPlan, result: DecisionValidationResult
    ) -> None:
        seen: set[str] = set()
        for action in plan.actions:
            if action.action_id in seen:
                result.duplicate_actions.append(action.action_id)
            seen.add(action.action_id)

    @staticmethod
    def _check_rationale(
        plan: ExecutionPlan, result: DecisionValidationResult
    ) -> None:
        for action in plan.actions:
            if not action.rationale:
                result.missing_rationale.append(action.action_id)

    @staticmethod
    def _check_confidence(
        plan: ExecutionPlan, result: DecisionValidationResult
    ) -> None:
        for action in plan.actions:
            if action.confidence < 0.0 or action.confidence > 1.0:
                result.invalid_confidence.append(action.action_id)

    @staticmethod
    def _check_dependencies(
        plan: ExecutionPlan, result: DecisionValidationResult
    ) -> None:
        action_ids = {a.action_id for a in plan.actions}
        for action in plan.actions:
            for dep in action.dependencies:
                if dep not in action_ids:
                    result.missing_dependencies.append(
                        f"{action.action_id} -> {dep}"
                    )

    @staticmethod
    def _check_strategy_consistency(
        plan: ExecutionPlan, result: DecisionValidationResult
    ) -> None:
        if plan.strategy == ExecutionStrategy.PARALLEL:
            for action in plan.actions:
                if action.dependencies:
                    result.strategy_inconsistent = True
                    return
