"""Embedding API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from aios.api.auth import get_current_user
from aios.api.dependencies import get_stack
from aios.api.pydantic_schemas import (
    EmbedBatchRequest,
    EmbedBatchResponse,
    EmbeddingStatisticsResponse,
    EmbedRequest,
    EmbedResponse,
    ErrorDetail,
)
from aios.api.stack import EOSStack

router = APIRouter(prefix="/embeddings", tags=["embeddings"])


def _error(status: int, detail: str) -> HTTPException:
    return HTTPException(status_code=status, detail=detail)


@router.post(
    "/embed",
    response_model=EmbedResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def embed(
    req: EmbedRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> EmbedResponse:
    if stack.embedding_manager is None:
        raise _error(503, "Embedding manager not available")

    try:
        result = stack.embedding_manager.embed(
            text=req.text,
            provider_name=req.provider_name,
        )
        return EmbedResponse(
            embedding=result.embedding,
            dimensions=result.dimensions if hasattr(result, "dimensions") else len(result.embedding),
            provider=result.provider if hasattr(result, "provider") else "",
            cached=result.cached if hasattr(result, "cached") else False,
        )
    except Exception as e:
        raise _error(500, f"Embedding failed: {e}")


@router.post(
    "/embed-batch",
    response_model=EmbedBatchResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def embed_batch(
    req: EmbedBatchRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> EmbedBatchResponse:
    if stack.embedding_manager is None:
        raise _error(503, "Embedding manager not available")

    try:
        result = stack.embedding_manager.embed_batch(
            texts=req.texts,
            provider_name=req.provider_name,
        )
        return EmbedBatchResponse(
            embeddings=result.embeddings,
            dimensions=result.dimensions if hasattr(result, "dimensions") else (len(result.embeddings[0]) if result.embeddings else 0),
            provider=result.provider if hasattr(result, "provider") else "",
            total_embedded=len(result.embeddings),
            cached_count=result.cached_count if hasattr(result, "cached_count") else 0,
        )
    except Exception as e:
        raise _error(500, f"Batch embedding failed: {e}")


@router.get("/statistics", response_model=EmbeddingStatisticsResponse)
async def embedding_statistics(
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> EmbeddingStatisticsResponse:
    if stack.embedding_manager is None:
        raise _error(503, "Embedding manager not available")

    try:
        stats = stack.embedding_manager.get_statistics()
        return EmbeddingStatisticsResponse(
            total_embeddings=stats.total_embeddings if hasattr(stats, "total_embeddings") else 0,
            cache_hits=stats.cache_hits if hasattr(stats, "cache_hits") else 0,
            cache_misses=stats.cache_misses if hasattr(stats, "cache_misses") else 0,
            providers=[],
        )
    except Exception as e:
        raise _error(500, f"Failed to get statistics: {e}")
