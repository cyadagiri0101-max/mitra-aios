"""WebSocket route handlers for real-time updates."""

from __future__ import annotations

import asyncio
import json
import time
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from aios.api.dependencies import get_stack
from aios.api.websocket_manager import manager
from aios.core.logger import get_logger

logger = get_logger("aios.api.websocket_routes")

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """Main WebSocket endpoint for real-time updates."""
    client_id = str(uuid.uuid4())
    await manager.connect(client_id, websocket)

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                await manager.send_personal(client_id, {
                    "type": "error",
                    "message": "Invalid JSON",
                })
                continue

            action = message.get("action")
            if action == "subscribe":
                channels = message.get("channels", [])
                await manager.subscribe(client_id, channels)
                await manager.send_personal(client_id, {
                    "type": "subscribed",
                    "channels": channels,
                })
            elif action == "unsubscribe":
                channels = message.get("channels", [])
                await manager.unsubscribe(client_id, channels)
                await manager.send_personal(client_id, {
                    "type": "unsubscribed",
                    "channels": channels,
                })
            elif action == "ping":
                await manager.send_personal(client_id, {
                    "type": "pong",
                    "timestamp": time.time(),
                })
            else:
                await manager.send_personal(client_id, {
                    "type": "error",
                    "message": f"Unknown action: {action}",
                })

    except WebSocketDisconnect:
        await manager.disconnect(client_id)
    except Exception as e:
        logger.error("WebSocket error for %s: %s", client_id, e)
        try:
            await manager.send_personal(client_id, {
                "type": "error",
                "message": f"Internal error: {e}",
            })
        except Exception:
            pass
        await manager.disconnect(client_id)


@router.websocket("/ws/runtime")
async def runtime_events_websocket(websocket: WebSocket) -> None:
    """WebSocket endpoint for runtime events."""
    client_id = f"runtime-{uuid.uuid4()}"
    await manager.connect(client_id, websocket)
    await manager.subscribe(client_id, ["runtime.*"])

    try:
        stack = get_stack()
        if stack.runtime_engine and stack.runtime_engine.is_initialized:
            await manager.send_personal(client_id, {
                "type": "connected",
                "channel": "runtime",
                "message": "Subscribed to runtime events",
            })

            while True:
                await asyncio.sleep(0.1)
                data = await websocket.receive_text()
                message = json.loads(data)
                if message.get("action") == "ping":
                    await manager.send_personal(client_id, {
                        "type": "pong",
                        "timestamp": time.time(),
                    })
        else:
            await manager.send_personal(client_id, {
                "type": "error",
                "message": "Runtime engine not initialized",
            })

    except WebSocketDisconnect:
        await manager.disconnect(client_id)
    except Exception as e:
        logger.error("Runtime WebSocket error: %s", e)
        await manager.disconnect(client_id)


@router.websocket("/ws/workflow/{execution_id}")
async def workflow_progress_websocket(websocket: WebSocket, execution_id: str) -> None:
    """WebSocket endpoint for workflow progress updates."""
    client_id = f"workflow-{execution_id}-{uuid.uuid4()}"
    await manager.connect(client_id, websocket)
    await manager.subscribe(client_id, [f"workflow.{execution_id}"])

    try:
        stack = get_stack()
        if stack.runtime_engine and stack.runtime_engine.is_initialized:
            await manager.send_personal(client_id, {
                "type": "connected",
                "channel": f"workflow.{execution_id}",
                "execution_id": execution_id,
            })

            last_status = None
            while True:
                try:
                    state = stack.runtime_engine.status(execution_id)
                    snapshot = stack.runtime_engine.snapshot(execution_id)

                    current_status = {
                        "state": state.value,
                        "completed": snapshot.completed_count,
                        "total": snapshot.step_count,
                        "failed": snapshot.failed_count,
                    }

                    if current_status != last_status:
                        await manager.send_personal(client_id, {
                            "type": "workflow_progress",
                            "execution_id": execution_id,
                            "status": current_status,
                            "timestamp": time.time(),
                        })
                        last_status = current_status

                        if state.value in ["completed", "failed", "cancelled"]:
                            break

                    await asyncio.sleep(0.5)
                except Exception:
                    await manager.send_personal(client_id, {
                        "type": "error",
                        "message": f"Execution not found: {execution_id}",
                    })
                    break
        else:
            await manager.send_personal(client_id, {
                "type": "error",
                "message": "Runtime engine not initialized",
            })

    except WebSocketDisconnect:
        await manager.disconnect(client_id)
    except Exception as e:
        logger.error("Workflow WebSocket error: %s", e)
        await manager.disconnect(client_id)


