"""Tests for LLM providers, embedding providers, and remaining low-coverage modules."""

from __future__ import annotations

import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

from aios.core.exceptions import EmbeddingError, LLMProviderError
from aios.embedding.models import EmbeddingProviderConfig
from aios.embedding.providers.openai import OpenAIEmbeddingProvider
from aios.embedding.providers.sentence_transformers import SentenceTransformersProvider
from aios.llm.config import ProviderConfig
from aios.llm.models import (
    EmbeddingRequest,
    LLMMessage,
    LLMRequest,
    LLMResponse,
    MessageRole,
    ResponseFormat,
    TokenUsage,
)
from aios.llm.providers.anthropic import AnthropicProvider
from aios.llm.providers.google import GoogleProvider
from aios.llm.providers.lmstudio import LMStudioProvider
from aios.llm.providers.mistral import MistralProvider
from aios.llm.providers.ollama import OllamaProvider
from aios.llm.providers.vllm import VLLMProvider

# ══════════════════════════════════════════════════════════════════════════
# HELPER: Test a standard LLM provider lifecycle
# ══════════════════════════════════════════════════════════════════════════


def _test_llm_provider_lifecycle(provider_cls, expected_name: str):
    """Generic lifecycle tests for any LLM provider."""
    p = provider_cls()
    assert not p.is_initialized
    assert p.name == expected_name
    p.initialize()
    assert p.is_initialized
    assert isinstance(p.capabilities, object)
    assert p.statistics is not None
    assert p.statistics.requests == 0
    assert p.health() is not None  # health returns bool
    p.reload()
    assert p.is_initialized
    p.shutdown()
    assert not p.is_initialized


def _test_llm_provider_not_initialized(provider_cls):
    p = provider_cls()
    with pytest.raises(LLMProviderError, match="not been initialized"):
        p.generate(LLMRequest())
    with pytest.raises(LLMProviderError, match="not been initialized"):
        p.stream(LLMRequest())


def _test_llm_provider_count_tokens(provider_cls):
    p = provider_cls().initialize()
    assert p.count_tokens("") == 0
    assert p.count_tokens("hello") >= 1
    assert p.count_tokens("a" * 100) >= 1


def _test_llm_provider_validate_no_api_key(provider_cls, expected_name: str):
    p = provider_cls(ProviderConfig(name=expected_name, model="test-model"))
    p.initialize()
    result = p.validate()
    # Should warn about missing API key
    assert any("key" in w.lower() or "configured" in w.lower() for w in result.warnings)


def _test_llm_provider_validate_no_model(provider_cls, expected_name: str):
    p = provider_cls(ProviderConfig(name=expected_name, api_key="sk-test"))
    p.initialize()
    result = p.validate()
    # Should error about missing model
    assert not result.is_valid
    assert any("model" in e.lower() for e in result.errors)


# ══════════════════════════════════════════════════════════════════════════
# HELPER: Test a standard embedding provider lifecycle
# ══════════════════════════════════════════════════════════════════════════


def _test_embedding_provider_lifecycle(provider_cls, expected_name: str):
    p = provider_cls()
    assert not p.is_initialized
    assert p.name == expected_name
    p.initialize()
    assert p.is_initialized
    assert p.statistics is not None
    assert p.statistics.total_requests == 0
    assert p.get_dimensions() > 0
    p.reload()
    assert p.is_initialized
    p.shutdown()
    assert not p.is_initialized


def _test_embedding_provider_not_initialized(provider_cls):
    p = provider_cls()
    with pytest.raises(EmbeddingError, match="not been initialized"):
        p.embed("test")
    with pytest.raises(EmbeddingError, match="not been initialized"):
        p.embed_batch(["test"])


# ══════════════════════════════════════════════════════════════════════════
# LLM PROVIDERS
# ══════════════════════════════════════════════════════════════════════════


