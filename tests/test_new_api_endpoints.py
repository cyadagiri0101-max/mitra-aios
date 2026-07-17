"""Tests for new AIOS API endpoints (chat, agents, workflows, memory, rag, tools, plugins, embeddings, vectorstores, config, security)."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from aios.api.app import create_app
from aios.api.dependencies import reset_stack, set_stack
from aios.api.stack import EOSStack


@pytest.fixture
def mock_stack():
    """Create a mock EOSStack with all managers."""
    stack = EOSStack()

    stack.memory_manager = MagicMock()
    stack.memory_manager.is_initialized = True

    stack.llm_manager = MagicMock()
    stack.llm_manager.is_initialized = True

    stack.embedding_manager = MagicMock()
    stack.embedding_manager.is_initialized = True

    stack.vectorstore_manager = MagicMock()
    stack.vectorstore_manager.is_initialized = True

    stack.rag_manager = MagicMock()
    stack.rag_manager.is_initialized = True

    stack.tool_manager = MagicMock()
    stack.tool_manager.is_initialized = True

    stack.agent_manager = MagicMock()
    stack.agent_manager.is_initialized = True

    stack.plugin_manager = MagicMock()
    stack.plugin_manager.is_initialized = True

    stack.config_manager = MagicMock()
    stack.config_manager.is_initialized = True

    stack.security_manager = MagicMock()
    stack.security_manager.is_initialized = True

    stack.workflow_engine = MagicMock()
    stack.workflow_engine.is_initialized = True

    stack.runtime_engine = MagicMock()
    stack.runtime_engine.is_initialized = True

    stack.event_bus = MagicMock()
    stack.event_bus.is_initialized = True

    set_stack(stack)
    yield stack
    reset_stack()


@pytest.fixture
def client(mock_stack):
    """Create test client with mock stack."""
    app = create_app()
    return TestClient(app)


class TestChatEndpoints:
    """Test /chat endpoints."""

    def test_chat_with_llm(self, client, mock_stack):
        """Test chat with LLM."""
        mock_response = MagicMock()
        mock_response.content = "Hello! How can I help you?"
        mock_response.model = "test-model"
        mock_response.usage.total_tokens = 50
        mock_stack.llm_manager.generate.return_value = mock_response

        response = client.post("/api/v1/chat", json={
            "message": "Hello",
            "temperature": 0.7,
            "max_tokens": 100,
        })

        assert response.status_code == 200
        data = response.json()
        assert data["response"] == "Hello! How can I help you?"
        assert data["model"] == "test-model"
        assert data["tokens_used"] == 50

    def test_chat_with_agent(self, client, mock_stack):
        """Test chat with agent."""
        mock_stack.agent_manager.chat.return_value = "Agent response"

        response = client.post("/api/v1/chat", json={
            "message": "Hello",
            "agent_name": "test-agent",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["response"] == "Agent response"
        assert data["conversation_id"] == "test-agent"

    def test_chat_no_llm_or_agent(self, client, mock_stack):
        """Test chat when no LLM or agent available."""
        mock_stack.agent_manager = None
        mock_stack.llm_manager = None

        response = client.post("/api/v1/chat", json={"message": "Hello"})

        assert response.status_code == 503

    def test_chat_invalid_request(self, client, mock_stack):
        """Test chat with invalid request."""
        response = client.post("/api/v1/chat", json={})

        assert response.status_code == 422


class TestAgentEndpoints:
    """Test /agents endpoints."""

    def test_create_agent(self, client, mock_stack):
        """Test creating an agent."""
        mock_agent = MagicMock()
        mock_agent.name = "test-agent"
        mock_agent.agent_id = "agent-123"
        mock_stack.agent_manager.create_agent.return_value = mock_agent

        response = client.post("/api/v1/agents", json={
            "name": "test-agent",
            "role": "assistant",
            "description": "Test agent",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "test-agent"
        assert data["agent_id"] == "agent-123"
        assert data["status"] == "created"

    def test_list_agents(self, client, mock_stack):
        """Test listing agents."""
        mock_agent = MagicMock()
        mock_agent.name = "test-agent"
        mock_agent.role = "assistant"
        mock_agent.description = "Test"
        mock_agent.is_initialized = True
        mock_stack.agent_manager.list_agents.return_value = ["test-agent"]
        mock_stack.agent_manager.get_agent.return_value = mock_agent

        response = client.get("/api/v1/agents")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "test-agent"

    def test_get_agent(self, client, mock_stack):
        """Test getting a specific agent."""
        mock_agent = MagicMock()
        mock_agent.name = "test-agent"
        mock_agent.role = "assistant"
        mock_agent.description = "Test"
        mock_agent.is_initialized = True
        mock_stack.agent_manager.get_agent.return_value = mock_agent

        response = client.get("/api/v1/agents/test-agent")

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "test-agent"

    def test_get_agent_not_found(self, client, mock_stack):
        """Test getting non-existent agent."""
        mock_stack.agent_manager.get_agent.return_value = None

        response = client.get("/api/v1/agents/nonexistent")

        assert response.status_code == 404

    def test_delete_agent(self, client, mock_stack):
        """Test deleting an agent."""
        mock_stack.agent_manager.remove_agent.return_value = True

        response = client.delete("/api/v1/agents/test-agent")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "removed"

    def test_run_agent(self, client, mock_stack):
        """Test running an agent."""
        mock_result = MagicMock()
        mock_result.output = "Task completed"
        mock_result.success = True
        mock_result.turns = 3
        mock_stack.agent_manager.run_agent.return_value = mock_result

        response = client.post("/api/v1/agents/run", json={
            "goal": "Complete task",
            "agent_name": "test-agent",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["result"] == "Task completed"
        assert data["success"] is True

    def test_chat_with_agent_endpoint(self, client, mock_stack):
        """Test chatting with agent via /agents/chat."""
        mock_stack.agent_manager.chat.return_value = "Agent response"
        mock_agent = MagicMock()
        mock_agent.conversation.count.return_value = 5
        mock_stack.agent_manager.get_agent.return_value = mock_agent

        response = client.post("/api/v1/agents/chat", json={
            "message": "Hello",
            "agent_name": "test-agent",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["response"] == "Agent response"
        assert data["conversation_length"] == 5

    def test_agent_statistics(self, client, mock_stack):
        """Test getting agent statistics."""
        mock_stats = MagicMock()
        mock_stats.__dict__ = {"total_runs": 10}
        mock_stack.agent_manager.statistics.return_value = {"test-agent": mock_stats}

        response = client.get("/api/v1/agents/statistics")

        assert response.status_code == 200
        data = response.json()
        assert data["total_agents"] == 1


class TestMemoryEndpoints:
    """Test /memory endpoints."""

    def test_store_memory(self, client, mock_stack):
        """Test storing a memory."""
        mock_entry = MagicMock()
        mock_entry.entry_id = "mem-123"
        mock_entry.timestamp = 1234567890.0
        mock_stack.memory_manager.store.return_value = mock_entry

        response = client.post("/api/v1/memory/store", json={
            "content": "Important information",
            "memory_type": "working",
            "importance": 0.8,
        })

        assert response.status_code == 200
        data = response.json()
        assert data["entry_id"] == "mem-123"
        assert data["memory_type"] == "working"

    def test_retrieve_memory_hybrid(self, client, mock_stack):
        """Test retrieving memories with hybrid search."""
        mock_result = MagicMock()
        mock_result.entry.entry_id = "mem-123"
        mock_result.entry.content = "Test content"
        mock_result.entry.memory_type = "working"
        mock_result.entry.timestamp = 1234567890.0
        mock_result.score = 0.95
        mock_stack.memory_manager.hybrid_retrieve.return_value = [mock_result]

        response = client.post("/api/v1/memory/retrieve", json={
            "query": "test",
            "method": "hybrid",
            "limit": 10,
        })

        assert response.status_code == 200
        data = response.json()
        assert data["total_found"] == 1
        assert data["results"][0]["entry_id"] == "mem-123"

    def test_forget_memory(self, client, mock_stack):
        """Test forgetting a memory."""
        mock_stack.memory_manager.forget.return_value = True

        response = client.post("/api/v1/memory/forget", json={
            "entry_id": "mem-123",
            "memory_type": "working",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "forgotten"

    def test_forget_memory_not_found(self, client, mock_stack):
        """Test forgetting non-existent memory."""
        mock_stack.memory_manager.forget.return_value = False

        response = client.post("/api/v1/memory/forget", json={
            "entry_id": "nonexistent",
            "memory_type": "working",
        })

        assert response.status_code == 404

    def test_consolidate_memory(self, client, mock_stack):
        """Test consolidating memories."""
        mock_result = MagicMock()
        mock_result.consolidated_count = 5
        mock_stack.memory_manager.consolidate_all.return_value = mock_result

        response = client.post("/api/v1/memory/consolidate")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["consolidated_count"] == 5

    def test_memory_statistics(self, client, mock_stack):
        """Test getting memory statistics."""
        mock_stats = MagicMock()
        mock_stats.working_count = 10
        mock_stats.episodic_count = 5
        mock_stats.semantic_count = 3
        mock_stats.total_count = 18
        mock_stats.consolidation_count = 2
        mock_stack.memory_manager.statistics.return_value = mock_stats

        response = client.get("/api/v1/memory/statistics")

        assert response.status_code == 200
        data = response.json()
        assert data["working_memory_count"] == 10
        assert data["total_memories"] == 18


class TestRAGEndpoints:
    """Test /rag endpoints."""

    def test_index_document(self, client, mock_stack):
        """Test indexing a document."""
        mock_stack.rag_manager.index_document.return_value = "doc-123"

        response = client.post("/api/v1/rag/index", json={
            "content": "Document content",
            "title": "Test Document",
            "source": "test",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["document_id"] == "doc-123"

    def test_search_rag(self, client, mock_stack):
        """Test RAG search."""
        mock_result = MagicMock()
        mock_result.content = "Search result"
        mock_result.score = 0.9
        mock_result.source = "test"
        mock_result.metadata = {}
        mock_stack.rag_manager.search.return_value = [mock_result]

        response = client.post("/api/v1/rag/search", json={
            "query": "test query",
            "top_k": 10,
            "method": "hybrid",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["total_found"] == 1
        assert data["results"][0]["content"] == "Search result"

    def test_search_with_citations(self, client, mock_stack):
        """Test RAG search with citations."""
        mock_result = MagicMock()
        mock_result.content = "Search result"
        mock_result.score = 0.9
        mock_result.source = "test"
        mock_result.metadata = {}

        mock_citation = MagicMock()
        mock_citation.citation_id = "cite-123"
        mock_citation.source = "test"
        mock_citation.content = "Citation content"

        mock_stack.rag_manager.search_with_citations.return_value = ([mock_result], [mock_citation])

        response = client.post("/api/v1/rag/search", json={
            "query": "test query",
            "top_k": 10,
            "include_citations": True,
        })

        assert response.status_code == 200
        data = response.json()
        assert len(data["citations"]) == 1
        assert data["citations"][0]["citation_id"] == "cite-123"

    def test_rag_statistics(self, client, mock_stack):
        """Test getting RAG statistics."""
        mock_stats = MagicMock()
        mock_stats.total_documents = 100
        mock_stats.total_chunks = 500
        mock_stats.total_embeddings = 500
        mock_stats.search_count = 50
        mock_stack.rag_manager.get_statistics.return_value = mock_stats

        response = client.get("/api/v1/rag/statistics")

        assert response.status_code == 200
        data = response.json()
        assert data["total_documents"] == 100
        assert data["total_chunks"] == 500


class TestToolEndpoints:
    """Test /tools endpoints."""

    def test_execute_tool(self, client, mock_stack):
        """Test executing a tool."""
        mock_result = MagicMock()
        mock_result.success = True
        mock_result.output = "Tool output"
        mock_result.error = ""
        mock_stack.tool_manager.execute.return_value = mock_result

        response = client.post("/api/v1/tools/execute", json={
            "tool_name": "test-tool",
            "parameters": {"param1": "value1"},
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["result"] == "Tool output"

    def test_list_tool_providers(self, client, mock_stack):
        """Test listing tool providers."""
        mock_stack.tool_manager.list_providers.return_value = ["provider1", "provider2"]

        response = client.get("/api/v1/tools/providers")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert "provider1" in data["providers"]

    def test_unregister_tool(self, client, mock_stack):
        """Test unregistering a tool."""
        mock_stack.tool_manager.unregister_provider.return_value = True

        response = client.delete("/api/v1/tools/test-tool")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "unregistered"

    def test_tool_statistics(self, client, mock_stack):
        """Test getting tool statistics."""
        mock_stats = MagicMock()
        mock_stats.total_executions = 100
        mock_stats.successful_executions = 95
        mock_stats.failed_executions = 5
        mock_stack.tool_manager.statistics.return_value = mock_stats
        mock_stack.tool_manager.list_providers.return_value = ["provider1"]
        mock_stack.tool_manager.list_tools.return_value = [MagicMock()]

        response = client.get("/api/v1/tools/statistics")

        assert response.status_code == 200
        data = response.json()
        assert data["total_executions"] == 100
        assert data["successful_executions"] == 95


class TestPluginEndpoints:
    """Test /plugins endpoints."""

    def test_install_plugin(self, client, mock_stack):
        """Test installing a plugin."""
        mock_stack.plugin_manager.install_plugin.return_value = True

        response = client.post("/api/v1/plugins/install", json={
            "name": "test-plugin",
            "version": "1.0.0",
            "description": "Test plugin",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "test-plugin"
        assert data["status"] == "installed"

    def test_uninstall_plugin(self, client, mock_stack):
        """Test uninstalling a plugin."""
        mock_stack.plugin_manager.uninstall_plugin.return_value = True

        response = client.post("/api/v1/plugins/uninstall/test-plugin")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "uninstalled"

    def test_enable_plugin(self, client, mock_stack):
        """Test enabling a plugin."""
        mock_stack.plugin_manager.enable_plugin.return_value = True

        response = client.post("/api/v1/plugins/enable/test-plugin")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "enabled"

    def test_disable_plugin(self, client, mock_stack):
        """Test disabling a plugin."""
        mock_stack.plugin_manager.disable_plugin.return_value = True

        response = client.post("/api/v1/plugins/disable/test-plugin")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "disabled"

    def test_list_plugins(self, client, mock_stack):
        """Test listing plugins."""
        mock_info = MagicMock()
        mock_info.name = "test-plugin"
        mock_info.version = "1.0.0"
        mock_info.description = "Test"
        mock_info.status = "enabled"
        mock_info.enabled = True
        mock_stack.plugin_manager.list_plugins.return_value = ["test-plugin"]
        mock_stack.plugin_manager.get_plugin.return_value = mock_info

        response = client.get("/api/v1/plugins")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "test-plugin"

    def test_plugin_statistics(self, client, mock_stack):
        """Test getting plugin statistics."""
        mock_stats = MagicMock()
        mock_stats.total_plugins = 10
        mock_stats.enabled_plugins = 8
        mock_stats.disabled_plugins = 2
        mock_stack.plugin_manager.get_statistics.return_value = mock_stats

        response = client.get("/api/v1/plugins/statistics")

        assert response.status_code == 200
        data = response.json()
        assert data["total_plugins"] == 10
        assert data["enabled_plugins"] == 8


class TestEmbeddingEndpoints:
    """Test /embeddings endpoints."""

    def test_embed_text(self, client, mock_stack):
        """Test embedding text."""
        mock_result = MagicMock()
        mock_result.embedding = [0.1, 0.2, 0.3]
        mock_result.dimensions = 3
        mock_result.provider = "test-provider"
        mock_result.cached = False
        mock_stack.embedding_manager.embed.return_value = mock_result

        response = client.post("/api/v1/embeddings/embed", json={
            "text": "Test text",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["embedding"] == [0.1, 0.2, 0.3]
        assert data["dimensions"] == 3

    def test_embed_batch(self, client, mock_stack):
        """Test batch embedding."""
        mock_result = MagicMock()
        mock_result.embeddings = [[0.1, 0.2], [0.3, 0.4]]
        mock_result.dimensions = 2
        mock_result.provider = "test-provider"
        mock_result.cached_count = 0
        mock_stack.embedding_manager.embed_batch.return_value = mock_result

        response = client.post("/api/v1/embeddings/embed-batch", json={
            "texts": ["Text 1", "Text 2"],
        })

        assert response.status_code == 200
        data = response.json()
        assert len(data["embeddings"]) == 2
        assert data["total_embedded"] == 2

    def test_embedding_statistics(self, client, mock_stack):
        """Test getting embedding statistics."""
        mock_stats = MagicMock()
        mock_stats.total_embeddings = 1000
        mock_stats.cache_hits = 500
        mock_stats.cache_misses = 500
        mock_stack.embedding_manager.get_statistics.return_value = mock_stats

        response = client.get("/api/v1/embeddings/statistics")

        assert response.status_code == 200
        data = response.json()
        assert data["total_embeddings"] == 1000
        assert data["cache_hits"] == 500


class TestVectorStoreEndpoints:
    """Test /vectorstores endpoints."""

    def test_upsert_vectors(self, client, mock_stack):
        """Test upserting vectors."""
        mock_stack.vectorstore_manager.upsert.return_value = 2

        response = client.post("/api/v1/vectorstores/upsert", json={
            "records": [
                {"id": "vec-1", "vector": [0.1, 0.2], "metadata": {}},
                {"id": "vec-2", "vector": [0.3, 0.4], "metadata": {}},
            ],
            "namespace": "test",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["upserted_count"] == 2
        assert data["namespace"] == "test"

    def test_search_vectors(self, client, mock_stack):
        """Test searching vectors."""
        mock_result = MagicMock()
        mock_result.record.id = "vec-1"
        mock_result.record.metadata = {}
        mock_result.score = 0.95
        mock_stack.vectorstore_manager.search.return_value = [mock_result]

        response = client.post("/api/v1/vectorstores/search", json={
            "query_vector": [0.1, 0.2],
            "top_k": 10,
            "namespace": "test",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["total_found"] == 1
        assert data["results"][0]["record_id"] == "vec-1"

    def test_delete_vector(self, client, mock_stack):
        """Test deleting a vector."""
        mock_stack.vectorstore_manager.delete.return_value = True

        response = client.delete("/api/v1/vectorstores/vec-1?namespace=test")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "deleted"

    def test_list_namespaces(self, client, mock_stack):
        """Test listing namespaces."""
        mock_stack.vectorstore_manager.list_namespaces.return_value = ["default", "test"]

        response = client.get("/api/v1/vectorstores/namespaces")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert "default" in data["namespaces"]

    def test_vectorstore_statistics(self, client, mock_stack):
        """Test getting vectorstore statistics."""
        mock_stats = MagicMock()
        mock_stats.total_vectors = 1000
        mock_stack.vectorstore_manager.get_statistics.return_value = mock_stats
        mock_stack.vectorstore_manager.list_namespaces.return_value = ["default"]
        mock_stack.vectorstore_manager.list_providers.return_value = ["inmemory"]

        response = client.get("/api/v1/vectorstores/statistics")

        assert response.status_code == 200
        data = response.json()
        assert data["total_vectors"] == 1000


class TestConfigEndpoints:
    """Test /config endpoints."""

    def test_get_config(self, client, mock_stack):
        """Test getting config value."""
        mock_stack.config_manager.get.return_value = "test-value"
        mock_stack.config_manager.exists.return_value = True

        response = client.get("/api/v1/config/test.key")

        assert response.status_code == 200
        data = response.json()
        assert data["key"] == "test.key"
        assert data["value"] == "test-value"
        assert data["exists"] is True

    def test_set_config(self, client, mock_stack):
        """Test setting config value."""
        response = client.post("/api/v1/config/set", json={
            "key": "test.key",
            "value": "new-value",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "set"
        mock_stack.config_manager.set.assert_called_once_with("test.key", "new-value")

    def test_delete_config(self, client, mock_stack):
        """Test deleting config value."""
        mock_stack.config_manager.delete.return_value = True

        response = client.post("/api/v1/config/delete", json={
            "key": "test.key",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "deleted"

    def test_validate_config(self, client, mock_stack):
        """Test validating config."""
        mock_result = MagicMock()
        mock_result.is_valid = True
        mock_result.warnings = []
        mock_result.errors = []
        mock_stack.config_manager.validate.return_value = mock_result

        response = client.post("/api/v1/config/validate")

        assert response.status_code == 200
        data = response.json()
        assert data["is_valid"] is True

    def test_reload_config(self, client, mock_stack):
        """Test reloading config."""
        response = client.post("/api/v1/config/reload")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "reloaded"

    def test_export_config_json(self, client, mock_stack):
        """Test exporting config as JSON."""
        mock_stack.config_manager.export_json.return_value = '{"key": "value"}'

        response = client.get("/api/v1/config/export/json")

        assert response.status_code == 200
        data = response.json()
        assert data["format"] == "json"
        assert data["content"] == '{"key": "value"}'

    def test_config_statistics(self, client, mock_stack):
        """Test getting config statistics."""
        mock_stats = MagicMock()
        mock_stats.total_keys = 50
        mock_stats.sources_loaded = 3
        mock_stats.validation_errors = 0
        mock_stack.config_manager.statistics.return_value = mock_stats

        response = client.get("/api/v1/config/statistics")

        assert response.status_code == 200
        data = response.json()
        assert data["total_keys"] == 50


class TestSecurityEndpoints:
    """Test /security endpoints."""

    def test_grant_permission(self, client, mock_stack):
        """Test granting permission."""
        mock_perm = MagicMock()
        mock_stack.security_manager.grant_permission.return_value = mock_perm

        response = client.post("/api/v1/security/permissions/grant", json={
            "principal": "user-123",
            "resource": "resource-456",
            "level": "read",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["granted"] is True

    def test_check_permission(self, client, mock_stack):
        """Test checking permission."""
        mock_stack.security_manager.check_permission.return_value = True

        response = client.post("/api/v1/security/permissions/check", json={
            "principal": "user-123",
            "resource": "resource-456",
            "level": "read",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["granted"] is True

    def test_store_secret(self, client, mock_stack):
        """Test storing secret."""
        response = client.post("/api/v1/security/secrets/store", json={
            "name": "api-key",
            "value": "secret-value",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["stored"] is True

    def test_retrieve_secret(self, client, mock_stack):
        """Test retrieving secret."""
        mock_stack.security_manager.retrieve_secret.return_value = "secret-value"

        response = client.get("/api/v1/security/secrets/api-key")

        assert response.status_code == 200
        data = response.json()
        assert data["retrieved_value"] == "secret-value"

    def test_create_token(self, client, mock_stack):
        """Test creating token."""
        mock_token = MagicMock()
        mock_token.value = "token-123"
        mock_token.expires_at = 1234567890.0
        mock_stack.security_manager.create_token.return_value = mock_token

        response = client.post("/api/v1/security/tokens/create", json={
            "principal": "user-123",
            "token_type": "access",
            "expires_in": 3600,
        })

        assert response.status_code == 200
        data = response.json()
        assert data["token"] == "token-123"
        assert data["principal"] == "user-123"

    def test_encrypt(self, client, mock_stack):
        """Test encrypting data."""
        mock_stack.security_manager.encrypt.return_value = "encrypted-data"

        response = client.post("/api/v1/security/encrypt", json={
            "data": "plaintext",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["result"] == "encrypted-data"
        assert data["operation"] == "encrypt"

    def test_decrypt(self, client, mock_stack):
        """Test decrypting data."""
        mock_stack.security_manager.decrypt.return_value = "plaintext"

        response = client.post("/api/v1/security/decrypt", json={
            "data": "encrypted-data",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["result"] == "plaintext"
        assert data["operation"] == "decrypt"

    def test_security_statistics(self, client, mock_stack):
        """Test getting security statistics."""
        mock_stats = MagicMock()
        mock_stats.total_permissions = 100
        mock_stats.total_secrets = 10
        mock_stats.total_credentials = 5
        mock_stats.total_tokens = 50
        mock_stack.security_manager.get_statistics.return_value = mock_stats

        response = client.get("/api/v1/security/statistics")

        assert response.status_code == 200
        data = response.json()
        assert data["total_permissions"] == 100
        assert data["total_secrets"] == 10


class TestWorkflowEndpoints:
    """Test /workflows endpoints."""

    def test_execute_workflow(self, client, mock_stack):
        """Test executing workflow."""
        mock_workflow = MagicMock()
        mock_workflow.workflow_id = "wf-123"
        mock_stack.workflow_engine.build.return_value = mock_workflow
        mock_stack.runtime_engine.execute.return_value = "exec-123"

        response = client.post("/api/v1/workflows/execute", json={
            "task_description": "Test task",
            "strategy": "sequential",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["execution_id"] == "exec-123"
        assert data["status"] == "queued"

    def test_workflow_status(self, client, mock_stack):
        """Test getting workflow status."""
        mock_state = MagicMock()
        mock_state.value = "running"
        mock_stack.runtime_engine.status.return_value = mock_state

        mock_snap = MagicMock()
        mock_snap.completed_count = 2
        mock_snap.step_count = 5
        mock_stack.runtime_engine.snapshot.return_value = mock_snap

        response = client.get("/api/v1/workflows/status/exec-123")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert data["completed_steps"] == 2
        assert data["total_steps"] == 5

    def test_cancel_workflow(self, client, mock_stack):
        """Test cancelling workflow."""
        response = client.post("/api/v1/workflows/cancel/exec-123")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "cancelled"

    def test_pause_workflow(self, client, mock_stack):
        """Test pausing workflow."""
        response = client.post("/api/v1/workflows/pause/exec-123")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "paused"

    def test_resume_workflow(self, client, mock_stack):
        """Test resuming workflow."""
        response = client.post("/api/v1/workflows/resume/exec-123")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "resumed"

    def test_workflow_statistics(self, client, mock_stack):
        """Test getting workflow statistics."""
        mock_stats = MagicMock()
        mock_stats.total_executions = 100
        mock_stats.successful_executions = 90
        mock_stats.failed_executions = 5
        mock_stats.cancelled_executions = 5
        mock_stats.average_duration = 10.5
        mock_stats.average_retries = 0.5
        mock_stack.runtime_engine.statistics.return_value = mock_stats

        response = client.get("/api/v1/workflows/statistics")

        assert response.status_code == 200
        data = response.json()
        assert data["total_executions"] == 100
        assert data["successful_executions"] == 90
