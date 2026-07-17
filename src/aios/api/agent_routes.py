"""Agent API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from aios.api.auth import get_current_user
from aios.api.dependencies import get_stack
from aios.api.pydantic_schemas import (
    AgentChatRequest,
    AgentChatResponse,
    AgentCreateRequest,
    AgentCreateResponse,
    AgentInfo,
    AgentRunRequest,
    AgentRunResponse,
    AgentStatisticsResponse,
    ErrorDetail,
)
from aios.api.stack import EOSStack

router = APIRouter(prefix="/agents", tags=["agents"])


def _error(status: int, detail: str) -> HTTPException:
    return HTTPException(status_code=status, detail=detail)


@router.post(
    "",
    response_model=AgentCreateResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def create_agent(
    req: AgentCreateRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> AgentCreateResponse:
    if stack.agent_manager is None:
        raise _error(503, "Agent manager not available")

    try:
        from aios.agent.agent_manager import AgentConfig
        config = AgentConfig(
            name=req.name,
            model=req.model or "",
            max_steps=req.max_turns,
            system_prompt=req.description,
            tools=tuple(req.tools),
        )
        agent = stack.agent_manager.create_agent(config)
        return AgentCreateResponse(
            name=agent.name,
            agent_id=agent.agent_id,
            status="created",
        )
    except Exception as e:
        raise _error(500, f"Failed to create agent: {e}")


@router.get("/statistics", response_model=AgentStatisticsResponse)
async def agent_statistics(
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> AgentStatisticsResponse:
    if stack.agent_manager is None:
        raise _error(503, "Agent manager not available")

    try:
        stats = stack.agent_manager.statistics()
        return AgentStatisticsResponse(
            agents={},
            total_agents=len(stats),
        )
    except Exception as e:
        raise _error(500, f"Failed to get statistics: {e}")


@router.get("", response_model=list[AgentInfo])
async def list_agents(
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> list[AgentInfo]:
    if stack.agent_manager is None:
        raise _error(503, "Agent manager not available")

    try:
        names = stack.agent_manager.list_agents()
        agents = []
        for name in names:
            agent = stack.agent_manager.get_agent(name)
            if agent:
                agents.append(AgentInfo(
                    name=agent.name,
                    role=getattr(agent, "role", ""),
                    description=getattr(agent, "description", ""),
                    status="initialized" if agent.is_initialized else "unknown",
                    is_initialized=agent.is_initialized,
                ))
        return agents
    except Exception as e:
        raise _error(500, f"Failed to list agents: {e}")


@router.get("/{name}", response_model=AgentInfo)
async def get_agent(
    name: str,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> AgentInfo:
    if stack.agent_manager is None:
        raise _error(503, "Agent manager not available")

    agent = stack.agent_manager.get_agent(name)
    if agent is None:
        raise _error(404, f"Agent not found: {name}")

    return AgentInfo(
        name=agent.name,
        role=getattr(agent, "role", ""),
        description=getattr(agent, "description", ""),
        status="initialized" if agent.is_initialized else "unknown",
        is_initialized=agent.is_initialized,
    )


@router.delete("/{name}")
async def delete_agent(
    name: str,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.agent_manager is None:
        raise _error(503, "Agent manager not available")

    try:
        removed = stack.agent_manager.remove_agent(name)
        if not removed:
            raise _error(404, f"Agent not found: {name}")
        return {"name": name, "status": "removed"}
    except HTTPException:
        raise
    except Exception as e:
        raise _error(500, f"Failed to remove agent: {e}")


@router.post(
    "/run",
    response_model=AgentRunResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def run_agent(
    req: AgentRunRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> AgentRunResponse:
    if stack.agent_manager is None:
        raise _error(503, "Agent manager not available")

    try:
        import time
        start = time.time()
        result = stack.agent_manager.run_agent(req.agent_name, req.goal)
        duration = time.time() - start
        return AgentRunResponse(
            agent_name=req.agent_name,
            result=result.output if hasattr(result, "output") else str(result),
            success=result.success if hasattr(result, "success") else True,
            turns_used=result.turns if hasattr(result, "turns") else 0,
            duration_seconds=duration,
        )
    except Exception as e:
        raise _error(500, f"Agent execution failed: {e}")


@router.post(
    "/chat",
    response_model=AgentChatResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def chat_with_agent(
    req: AgentChatRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> AgentChatResponse:
    if stack.agent_manager is None:
        raise _error(503, "Agent manager not available")

    try:
        response = stack.agent_manager.chat(req.agent_name, req.message)
        agent = stack.agent_manager.get_agent(req.agent_name)
        conv_len = agent.conversation.count() if agent else 0
        return AgentChatResponse(
            agent_name=req.agent_name,
            response=response,
            conversation_length=conv_len,
        )
    except Exception as e:
        raise _error(500, f"Agent chat failed: {e}")