class TestMistralProvider:
    def test_lifecycle(self):
        _test_llm_provider_lifecycle(MistralProvider, "mistral")

    def test_not_initialized(self):
        _test_llm_provider_not_initialized(MistralProvider)

    def test_count_tokens(self):
        _test_llm_provider_count_tokens(MistralProvider)

    def test_validate_no_api_key(self):
        _test_llm_provider_validate_no_api_key(MistralProvider, "mistral")

    def test_validate_no_model(self):
        _test_llm_provider_validate_no_model(MistralProvider, "mistral")

    def test_capabilities(self):
        p = MistralProvider().initialize()
        caps = p.capabilities
        assert caps.streaming is True
        assert caps.embeddings is True
        assert caps.tool_calling is True
        assert caps.json_mode is True
        assert caps.vision is False

    def test_health_no_key(self):
        p = MistralProvider(ProviderConfig(name="mistral", model="test")).initialize()
        assert not p.health()

    def test_health_with_key(self):
        p = MistralProvider(ProviderConfig(name="mistral", model="test", api_key="sk-123")).initialize()
        assert p.health()

    def test_generate_not_implemented(self):
        p = MistralProvider(ProviderConfig(name="mistral", model="test", api_key="sk-123")).initialize()
        with pytest.raises(NotImplementedError, match="Mistral"):
            p.generate(LLMRequest())

    def test_stream_not_implemented(self):
        p = MistralProvider(ProviderConfig(name="mistral", model="test", api_key="sk-123")).initialize()
        with pytest.raises(NotImplementedError, match="Mistral"):
            p.stream(LLMRequest())

    def test_embed_not_implemented(self):
        p = MistralProvider(ProviderConfig(name="mistral", model="test", api_key="sk-123")).initialize()
        with pytest.raises(NotImplementedError, match="Mistral"):
            p.embed(EmbeddingRequest())


class TestGoogleProvider:
    def test_lifecycle(self):
        _test_llm_provider_lifecycle(GoogleProvider, "google")

    def test_not_initialized(self):
        _test_llm_provider_not_initialized(GoogleProvider)

    def test_count_tokens(self):
        _test_llm_provider_count_tokens(GoogleProvider)

    def test_validate_no_api_key(self):
        _test_llm_provider_validate_no_api_key(GoogleProvider, "google")

    def test_validate_no_model(self):
        _test_llm_provider_validate_no_model(GoogleProvider, "google")

    def test_capabilities(self):
        p = GoogleProvider().initialize()
        caps = p.capabilities
        assert caps.streaming is True
        assert caps.vision is True

    def test_health_no_key(self):
        p = GoogleProvider(ProviderConfig(name="google", model="test")).initialize()
        assert not p.health()

    def test_health_with_key(self):
        p = GoogleProvider(ProviderConfig(name="google", model="test", api_key="sk-123")).initialize()
        assert p.health()

    def test_generate_not_implemented(self):
        p = GoogleProvider(ProviderConfig(name="google", model="test", api_key="sk-123")).initialize()
        with pytest.raises(NotImplementedError, match="Google"):
            p.generate(LLMRequest())

    def test_stream_not_implemented(self):
        p = GoogleProvider(ProviderConfig(name="google", model="test", api_key="sk-123")).initialize()
        with pytest.raises(NotImplementedError, match="Google"):
            p.stream(LLMRequest())

    def test_embed_not_implemented(self):
        p = GoogleProvider(ProviderConfig(name="google", model="test", api_key="sk-123")).initialize()
        with pytest.raises(NotImplementedError, match="Google"):
            p.embed(EmbeddingRequest())


class TestVLLMProvider:
    def test_lifecycle(self):
        _test_llm_provider_lifecycle(VLLMProvider, "vllm")

    def test_not_initialized(self):
        _test_llm_provider_not_initialized(VLLMProvider)

    def test_count_tokens(self):
        _test_llm_provider_count_tokens(VLLMProvider)

    def test_validate(self):
        p = VLLMProvider().initialize()
        result = p.validate()
        assert result.is_valid  # vllm is local, no key needed

    def test_capabilities(self):
        p = VLLMProvider().initialize()
        caps = p.capabilities
        assert caps.streaming is True
        assert caps.embeddings is True

    def test_health(self):
        p = VLLMProvider().initialize()
        assert p.health()

    def test_generate_not_implemented(self):
        p = VLLMProvider().initialize()
        with pytest.raises(NotImplementedError, match="vLLM"):
            p.generate(LLMRequest())


