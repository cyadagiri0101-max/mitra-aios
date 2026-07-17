"""Tests for WebSocket endpoints."""

from __future__ import annotations

import json
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from aios.api.app import create_app
from aios.api.dependencies import reset_stack, set_stack
from aios.api.stack import EOSStack


@pytest.fixture
def mock_stack():
    """Create a mock EOSStack."""
    stack = EOSStack()

    stack.runtime_engine = MagicMock()
    stack.runtime_engine.is_initialized = True

    stack.agent_manager = MagicMock()
    stack.agent_manager.is_initialized = True

    stack.tool_manager = MagicMock()
    stack.tool_manager.is_initialized = True

    stack.llm_manager = MagicMock()
    stack.llm_manager.is_initialized = True

    set_stack(stack)
    yield stack
    reset_stack()


@pytest.fixture
def client(mock_stack):
    """Create test client."""
    app = create_app()
    return TestClient(app)


class TestWebSocketConnection:
    """Test WebSocket connection management."""

    def test_websocket_connect(self, client, mock_stack):
        """Test basic WebSocket connection."""
        with client.websocket_connect("/api/v1/ws") as websocket:
            websocket.send_text(json.dumps({"action": "ping"}))
            data = websocket.receive_json()
            assert data["type"] == "pong"

    def test_websocket_subscribe(self, client, mock_stack):
        """Test subscribing to channels."""
        with client.websocket_connect("/api/v1/ws") as websocket:
            websocket.send_text(json.dumps({
                "action": "subscribe",
                "channels": ["runtime", "workflow"],
            }))
            data = websocket.receive_json()
            assert data["type"] == "subscribed"
            assert "runtime" in data["channels"]
            assert "workflow" in data["channels"]

    def test_websocket_unsubscribe(self, client, mock_stack):
        """Test unsubscribing from channels."""
        with client.websocket_connect("/api/v1/ws") as websocket:
            websocket.send_text(json.dumps({
                "action": "subscribe",
                "channels": ["runtime"],
            }))
            websocket.receive_json()

            websocket.send_text(json.dumps({
                "action": "unsubscribe",
                "channels": ["runtime"],
            }))
            data = websocket.receive_json()
            assert data["type"] == "unsubscribed"


class TestRuntimeWebSocket:
    """Test runtime events WebSocket."""

    def test_runtime_websocket_connect(self, client, mock_stack):
        """Test runtime WebSocket connection."""
        with client.websocket_connect("/api/v1/ws/runtime") as websocket:
            data = websocket.receive_json()
            assert data["type"] == "connected"
            assert data["channel"] == "runtime"


class TestWorkflowWebSocket:
    """Test workflow progress WebSocket."""

    def test_workflow_websocket_connect(self, client, mock_stack):
        """Test workflow WebSocket connection."""
        mock_state = MagicMock()
        mock_state.value = "running"
        mock_stack.runtime_engine.status.return_value = mock_state

        mock_snapshot = MagicMock()
        mock_snapshot.completed_count = 2
        mock_snapshot.step_count = 5
        mock_snapshot.failed_count = 0
        mock_stack.runtime_engine.snapshot.return_value = mock_snapshot

        with client.websocket_connect("/api/v1/ws/workflow/exec-123") as websocket:
            data = websocket.receive_json()
            assert data["type"] == "connected"
            assert data["execution_id"] == "exec-123"


class TestAgentWebSocket:
    """Test agent updates WebSocket."""

    def test_agent_websocket_connect(self, client, mock_stack):
        """Test agent WebSocket connection."""
        mock_agent = MagicMock()
        mock_stack.agent_manager.get_agent.return_value = mock_agent

        with client.websocket_connect("/api/v1/ws/agent/test-agent") as websocket:
            data = websocket.receive_json()
            assert data["type"] == "connected"
            assert data["agent_name"] == "test-agent"

    def test_agent_websocket_chat(self, client, mock_stack):
        """Test chatting via WebSocket."""
        mock_agent = MagicMock()
        mock_stack.agent_manager.get_agent.return_value = mock_agent
        mock_stack.agent_manager.chat.return_value = "Agent response"

        with client.websocket_connect("/api/v1/ws/agent/test-agent") as websocket:
            websocket.receive_json()

            websocket.send_text(json.dumps({
                "action": "chat",
                "message": "Hello",
            }))
            data = websocket.receive_json()
            assert data["type"] == "agent_response"
            assert data["message"] == "Agent response"

    def test_agent_websocket_not_found(self, client, mock_stack):
        """Test agent WebSocket with non-existent agent."""
        mock_stack.agent_manager.get_agent.return_value = None

        with client.websocket_connect("/api/v1/ws/agent/nonexistent") as websocket:
            data = websocket.receive_json()
            assert data["type"] == "error"
            assert "not found" in data["message"]