@router.websocket("/ws/agent/{agent_name}")
async def agent_updates_websocket(websocket: WebSocket, agent_name: str) -> None:
    """WebSocket endpoint for agent updates."""
    client_id = f"agent-{agent_name}-{uuid.uuid4()}"
    await manager.connect(client_id, websocket)
    await manager.subscribe(client_id, [f"agent.{agent_name}"])

    try:
        stack = get_stack()
        if stack.agent_manager and stack.agent_manager.is_initialized:
            agent = stack.agent_manager.get_agent(agent_name)
            if agent:
                await manager.send_personal(client_id, {
                    "type": "connected",
                    "channel": f"agent.{agent_name}",
                    "agent_name": agent_name,
                    "message": "Subscribed to agent updates",
                })

                while True:
                    data = await websocket.receive_text()
                    message = json.loads(data)

                    if message.get("action") == "chat":
                        user_message = message.get("message", "")
                        try:
                            response = stack.agent_manager.chat(agent_name, user_message)
                            await manager.send_personal(client_id, {
                                "type": "agent_response",
                                "agent_name": agent_name,
                                "message": response,
                                "timestamp": time.time(),
                            })
                        except Exception as e:
                            await manager.send_personal(client_id, {
                                "type": "error",
                                "message": f"Chat failed: {e}",
                            })
                    elif message.get("action") == "ping":
                        await manager.send_personal(client_id, {
                            "type": "pong",
                            "timestamp": time.time(),
                        })
            else:
                await manager.send_personal(client_id, {
                    "type": "error",
                    "message": f"Agent not found: {agent_name}",
                })
        else:
            await manager.send_personal(client_id, {
                "type": "error",
                "message": "Agent manager not initialized",
            })

    except WebSocketDisconnect:
        await manager.disconnect(client_id)
    except Exception as e:
        logger.error("Agent WebSocket error: %s", e)
        await manager.disconnect(client_id)


@router.websocket("/ws/tools")
async def tool_execution_websocket(websocket: WebSocket) -> None:
    """WebSocket endpoint for tool execution updates."""
    client_id = f"tools-{uuid.uuid4()}"
    await manager.connect(client_id, websocket)
    await manager.subscribe(client_id, ["tools.*"])

    try:
        stack = get_stack()
        if stack.tool_manager and stack.tool_manager.is_initialized:
            await manager.send_personal(client_id, {
                "type": "connected",
                "channel": "tools",
                "message": "Subscribed to tool execution updates",
            })

            while True:
                data = await websocket.receive_text()
                message = json.loads(data)

                if message.get("action") == "execute":
                    tool_name = message.get("tool_name")
                    parameters = message.get("parameters", {})

                    try:
                        from aios.tools.models import ToolRequest
                        request = ToolRequest(
                            tool_name=tool_name,
                            arguments=parameters,
                        )

                        await manager.send_personal(client_id, {
                            "type": "tool_started",
                            "tool_name": tool_name,
                            "timestamp": time.time(),
                        })

                        result = stack.tool_manager.execute(request)

                        await manager.send_personal(client_id, {
                            "type": "tool_completed",
                            "tool_name": tool_name,
                            "success": result.success,
                            "output": result.output if result.success else None,
                            "error": result.error if not result.success else None,
                            "duration": result.duration,
                            "timestamp": time.time(),
                        })
                    except Exception as e:
                        await manager.send_personal(client_id, {
                            "type": "tool_error",
                            "tool_name": tool_name,
                            "error": str(e),
                            "timestamp": time.time(),
                        })
                elif message.get("action") == "ping":
                    await manager.send_personal(client_id, {
                        "type": "pong",
                        "timestamp": time.time(),
                    })
        else:
            await manager.send_personal(client_id, {
                "type": "error",
                "message": "Tool manager not initialized",
            })

    except WebSocketDisconnect:
        await manager.disconnect(client_id)
    except Exception as e:
        logger.error("Tools WebSocket error: %s", e)
        await manager.disconnect(client_id)


@router.websocket("/ws/chat")
async def streaming_chat_websocket(websocket: WebSocket) -> None:
    """WebSocket endpoint for streaming chat with LLM."""
    client_id = f"chat-{uuid.uuid4()}"
    await manager.connect(client_id, websocket)
    await manager.subscribe(client_id, ["chat"])

    try:
        stack = get_stack()
        if stack.llm_manager and stack.llm_manager.is_initialized:
            await manager.send_personal(client_id, {
                "type": "connected",
                "channel": "chat",
                "message": "Connected to streaming chat",
            })

            while True:
                data = await websocket.receive_text()
                message = json.loads(data)

                if message.get("action") == "chat":
                    user_message = message.get("message", "")
                    model = message.get("model", "default")
                    temperature = message.get("temperature", 0.7)
                    max_tokens = message.get("max_tokens", 1024)

                    try:
                        from aios.llm.models import LLMMessage, LLMRequest

                        request = LLMRequest(
                            messages=(LLMMessage(role="user", content=user_message),),
                            temperature=temperature,
                            max_tokens=max_tokens,
                            stream=True,
                        )

                        await manager.send_personal(client_id, {
                            "type": "chat_start",
                            "model": model,
                            "timestamp": time.time(),
                        })

                        full_response = ""
                        for chunk in stack.llm_manager.stream(request):
                            if chunk.content:
                                full_response += chunk.content
                                await manager.send_personal(client_id, {
                                    "type": "chat_chunk",
                                    "content": chunk.content,
                                    "timestamp": time.time(),
                                })

                        await manager.send_personal(client_id, {
                            "type": "chat_complete",
                            "full_response": full_response,
                            "timestamp": time.time(),
                        })
                    except Exception as e:
                        await manager.send_personal(client_id, {
                            "type": "chat_error",
                            "error": str(e),
                            "timestamp": time.time(),
                        })
                elif message.get("action") == "ping":
                    await manager.send_personal(client_id, {
                        "type": "pong",
                        "timestamp": time.time(),
                    })
        else:
            await manager.send_personal(client_id, {
                "type": "error",
                "message": "LLM manager not initialized",
            })

    except WebSocketDisconnect:
        await manager.disconnect(client_id)
    except Exception as e:
        logger.error("Chat WebSocket error: %s", e)
        await manager.disconnect(client_id)