class TestLMStudioProvider:
    def test_lifecycle(self):
        _test_llm_provider_lifecycle(LMStudioProvider, "lmstudio")

    def test_not_initialized(self):
        _test_llm_provider_not_initialized(LMStudioProvider)

    def test_count_tokens(self):
        _test_llm_provider_count_tokens(LMStudioProvider)

    def test_validate(self):
        p = LMStudioProvider().initialize()
        result = p.validate()
        assert result.is_valid  # lmstudio is local

    def test_capabilities(self):
        p = LMStudioProvider().initialize()
        caps = p.capabilities
        assert caps.streaming is True
        assert caps.embeddings is True

    def test_health(self):
        p = LMStudioProvider().initialize()
        assert p.health()

    def test_generate_not_implemented(self):
        p = LMStudioProvider().initialize()
        with pytest.raises(NotImplementedError, match="LM Studio"):
            p.generate(LLMRequest())


class TestAnthropicProvider:
    def test_lifecycle(self):
        _test_llm_provider_lifecycle(AnthropicProvider, "anthropic")

    def test_not_initialized(self):
        _test_llm_provider_not_initialized(AnthropicProvider)

    def test_count_tokens(self):
        _test_llm_provider_count_tokens(AnthropicProvider)

    def test_validate_no_api_key(self):
        _test_llm_provider_validate_no_api_key(AnthropicProvider, "anthropic")

    def test_validate_no_model(self):
        _test_llm_provider_validate_no_model(AnthropicProvider, "anthropic")

    def test_capabilities(self):
        p = AnthropicProvider().initialize()
        caps = p.capabilities
        assert caps.streaming is True
        assert caps.vision is True
        assert caps.embeddings is False

    def test_health_no_key(self):
        p = AnthropicProvider(ProviderConfig(name="anthropic", model="test")).initialize()
        assert not p.health()

    def test_health_with_key(self):
        p = AnthropicProvider(ProviderConfig(name="anthropic", model="test", api_key="sk-ant-123")).initialize()
        assert p.health()

    def test_generate_not_implemented(self):
        p = AnthropicProvider(ProviderConfig(name="anthropic", model="test", api_key="sk-ant-123")).initialize()
        with pytest.raises(NotImplementedError, match="Anthropic"):
            p.generate(LLMRequest())

    def test_stream_not_implemented(self):
        p = AnthropicProvider(ProviderConfig(name="anthropic", model="test", api_key="sk-ant-123")).initialize()
        with pytest.raises(NotImplementedError, match="Anthropic"):
            p.stream(LLMRequest())

    def test_embed_not_implemented(self):
        p = AnthropicProvider(ProviderConfig(name="anthropic", model="test", api_key="sk-ant-123")).initialize()
        with pytest.raises(NotImplementedError, match="does not support"):
            p.embed(EmbeddingRequest())


class TestOllamaProvider:
    def test_lifecycle(self):
        _test_llm_provider_lifecycle(OllamaProvider, "ollama")

    def test_not_initialized(self):
        _test_llm_provider_not_initialized(OllamaProvider)

    def test_count_tokens(self):
        _test_llm_provider_count_tokens(OllamaProvider)

    def test_validate(self):
        p = OllamaProvider().initialize()
        result = p.validate()
        assert result.is_valid  # ollama has default api_base

    def test_capabilities(self):
        p = OllamaProvider().initialize()
        caps = p.capabilities
        assert caps.streaming is True
        assert caps.embeddings is True
        assert caps.json_mode is True

    def test_health(self):
        p = OllamaProvider().initialize()
        assert p.health()

    def test_generate_not_implemented(self):
        p = OllamaProvider().initialize()
        with pytest.raises(NotImplementedError, match="Ollama"):
            p.generate(LLMRequest())


