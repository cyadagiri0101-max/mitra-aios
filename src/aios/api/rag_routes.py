"""RAG API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from aios.api.auth import get_current_user
from aios.api.dependencies import get_stack
from aios.api.pydantic_schemas import (
    ErrorDetail,
    RAGIndexRequest,
    RAGIndexResponse,
    RAGSearchRequest,
    RAGSearchResponse,
    RAGStatisticsResponse,
)
from aios.api.stack import EOSStack

router = APIRouter(prefix="/rag", tags=["rag"])


def _error(status: int, detail: str) -> HTTPException:
    return HTTPException(status_code=status, detail=detail)


@router.post(
    "/index",
    response_model=RAGIndexResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def index_document(
    req: RAGIndexRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> RAGIndexResponse:
    if stack.rag_manager is None:
        raise _error(503, "RAG manager not available")

    try:
        from aios.rag.models import Document
        doc = Document(
            content=req.content,
            metadata={**req.metadata, "title": req.title, "source": req.source},
        )
        doc_id = stack.rag_manager.index_document(doc)
        return RAGIndexResponse(
            document_id=doc_id,
            chunks_created=0,
            embeddings_generated=0,
        )
    except Exception as e:
        raise _error(500, f"Failed to index document: {e}")


@router.post(
    "/search",
    response_model=RAGSearchResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def search(
    req: RAGSearchRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> RAGSearchResponse:
    if stack.rag_manager is None:
        raise _error(503, "RAG manager not available")

    try:
        if req.include_citations:
            results, citations = stack.rag_manager.search_with_citations(
                query=req.query,
                top_k=req.top_k,
            )
            return RAGSearchResponse(
                results=[
                    {
                        "content": r.content,
                        "score": r.score,
                        "source": r.source,
                        "metadata": r.metadata if hasattr(r, "metadata") else {},
                    }
                    for r in results
                ],
                citations=[
                    {
                        "citation_id": c.citation_id,
                        "source": c.source,
                        "content": c.content,
                    }
                    for c in citations
                ],
                total_found=len(results),
            )
        else:
            results = stack.rag_manager.search(
                query=req.query,
                top_k=req.top_k,
                method=req.method,
            )
            return RAGSearchResponse(
                results=[
                    {
                        "content": r.content,
                        "score": r.score,
                        "source": r.source,
                        "metadata": r.metadata if hasattr(r, "metadata") else {},
                    }
                    for r in results
                ],
                total_found=len(results),
            )
    except Exception as e:
        raise _error(500, f"Search failed: {e}")


@router.get("/statistics", response_model=RAGStatisticsResponse)
async def rag_statistics(
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> RAGStatisticsResponse:
    if stack.rag_manager is None:
        raise _error(503, "RAG manager not available")

    try:
        stats = stack.rag_manager.get_statistics()
        return RAGStatisticsResponse(
            total_documents=stats.total_documents if hasattr(stats, "total_documents") else 0,
            total_chunks=stats.total_chunks if hasattr(stats, "total_chunks") else 0,
            total_embeddings=stats.total_embeddings if hasattr(stats, "total_embeddings") else 0,
            search_count=stats.search_count if hasattr(stats, "search_count") else 0,
        )
    except Exception as e:
        raise _error(500, f"Failed to get statistics: {e}")
