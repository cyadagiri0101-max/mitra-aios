"""Consensus engine for multi-agent voting and decision-making."""

from __future__ import annotations

import threading

from aios.core.exceptions import MultiAgentError
from aios.core.logger import get_logger
from aios.multiagent.models import (
    ConsensusMethod,
    ConsensusResult,
    MultiAgentValidationResult,
    Vote,
)


class ConsensusEngine:
    """Engine for reaching consensus among multiple agents."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.multiagent.consensus")
        self._votes: dict[str, list[Vote]] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._consensus_count: int = 0

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def consensus_count(self) -> int:
        with self._lock:
            return self._consensus_count

    def initialize(self) -> ConsensusEngine:
        self._initialized = True
        self.logger.info("ConsensusEngine initialized")
        return self

    def submit_vote(self, topic: str, vote: Vote) -> None:
        """Submit a vote on a topic."""
        self._require_initialized()
        with self._lock:
            if topic not in self._votes:
                self._votes[topic] = []
            self._votes[topic].append(vote)
            self.logger.debug("Vote from '%s' on '%s': %s", vote.agent_id, topic, vote.decision)

    def reach_consensus(
        self,
        topic: str,
        method: ConsensusMethod = ConsensusMethod.MAJORITY,
    ) -> ConsensusResult:
        """Reach consensus on a topic using the specified method."""
        self._require_initialized()
        with self._lock:
            votes = tuple(self._votes.get(topic, []))
            if not votes:
                return ConsensusResult(
                    decision="",
                    method=method,
                    votes=votes,
                    confidence=0.0,
                )

            if method == ConsensusMethod.MAJORITY:
                decision, confidence = self._majority_vote(votes)
            elif method == ConsensusMethod.UNANIMOUS:
                decision, confidence = self._unanimous_vote(votes)
            elif method == ConsensusMethod.WEIGHTED:
                decision, confidence = self._weighted_vote(votes)
            elif method == ConsensusMethod.ARBITRATION:
                decision, confidence = self._arbitration_vote(votes)
            else:
                decision, confidence = self._majority_vote(votes)

            self._consensus_count += 1
            return ConsensusResult(
                decision=decision,
                method=method,
                votes=votes,
                confidence=confidence,
            )

    def clear_votes(self, topic: str | None = None) -> None:
        """Clear votes for a topic or all topics."""
        self._require_initialized()
        with self._lock:
            if topic:
                self._votes.pop(topic, None)
            else:
                self._votes.clear()
            self.logger.info("Cleared votes for %s", topic or "all topics")

    def validate(self) -> MultiAgentValidationResult:
        """Validate consensus engine state."""
        result = MultiAgentValidationResult()
        with self._lock:
            if self._consensus_count == 0:
                result.warnings.append("No consensus has been reached")
        return result

    def reload(self) -> ConsensusEngine:
        """Reload consensus engine."""
        self.logger.info("Reloading ConsensusEngine")
        with self._lock:
            self._votes.clear()
            self._consensus_count = 0
        return self

    def _majority_vote(self, votes: tuple[Vote, ...]) -> tuple[str, float]:
        """Determine majority decision."""
        decision_counts: dict[str, int] = {}
        for vote in votes:
            decision_counts[vote.decision] = decision_counts.get(vote.decision, 0) + 1

        if not decision_counts:
            return "", 0.0

        majority_decision = max(decision_counts, key=decision_counts.get)
        majority_count = decision_counts[majority_decision]
        confidence = majority_count / len(votes)
        return majority_decision, confidence

    def _unanimous_vote(self, votes: tuple[Vote, ...]) -> tuple[str, float]:
        """Determine unanimous decision."""
        if not votes:
            return "", 0.0

        first_decision = votes[0].decision
        for vote in votes[1:]:
            if vote.decision != first_decision:
                return "", 0.0

        avg_confidence = sum(v.confidence for v in votes) / len(votes)
        return first_decision, avg_confidence

    def _weighted_vote(self, votes: tuple[Vote, ...]) -> tuple[str, float]:
        """Determine weighted decision based on confidence."""
        weighted_scores: dict[str, float] = {}
        total_weight = 0.0

        for vote in votes:
            weight = vote.confidence
            weighted_scores[vote.decision] = weighted_scores.get(vote.decision, 0.0) + weight
            total_weight += weight

        if not weighted_scores or total_weight == 0:
            return "", 0.0

        best_decision = max(weighted_scores, key=weighted_scores.get)
        confidence = weighted_scores[best_decision] / total_weight
        return best_decision, confidence

    def _arbitration_vote(self, votes: tuple[Vote, ...]) -> tuple[str, float]:
        """Determine decision by arbitration (highest confidence wins)."""
        if not votes:
            return "", 0.0

        highest_vote = max(votes, key=lambda v: v.confidence)
        return highest_vote.decision, highest_vote.confidence

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise MultiAgentError("ConsensusEngine has not been initialized")