# ══════════════════════════════════════════════════════════════════════════
# EMBEDDING PROVIDERS
# ══════════════════════════════════════════════════════════════════════════


class TestOpenAIEmbeddingProvider:
    def test_lifecycle(self):
        _test_embedding_provider_lifecycle(OpenAIEmbeddingProvider, "openai")

    def test_not_initialized(self):
        _test_embedding_provider_not_initialized(OpenAIEmbeddingProvider)

    def test_custom_config(self):
        cfg = EmbeddingProviderConfig(name="my_openai", model="text-embedding-3-large", dimensions=3072)
        p = OpenAIEmbeddingProvider(cfg)
        assert p.name == "my_openai"
        assert p.model == "text-embedding-3-large"
        assert p.get_dimensions() == 3072

    def test_default_dimensions(self):
        p = OpenAIEmbeddingProvider().initialize()
        assert p.get_dimensions() == 1536

    def test_validate_no_api_key(self):
        p = OpenAIEmbeddingProvider().initialize()
        result = p.validate()
        assert any("key" in w.lower() for w in result.warnings)

    def test_validate_no_model(self):
        p = OpenAIEmbeddingProvider(EmbeddingProviderConfig(name="openai", api_key="sk-test"))
        p.initialize()
        result = p.validate()
        assert not result.is_valid
        assert any("model" in e.lower() for e in result.errors)

    def test_health_no_key(self):
        p = OpenAIEmbeddingProvider(EmbeddingProviderConfig(name="openai", model="test")).initialize()
        assert not p.health()

    def test_health_with_key(self):
        p = OpenAIEmbeddingProvider(EmbeddingProviderConfig(name="openai", model="test", api_key="sk-123")).initialize()
        assert p.health()

    def test_embed_not_implemented(self):
        p = OpenAIEmbeddingProvider(EmbeddingProviderConfig(name="openai", model="test", api_key="sk-123")).initialize()
        with pytest.raises(NotImplementedError, match="OpenAI"):
            p.embed("test text")

    def test_embed_batch_not_implemented(self):
        p = OpenAIEmbeddingProvider(EmbeddingProviderConfig(name="openai", model="test", api_key="sk-123")).initialize()
        with pytest.raises(NotImplementedError, match="OpenAI"):
            p.embed_batch(["text1", "text2"])


class TestSentenceTransformersProvider:
    def test_lifecycle(self):
        _test_embedding_provider_lifecycle(SentenceTransformersProvider, "sentence-transformers")

    def test_not_initialized(self):
        _test_embedding_provider_not_initialized(SentenceTransformersProvider)

    def test_custom_config(self):
        cfg = EmbeddingProviderConfig(name="my_st", model="all-mpnet-base-v2", dimensions=768)
        p = SentenceTransformersProvider(cfg)
        assert p.name == "my_st"
        assert p.model == "all-mpnet-base-v2"
        assert p.get_dimensions() == 768

    def test_default_dimensions(self):
        p = SentenceTransformersProvider().initialize()
        assert p.get_dimensions() == 384

    def test_validate(self):
        p = SentenceTransformersProvider().initialize()
        result = p.validate()
        assert len(result.warnings) >= 1  # requires library warning

    def test_validate_no_model(self):
        p = SentenceTransformersProvider(EmbeddingProviderConfig(name="st"))
        p.initialize()
        result = p.validate()
        assert not result.is_valid

    def test_health(self):
        p = SentenceTransformersProvider().initialize()
        assert p.health()

    def test_embed_not_implemented(self):
        p = SentenceTransformersProvider().initialize()
        with pytest.raises(NotImplementedError, match="SentenceTransformers"):
            p.embed("test")

    def test_embed_batch_not_implemented(self):
        p = SentenceTransformersProvider().initialize()
        with pytest.raises(NotImplementedError, match="SentenceTransformers"):
            p.embed_batch(["text1"])