class TestToolsWebSocket:
    """Test tool execution WebSocket."""

    def test_tools_websocket_connect(self, client, mock_stack):
        """Test tools WebSocket connection."""
        with client.websocket_connect("/api/v1/ws/tools") as websocket:
            data = websocket.receive_json()
            assert data["type"] == "connected"
            assert data["channel"] == "tools"

    def test_tools_websocket_execute(self, client, mock_stack):
        """Test executing tool via WebSocket."""
        mock_result = MagicMock()
        mock_result.success = True
        mock_result.output = "Tool output"
        mock_result.error = None
        mock_result.duration = 1.5
        mock_stack.tool_manager.execute.return_value = mock_result

        with client.websocket_connect("/api/v1/ws/tools") as websocket:
            websocket.receive_json()

            websocket.send_text(json.dumps({
                "action": "execute",
                "tool_name": "test-tool",
                "parameters": {"param1": "value1"},
            }))

            data = websocket.receive_json()
            assert data["type"] == "tool_started"
            assert data["tool_name"] == "test-tool"

            data = websocket.receive_json()
            assert data["type"] == "tool_completed"
            assert data["success"] is True
            assert data["output"] == "Tool output"


class TestChatWebSocket:
    """Test streaming chat WebSocket."""

    def test_chat_websocket_connect(self, client, mock_stack):
        """Test chat WebSocket connection."""
        with client.websocket_connect("/api/v1/ws/chat") as websocket:
            data = websocket.receive_json()
            assert data["type"] == "connected"
            assert data["channel"] == "chat"

    def test_chat_websocket_stream(self, client, mock_stack):
        """Test streaming chat via WebSocket."""
        mock_chunk = MagicMock()
        mock_chunk.content = "Hello"
        mock_stack.llm_manager.stream.return_value = [mock_chunk]

        with client.websocket_connect("/api/v1/ws/chat") as websocket:
            websocket.receive_json()

            websocket.send_text(json.dumps({
                "action": "chat",
                "message": "Hi",
                "model": "test-model",
            }))

            data = websocket.receive_json()
            assert data["type"] == "chat_start"

            data = websocket.receive_json()
            assert data["type"] == "chat_chunk"
            assert data["content"] == "Hello"

            data = websocket.receive_json()
            assert data["type"] == "chat_complete"
            assert data["full_response"] == "Hello"


class TestWebSocketReconnect:
    """Test WebSocket reconnection."""

    def test_websocket_disconnect_handling(self, client, mock_stack):
        """Test WebSocket disconnect handling."""
        with client.websocket_connect("/api/v1/ws") as websocket:
            websocket.send_text(json.dumps({"action": "ping"}))
            websocket.receive_json()

        with client.websocket_connect("/api/v1/ws") as websocket:
            websocket.send_text(json.dumps({"action": "ping"}))
            data = websocket.receive_json()
            assert data["type"] == "pong"


class TestWebSocketMultipleClients:
    """Test multiple WebSocket clients."""

    def test_multiple_connections(self, client, mock_stack):
        """Test multiple simultaneous WebSocket connections."""
        with client.websocket_connect("/api/v1/ws") as ws1, \
             client.websocket_connect("/api/v1/ws") as ws2:

            ws1.send_text(json.dumps({"action": "ping"}))
            data1 = ws1.receive_json()
            assert data1["type"] == "pong"

            ws2.send_text(json.dumps({"action": "ping"}))
            data2 = ws2.receive_json()
            assert data2["type"] == "pong"
