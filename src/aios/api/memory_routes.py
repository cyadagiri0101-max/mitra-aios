"""Memory API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from aios.api.auth import get_current_user
from aios.api.dependencies import get_stack
from aios.api.pydantic_schemas import (
    ErrorDetail,
    MemoryForgetRequest,
    MemoryRetrieveRequest,
    MemoryRetrieveResponse,
    MemoryStatisticsResponse,
    MemoryStoreRequest,
    MemoryStoreResponse,
)
from aios.api.stack import EOSStack

router = APIRouter(prefix="/memory", tags=["memory"])


def _error(status: int, detail: str) -> HTTPException:
    return HTTPException(status_code=status, detail=detail)


@router.post(
    "/store",
    response_model=MemoryStoreResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def store_memory(
    req: MemoryStoreRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> MemoryStoreResponse:
    if stack.memory_manager is None:
        raise _error(503, "Memory manager not available")

    try:
        entry = stack.memory_manager.store(
            content=req.content,
            execution_id=req.execution_id,
            memory_type=req.memory_type,
            importance=req.importance,
            metadata=req.metadata,
        )
        return MemoryStoreResponse(
            entry_id=entry.entry_id,
            memory_type=req.memory_type,
            timestamp=entry.timestamp,
            content_preview=req.content[:100],
        )
    except Exception as e:
        raise _error(500, f"Failed to store memory: {e}")


@router.post(
    "/retrieve",
    response_model=MemoryRetrieveResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def retrieve_memory(
    req: MemoryRetrieveRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> MemoryRetrieveResponse:
    if stack.memory_manager is None:
        raise _error(503, "Memory manager not available")

    try:
        if req.method == "similarity":
            results = stack.memory_manager.similarity_retrieve(
                query=req.query,
                memory_types=req.memory_types,
                top_k=req.limit,
            )
        elif req.method == "keyword":
            results = stack.memory_manager.retrieve(
                query=req.query,
                memory_types=req.memory_types,
                limit=req.limit,
            )
        else:
            results = stack.memory_manager.hybrid_retrieve(
                query=req.query,
                memory_types=req.memory_types,
                top_k=req.limit,
            )

        return MemoryRetrieveResponse(
            results=[
                {
                    "entry_id": r.entry.entry_id,
                    "content": r.entry.content,
                    "memory_type": r.entry.memory_type,
                    "score": r.score,
                    "timestamp": r.entry.timestamp,
                }
                for r in results
            ],
            total_found=len(results),
        )
    except Exception as e:
        raise _error(500, f"Failed to retrieve memory: {e}")


@router.post(
    "/forget",
    responses={400: {"model": ErrorDetail}, 404: {"model": ErrorDetail}},
)
async def forget_memory(
    req: MemoryForgetRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.memory_manager is None:
        raise _error(503, "Memory manager not available")

    try:
        removed = stack.memory_manager.forget(
            memory_type=req.memory_type,
            entry_id=req.entry_id,
        )
        if not removed:
            raise _error(404, f"Memory entry not found: {req.entry_id}")
        return {"entry_id": req.entry_id, "status": "forgotten"}
    except HTTPException:
        raise
    except Exception as e:
        raise _error(500, f"Failed to forget memory: {e}")


@router.post("/consolidate")
async def consolidate_memory(
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.memory_manager is None:
        raise _error(503, "Memory manager not available")

    try:
        result = stack.memory_manager.consolidate_all()
        return {
            "status": "completed",
            "consolidated_count": result.consolidated_count if hasattr(result, "consolidated_count") else 0,
        }
    except Exception as e:
        raise _error(500, f"Failed to consolidate memory: {e}")


@router.get("/statistics", response_model=MemoryStatisticsResponse)
async def memory_statistics(
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> MemoryStatisticsResponse:
    if stack.memory_manager is None:
        raise _error(503, "Memory manager not available")

    try:
        stats = stack.memory_manager.statistics()
        return MemoryStatisticsResponse(
            working_memory_count=stats.working_count if hasattr(stats, "working_count") else 0,
            episodic_memory_count=stats.episodic_count if hasattr(stats, "episodic_count") else 0,
            semantic_memory_count=stats.semantic_count if hasattr(stats, "semantic_count") else 0,
            total_memories=stats.total_count if hasattr(stats, "total_count") else 0,
            consolidation_count=stats.consolidation_count if hasattr(stats, "consolidation_count") else 0,
        )
    except Exception as e:
        raise _error(500, f"Failed to get statistics: {e}")