# ══════════════════════════════════════════════════════════════════════════
# REMAINING EMBEDDING PROVIDERS (voyage, nomic, jina)
# ══════════════════════════════════════════════════════════════════════════


class TestVoyageEmbeddingProvider:
    def test_lifecycle(self):
        from aios.embedding.providers.voyage import VoyageEmbeddingProvider
        p = VoyageEmbeddingProvider()
        assert not p.is_initialized
        assert p.name == "voyage"
        p.initialize()
        assert p.is_initialized
        assert p.get_dimensions() > 0
        assert p.statistics is not None
        p.reload()
        assert p.is_initialized
        p.shutdown()
        assert not p.is_initialized

    def test_not_initialized(self):
        from aios.embedding.providers.voyage import VoyageEmbeddingProvider
        p = VoyageEmbeddingProvider()
        with pytest.raises(EmbeddingError, match="not been initialized"):
            p.embed("test")

    def test_validate(self):
        from aios.embedding.providers.voyage import VoyageEmbeddingProvider
        p = VoyageEmbeddingProvider().initialize()
        result = p.validate()
        assert isinstance(result.is_valid, bool)

    def test_health(self):
        from aios.embedding.providers.voyage import VoyageEmbeddingProvider
        p = VoyageEmbeddingProvider().initialize()
        assert isinstance(p.health(), bool)


class TestNomicEmbeddingProvider:
    def test_lifecycle(self):
        from aios.embedding.providers.nomic import NomicEmbeddingProvider
        p = NomicEmbeddingProvider()
        assert not p.is_initialized
        assert p.name == "nomic"
        p.initialize()
        assert p.is_initialized
        assert p.get_dimensions() > 0
        p.reload()
        assert p.is_initialized
        p.shutdown()
        assert not p.is_initialized

    def test_not_initialized(self):
        from aios.embedding.providers.nomic import NomicEmbeddingProvider
        p = NomicEmbeddingProvider()
        with pytest.raises(EmbeddingError, match="not been initialized"):
            p.embed("test")

    def test_validate(self):
        from aios.embedding.providers.nomic import NomicEmbeddingProvider
        p = NomicEmbeddingProvider().initialize()
        result = p.validate()
        assert isinstance(result.is_valid, bool)


class TestJinaEmbeddingProvider:
    def test_lifecycle(self):
        from aios.embedding.providers.jina import JinaEmbeddingProvider
        p = JinaEmbeddingProvider()
        assert not p.is_initialized
        assert p.name == "jina"
        p.initialize()
        assert p.is_initialized
        assert p.get_dimensions() > 0
        p.reload()
        assert p.is_initialized
        p.shutdown()
        assert not p.is_initialized

    def test_not_initialized(self):
        from aios.embedding.providers.jina import JinaEmbeddingProvider
        p = JinaEmbeddingProvider()
        with pytest.raises(EmbeddingError, match="not been initialized"):
            p.embed("test")

    def test_validate(self):
        from aios.embedding.providers.jina import JinaEmbeddingProvider
        p = JinaEmbeddingProvider().initialize()
        result = p.validate()
        assert isinstance(result.is_valid, bool)


# ══════════════════════════════════════════════════════════════════════════
# WEBSOCKET MANAGER
# ══════════════════════════════════════════════════════════════════════════


