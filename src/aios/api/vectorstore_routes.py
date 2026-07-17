"""Vector store API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from aios.api.auth import get_current_user
from aios.api.dependencies import get_stack
from aios.api.pydantic_schemas import (
    ErrorDetail,
    VectorSearchRequest,
    VectorSearchResponse,
    VectorStatisticsResponse,
    VectorUpsertRequest,
    VectorUpsertResponse,
)
from aios.api.stack import EOSStack

router = APIRouter(prefix="/vectorstores", tags=["vectorstores"])


def _error(status: int, detail: str) -> HTTPException:
    return HTTPException(status_code=status, detail=detail)


@router.post(
    "/upsert",
    response_model=VectorUpsertResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def upsert_vectors(
    req: VectorUpsertRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> VectorUpsertResponse:
    if stack.vectorstore_manager is None:
        raise _error(503, "Vector store manager not available")

    try:
        from aios.vectorstore.models import VectorRecord
        records = [
            VectorRecord(
                id=r.get("id", r.get("record_id", "")),
                vector=tuple(r.get("vector", [])),
                metadata=r.get("metadata", {}),
                namespace=req.namespace,
            )
            for r in req.records
        ]
        count = stack.vectorstore_manager.upsert(
            records=records,
            namespace=req.namespace,
            provider_name=req.provider_name,
        )
        return VectorUpsertResponse(
            upserted_count=count,
            namespace=req.namespace,
            provider=req.provider_name or "default",
        )
    except Exception as e:
        raise _error(500, f"Upsert failed: {e}")


@router.post(
    "/search",
    response_model=VectorSearchResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def search_vectors(
    req: VectorSearchRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> VectorSearchResponse:
    if stack.vectorstore_manager is None:
        raise _error(503, "Vector store manager not available")

    try:
        results = stack.vectorstore_manager.search(
            query_vector=req.query_vector,
            top_k=req.top_k,
            namespace=req.namespace,
            filters=req.filters,
            provider_name=req.provider_name,
        )
        return VectorSearchResponse(
            results=[
                {
                    "record_id": r.record.id,
                    "score": r.score,
                    "metadata": r.record.metadata,
                }
                for r in results
            ],
            total_found=len(results),
            namespace=req.namespace,
        )
    except Exception as e:
        raise _error(500, f"Search failed: {e}")


@router.delete("/{record_id}")
async def delete_vector(
    record_id: str,
    namespace: str = "default",
    provider_name: str | None = None,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.vectorstore_manager is None:
        raise _error(503, "Vector store manager not available")

    try:
        deleted = stack.vectorstore_manager.delete(
            record_id=record_id,
            namespace=namespace,
            provider_name=provider_name,
        )
        if not deleted:
            raise _error(404, f"Vector not found: {record_id}")
        return {"record_id": record_id, "status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise _error(500, f"Delete failed: {e}")


@router.get("/namespaces")
async def list_namespaces(
    provider_name: str | None = None,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.vectorstore_manager is None:
        raise _error(503, "Vector store manager not available")

    try:
        namespaces = stack.vectorstore_manager.list_namespaces(provider_name=provider_name)
        return {"namespaces": namespaces, "total": len(namespaces)}
    except Exception as e:
        raise _error(500, f"Failed to list namespaces: {e}")


@router.get("/providers")
async def list_providers(
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.vectorstore_manager is None:
        raise _error(503, "Vector store manager not available")

    try:
        providers = stack.vectorstore_manager.list_providers()
        return {"providers": providers, "total": len(providers)}
    except Exception as e:
        raise _error(500, f"Failed to list providers: {e}")


@router.get("/statistics", response_model=VectorStatisticsResponse)
async def vectorstore_statistics(
    provider_name: str | None = None,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> VectorStatisticsResponse:
    if stack.vectorstore_manager is None:
        raise _error(503, "Vector store manager not available")

    try:
        stats = stack.vectorstore_manager.get_statistics(provider_name=provider_name)
        namespaces = stack.vectorstore_manager.list_namespaces(provider_name=provider_name)
        providers = stack.vectorstore_manager.list_providers()
        return VectorStatisticsResponse(
            total_vectors=stats.total_vectors if hasattr(stats, "total_vectors") else 0,
            namespaces=namespaces,
            providers=providers,
        )
    except Exception as e:
        raise _error(500, f"Failed to get statistics: {e}")
