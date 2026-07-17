"""Chat API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from aios.api.auth import get_current_user
from aios.api.dependencies import get_stack
from aios.api.pydantic_schemas import (
    ChatRequest,
    ChatResponse,
    ErrorDetail,
)
from aios.api.stack import EOSStack

router = APIRouter(prefix="/chat", tags=["chat"])


def _error(status: int, detail: str) -> HTTPException:
    return HTTPException(status_code=status, detail=detail)


@router.post(
    "",
    response_model=ChatResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def chat(
    req: ChatRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> ChatResponse:
    if stack.agent_manager is not None and req.agent_name:
        try:
            response = stack.agent_manager.chat(req.agent_name, req.message)
            return ChatResponse(
                response=response,
                conversation_id=req.agent_name,
                model=req.model or "agent",
            )
        except Exception as e:
            raise _error(500, f"Agent chat failed: {e}")

    if stack.llm_manager is not None:
        try:
            from aios.llm.models import LLMMessage, LLMRequest
            llm_req = LLMRequest(
                messages=(LLMMessage(role="user", content=req.message),),
                temperature=req.temperature,
                max_tokens=req.max_tokens,
            )
            result = stack.llm_manager.generate(llm_req)
            tokens = result.usage.total_tokens if hasattr(result, "usage") else 0
            return ChatResponse(
                response=result.content,
                tokens_used=tokens,
                model=result.model or req.model or "default",
            )
        except Exception as e:
            raise _error(500, f"LLM generation failed: {e}")

    raise _error(503, "No LLM or agent available")


@router.get("/history/{conversation_id}")
async def chat_history(
    conversation_id: str,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.agent_manager is None:
        raise _error(503, "Agent manager not available")

    agent = stack.agent_manager.get_agent(conversation_id)
    if agent is None:
        raise _error(404, f"Agent not found: {conversation_id}")

    try:
        history = agent.conversation.get_history()
        return {
            "conversation_id": conversation_id,
            "messages": [
                {
                    "role": m.role,
                    "content": m.content,
                    "timestamp": m.timestamp,
                }
                for m in history
            ],
            "total": len(history),
        }
    except Exception as e:
        raise _error(500, f"Failed to get history: {e}")


@router.delete("/history/{conversation_id}")
async def clear_chat_history(
    conversation_id: str,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.agent_manager is None:
        raise _error(503, "Agent manager not available")

    agent = stack.agent_manager.get_agent(conversation_id)
    if agent is None:
        raise _error(404, f"Agent not found: {conversation_id}")

    try:
        agent.conversation.clear()
        return {"conversation_id": conversation_id, "status": "cleared"}
    except Exception as e:
        raise _error(500, f"Failed to clear history: {e}")