class TestWebSocketManager:
    @pytest.fixture
    def manager(self):
        from aios.api.websocket_manager import ConnectionManager
        return ConnectionManager()

    @pytest.fixture
    def event_loop(self):
        loop = asyncio.new_event_loop()
        yield loop
        loop.close()

    def test_get_active_connections_empty(self, manager):
        assert manager.get_active_connections() == []

    def test_get_subscriptions_empty(self, manager):
        assert manager.get_subscriptions("nonexistent") == []

    @pytest.mark.asyncio
    async def test_connect_and_disconnect(self, manager):
        ws = AsyncMock()
        ws.accept = AsyncMock()
        await manager.connect("client1", ws)
        assert "client1" in manager.get_active_connections()
        await manager.disconnect("client1")
        assert "client1" not in manager.get_active_connections()

    @pytest.mark.asyncio
    async def test_subscribe(self, manager):
        ws = AsyncMock()
        ws.accept = AsyncMock()
        await manager.connect("client1", ws)
        await manager.subscribe("client1", ["events", "logs"])
        subs = manager.get_subscriptions("client1")
        assert "events" in subs
        assert "logs" in subs

    @pytest.mark.asyncio
    async def test_unsubscribe(self, manager):
        ws = AsyncMock()
        ws.accept = AsyncMock()
        await manager.connect("client1", ws)
        await manager.subscribe("client1", ["events", "logs"])
        await manager.unsubscribe("client1", ["events"])
        subs = manager.get_subscriptions("client1")
        assert "events" not in subs
        assert "logs" in subs

    @pytest.mark.asyncio
    async def test_send_personal(self, manager):
        ws = AsyncMock()
        ws.accept = AsyncMock()
        ws.client_state = MagicMock()
        ws.client_state.CONNECTED = True
        ws.client_state.value = 1
        # Simulate connected state
        from starlette.websockets import WebSocketState
        ws.client_state = WebSocketState.CONNECTED
        ws.send_json = AsyncMock()
        await manager.connect("client1", ws)
        result = await manager.send_personal("client1", {"msg": "hello"})
        assert result is True

    @pytest.mark.asyncio
    async def test_send_personal_not_connected(self, manager):
        result = await manager.send_personal("nonexistent", {"msg": "hello"})
        assert result is False

    @pytest.mark.asyncio
    async def test_broadcast(self, manager):
        from starlette.websockets import WebSocketState
        ws = AsyncMock()
        ws.accept = AsyncMock()
        ws.client_state = WebSocketState.CONNECTED
        ws.send_json = AsyncMock()
        await manager.connect("client1", ws)
        await manager.subscribe("client1", ["events"])
        count = await manager.broadcast("events", {"data": "test"})
        assert count == 1

    @pytest.mark.asyncio
    async def test_broadcast_no_subscribers(self, manager):
        count = await manager.broadcast("events", {"data": "test"})
        assert count == 0

    @pytest.mark.asyncio
    async def test_broadcast_all(self, manager):
        from starlette.websockets import WebSocketState
        ws = AsyncMock()
        ws.accept = AsyncMock()
        ws.client_state = WebSocketState.CONNECTED
        ws.send_json = AsyncMock()
        await manager.connect("client1", ws)
        count = await manager.broadcast_all({"data": "test"})
        assert count == 1

    @pytest.mark.asyncio
    async def test_start_stop(self, manager):
        await manager.start()
        assert manager._running is True
        await manager.stop()
        assert manager._running is False

    @pytest.mark.asyncio
    async def test_queue_broadcast(self, manager):
        await manager.queue_broadcast("events", {"data": "test"})
        assert not manager._message_queue.empty()


# ══════════════════════════════════════════════════════════════════════════
# API ROUTES (routes.py)
# ══════════════════════════════════════════════════════════════════════════


class TestAPIRoutes:
    @pytest.fixture
    def mock_stack(self):
        from aios.api.stack import EOSStack
        stack = EOSStack()
        # EOS core managers
        stack.loader = MagicMock()
        stack.loader.is_initialized = True
        stack.registry = MagicMock()
        stack.registry.is_initialized = True
        stack.capability_discovery = MagicMock()
        stack.capability_discovery.is_initialized = True
        stack.knowledge_service = MagicMock()
        stack.knowledge_service.is_initialized = True
        stack.context_builder = MagicMock()
        stack.context_builder.is_initialized = True
        stack.decision_engine = MagicMock()
        stack.decision_engine.is_initialized = True
        stack.workflow_engine = MagicMock()
        stack.workflow_engine.is_initialized = True
        stack.runtime_engine = MagicMock()
        stack.runtime_engine.is_initialized = True
        stack.event_bus = MagicMock()
        stack.event_bus.is_initialized = True
        stack.observability = MagicMock()
        stack.observability.is_initialized = True
        stack.persistence = MagicMock()
        stack.persistence.is_initialized = True
        stack.tool_registry = MagicMock()
        stack.agent_executor = MagicMock()
        stack.agent_executor.is_initialized = True
        # Optional managers
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
        stack.scheduler = MagicMock()
        stack.scheduler.is_initialized = True
        from aios.api.dependencies import set_stack
        set_stack(stack)
        yield stack
        from aios.api.dependencies import reset_stack
        reset_stack()

    @pytest.fixture
    def client(self, mock_stack):
        from fastapi.testclient import TestClient

        from aios.api.app import create_app
        return TestClient(create_app())

    def test_health_check(self, client):
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert "healthy" in data
        assert "layers" in data

    def test_loader_load_not_found(self, client, mock_stack):
        response = client.post("/api/v1/loader/load", json={"eos_path": "/nonexistent/path"})
        assert response.status_code in (404, 500)

    def test_loader_load_success(self, client, mock_stack):
        mock_stack.loader.load.return_value = MagicMock(
            success=True, kernel_files=[], registry_files=[], index_files=[], errors=[]
        )
        response = client.post("/api/v1/loader/load", json={"eos_path": str(Path.cwd())})
        assert response.status_code == 200

    def test_runtime_status(self, client, mock_stack):
        from aios.eos.runtime_engine import RuntimeState
        mock_stack.runtime_engine.status.return_value = RuntimeState.RUNNING
        response = client.get("/api/v1/runtime/status/test-exec-id")
        assert response.status_code == 200
        assert "status" in response.json()

    def test_runtime_statistics(self, client, mock_stack):
        mock_stats = MagicMock()
        mock_stats.total_executions = 5
        mock_stats.successful_executions = 3
        mock_stats.failed_executions = 2
        mock_stats.cancelled_executions = 0
        mock_stats.average_duration = 10.0
        mock_stats.average_retries = 1.0
        mock_stack.runtime_engine.statistics.return_value = mock_stats
        response = client.get("/api/v1/runtime/statistics")
        assert response.status_code == 200

    def test_event_statistics(self, client, mock_stack):
        mock_stats = MagicMock()
        mock_stats.total_events = 10
        mock_stats.sync_events = 5
        mock_stats.async_events = 5
        mock_stats.subscriber_count = 2
        mock_stats.history_size = 10
        mock_stats.average_dispatch_time = 0.1
        mock_stats.failed_dispatches = 0
        mock_stack.event_bus.statistics.return_value = mock_stats
        response = client.get("/api/v1/events/statistics")
        assert response.status_code == 200

    def test_observability_metrics(self, client, mock_stack):
        mock_metrics = MagicMock()
        mock_metrics.uptime_seconds = 100
        mock_metrics.total_events_seen = 50
        mock_metrics.total_executions_started = 10
        mock_metrics.total_executions_completed = 8
        mock_metrics.total_executions_failed = 2
        mock_metrics.total_steps_executed = 20
        mock_metrics.total_steps_failed = 1
        mock_metrics.total_retries = 3
        mock_metrics.error_rate = 0.1
        mock_metrics.active_executions = 2
        mock_metrics.event_rate_per_second = 1.0
        mock_metrics.events_by_type = {}
        mock_stack.observability.metrics.return_value = mock_metrics
        response = client.get("/api/v1/observability/metrics")
        assert response.status_code == 200

    def test_observability_health(self, client, mock_stack):
        mock_health = MagicMock()
        mock_health.healthy = True
        mock_health.status = "ok"
        mock_health.events_processed = 100
        mock_health.errors_recent = 0
        mock_health.message = "All good"
        mock_stack.observability.health.return_value = mock_health
        response = client.get("/api/v1/observability/health")
        assert response.status_code == 200

    def test_observability_events(self, client, mock_stack):
        mock_stack.observability.query_events.return_value = []
        response = client.get("/api/v1/observability/events")
        assert response.status_code == 200

    def test_persistence_statistics(self, client, mock_stack):
        mock_stats = MagicMock()
        mock_stats.total_workflows = 5
        mock_stats.total_executions = 10
        mock_stats.total_events = 50
        mock_stats.total_reports = 3
        mock_stats.database_size_bytes = 1024
        mock_stack.persistence.statistics.return_value = mock_stats
        response = client.get("/api/v1/persistence/statistics")
        assert response.status_code == 200

    def test_persistence_clear(self, client, mock_stack):
        response = client.post("/api/v1/persistence/clear")
        assert response.status_code == 200
        assert response.json()["status"] == "cleared"

    def test_tools_list(self, client, mock_stack):
        response = client.get("/api/v1/tools")
        assert response.status_code == 200

    def test_event_history(self, client, mock_stack):
        mock_hist = MagicMock()
        mock_hist.events = []
        mock_stack.event_bus.history.return_value = mock_hist
        response = client.get("/api/v1/events/history")
        assert response.status_code == 200

    def test_knowledge_search(self, client, mock_stack):
        mock_stack.knowledge_service.search.return_value = []
        response = client.post("/api/v1/knowledge/search", json={"query": "test", "top_k": 5})
        assert response.status_code == 200

    def test_capabilities_discover(self, client, mock_stack):
        mock_stack.capability_discovery.discover.return_value = []
        response = client.post("/api/v1/capabilities/discover", json={"task_description": "test", "top_k": 5})
        assert response.status_code == 200

    def test_context_build(self, client, mock_stack):
        mock_ctx = MagicMock()
        mock_ctx.task_description = "test"
        mock_ctx.items = []
        mock_ctx.total_tokens = 0
        mock_ctx.item_count = 0
        mock_stack.context_builder.build.return_value = mock_ctx
        response = client.post("/api/v1/context/build", json={"task_description": "test"})
        assert response.status_code == 200


# ══════════════════════════════════════════════════════════════════════════
# EOS STACK
# ══════════════════════════════════════════════════════════════════════════


class TestEOSStack:
    def test_stack_is_initialized_false(self):
        from aios.api.stack import EOSStack
        stack = EOSStack()
        assert not stack.is_initialized

    def test_stack_is_initialized_true(self):
        from aios.api.stack import EOSStack
        stack = EOSStack()
        stack.event_bus = MagicMock()
        stack.event_bus.is_initialized = True
        assert stack.is_initialized

    def test_stack_optional_managers_none(self):
        from aios.api.stack import EOSStack
        stack = EOSStack()
        assert stack.memory_manager is None
        assert stack.llm_manager is None
        assert stack.embedding_manager is None
        assert stack.vectorstore_manager is None
        assert stack.rag_manager is None
        assert stack.tool_manager is None
        assert stack.agent_manager is None
        assert stack.plugin_manager is None
        assert stack.config_manager is None
        assert stack.security_manager is None
        assert stack.scheduler is None


# ══════════════════════════════════════════════════════════════════════════
# LLM MODELS
# ══════════════════════════════════════════════════════════════════════════


class TestLLMModels:
    def test_llm_message_defaults(self):
        msg = LLMMessage()
        assert msg.role == MessageRole.USER
        assert msg.content == ""

    def test_llm_request_defaults(self):
        req = LLMRequest()
        assert req.temperature == 0.7
        assert req.max_tokens == 1024
        assert req.stream is False

    def test_llm_response_defaults(self):
        resp = LLMResponse()
        assert resp.content == ""
        assert resp.model == ""

    def test_token_usage(self):
        usage = TokenUsage(prompt_tokens=10, completion_tokens=20, total_tokens=30)
        assert usage.total_tokens == 30

    def test_response_format(self):
        assert ResponseFormat.TEXT.value == "text"
        assert ResponseFormat.JSON.value == "json"
