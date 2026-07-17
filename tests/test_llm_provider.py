"""Tests for AIOS LLM Provider Layer."""

from __future__ import annotations

import threading
import time

import pytest

from aios.core.exceptions import LLMProviderError
from aios.llm.cache import LLMCache
from aios.llm.config import CacheConfig, LLMConfig, ProviderConfig
from aios.llm.manager import LLMManager
from aios.llm.metrics import LLMMetrics
from aios.llm.models import (
    EmbeddingRequest,
    EmbeddingResponse,
    FinishReason,
    LLMMessage,
    LLMRequest,
    LLMResponse,
    LLMStatistics,
    MessageRole,
    ProviderCapabilities,
    ResponseFormat,
    TokenUsage,
    ToolCall,
    ValidationResult,
)
from aios.llm.providers.anthropic import AnthropicProvider
from aios.llm.providers.google import GoogleProvider
from aios.llm.providers.lmstudio import LMStudioProvider
from aios.llm.providers.mistral import MistralProvider
from aios.llm.providers.mock import MockProvider
from aios.llm.providers.ollama import OllamaProvider
from aios.llm.providers.openai import OpenAIProvider
from aios.llm.providers.vllm import VLLMProvider
from aios.llm.registry import ProviderRegistry
from aios.llm.streaming import LLMStream
from aios.llm.tokenizer import MockTokenizer, ProviderTokenizer

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_request(content: str = "hello", **kwargs) -> LLMRequest:
    return LLMRequest(
        messages=(LLMMessage(role=MessageRole.USER, content=content),),
        **kwargs,
    )


def _make_mock_provider() -> MockProvider:
    return MockProvider().initialize()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class TestModels:
    def test_llm_message_defaults(self):
        m = LLMMessage()
        assert m.role == MessageRole.USER
        assert m.content == ""
        assert m.metadata == {}

    def test_llm_message_frozen(self):
        m = LLMMessage(content="x")
        with pytest.raises(AttributeError):
            m.content = "y"  # type: ignore[misc]

    def test_llm_request_defaults(self):
        r = LLMRequest()
        assert r.temperature == 0.7
        assert r.max_tokens == 1024
        assert r.stream is False

    def test_llm_response_defaults(self):
        r = LLMResponse()
        assert r.content == ""
        assert r.finish_reason == FinishReason.STOP
        assert r.usage == TokenUsage()

    def test_token_usage(self):
        u = TokenUsage(prompt_tokens=10, completion_tokens=5)
        assert u.total_tokens == 0

    def test_tool_call(self):
        tc = ToolCall(id="1", name="search", arguments={"q": "test"})
        assert tc.name == "search"

    def test_embedding_request(self):
        r = EmbeddingRequest(texts=("a", "b"), model="m")
        assert len(r.texts) == 2

    def test_embedding_response(self):
        r = EmbeddingResponse(vectors=((0.1, 0.2),), dimensions=2, provider="mock")
        assert r.dimensions == 2

    def test_provider_capabilities(self):
        c = ProviderCapabilities(streaming=True, embeddings=True)
        assert c.streaming is True
        assert c.tool_calling is False

    def test_llm_statistics_defaults(self):
        s = LLMStatistics()
        assert s.requests == 0
        assert s.average_latency == 0.0

    def test_validation_result_defaults(self):
        v = ValidationResult()
        assert v.is_valid is True
        assert v.errors == []

    def test_message_roles(self):
        assert MessageRole.SYSTEM.value == "system"
        assert MessageRole.USER.value == "user"
        assert MessageRole.ASSISTANT.value == "assistant"
        assert MessageRole.TOOL.value == "tool"

    def test_finish_reasons(self):
        assert FinishReason.STOP.value == "stop"
        assert FinishReason.LENGTH.value == "length"
        assert FinishReason.TOOL_CALLS.value == "tool_calls"

    def test_response_formats(self):
        assert ResponseFormat.TEXT.value == "text"
        assert ResponseFormat.JSON.value == "json"


# ---------------------------------------------------------------------------
# MockProvider
# ---------------------------------------------------------------------------

class TestMockProvider:
    def test_initialize(self):
        p = MockProvider()
        assert p.is_initialized is False
        p.initialize()
        assert p.is_initialized is True

    def test_name(self):
        p = MockProvider()
        assert p.name == "mock"

    def test_capabilities(self):
        p = MockProvider()
        c = p.capabilities
        assert c.streaming is True
        assert c.embeddings is True
        assert c.tool_calling is True
        assert c.json_mode is True

    def test_generate(self):
        p = _make_mock_provider()
        req = _make_request("hello world")
        resp = p.generate(req)
        assert resp.content == "mock response for: hello world"
        assert resp.provider == "mock"
        assert resp.model == "mock-model"
        assert resp.finish_reason == FinishReason.STOP

    def test_generate_deterministic(self):
        p = _make_mock_provider()
        req = _make_request("same input")
        r1 = p.generate(req)
        r2 = p.generate(req)
        assert r1.content == r2.content

    def test_generate_json_mode(self):
        p = _make_mock_provider()
        req = _make_request("data", response_format=ResponseFormat.JSON)
        resp = p.generate(req)
        assert resp.content.startswith('{"response":')

    def test_generate_tool_calls(self):
        p = _make_mock_provider()
        req = _make_request("search something", tools=("search",))
        resp = p.generate(req)
        assert len(resp.tool_calls) == 1
        assert resp.tool_calls[0].name == "search"
        assert resp.finish_reason == FinishReason.TOOL_CALLS

    def test_generate_empty_messages(self):
        p = _make_mock_provider()
        req = LLMRequest(messages=())
        resp = p.generate(req)
        assert resp.content == "mock response"

    def test_stream(self):
        p = _make_mock_provider()
        req = _make_request("hello")
        chunks = list(p.stream(req))
        assert isinstance(chunks, list)
        assert len(chunks) > 0

    def test_embed(self):
        p = _make_mock_provider()
        req = EmbeddingRequest(texts=("hello", "world"))
        resp = p.embed(req)
        assert len(resp.vectors) == 2
        assert resp.dimensions == 16
        assert resp.provider == "mock"

    def test_embed_deterministic(self):
        p = _make_mock_provider()
        req = EmbeddingRequest(texts=("hello",))
        r1 = p.embed(req)
        r2 = p.embed(req)
        assert r1.vectors == r2.vectors

    def test_count_tokens(self):
        p = MockProvider()
        assert p.count_tokens("hello world") == 2
        assert p.count_tokens("") == 0

    def test_health(self):
        p = MockProvider()
        assert p.health() is False
        p.initialize()
        assert p.health() is True

    def test_validate(self):
        p = MockProvider()
        result = p.validate()
        assert len(result.warnings) > 0
        p.initialize()
        result = p.validate()
        assert result.is_valid is True

    def test_reload(self):
        p = _make_mock_provider()
        p.generate(_make_request("x"))
        assert p.statistics.requests > 0
        p.reload()
        assert p.statistics.requests == 0

    def test_shutdown(self):
        p = _make_mock_provider()
        p.shutdown()
        assert p.is_initialized is False

    def test_statistics(self):
        p = _make_mock_provider()
        p.generate(_make_request("x"))
        stats = p.statistics
        assert stats.requests == 1
        assert stats.successes == 1
        assert stats.tokens_generated > 0

    def test_uninitialized_raises(self):
        p = MockProvider()
        with pytest.raises(LLMProviderError):
            p.generate(_make_request())

    def test_usage_tracking(self):
        p = _make_mock_provider()
        req = _make_request("hello world test")
        resp = p.generate(req)
        assert resp.usage.prompt_tokens > 0
        assert resp.usage.completion_tokens > 0
        assert resp.usage.total_tokens == resp.usage.prompt_tokens + resp.usage.completion_tokens


# ---------------------------------------------------------------------------
# Cloud Provider Adapters
# ---------------------------------------------------------------------------

class TestCloudProviders:
    def test_openai_initialize(self):
        p = OpenAIProvider(ProviderConfig(name="openai", api_key="key", model="gpt-4"))
        p.initialize()
        assert p.is_initialized is True
        assert p.name == "openai"

    def test_openai_capabilities(self):
        p = OpenAIProvider()
        assert p.capabilities.streaming is True
        assert p.capabilities.vision is True
        assert p.capabilities.audio is True

    def test_openai_generate_raises(self):
        p = OpenAIProvider(ProviderConfig(api_key="key", model="gpt-4")).initialize()
        with pytest.raises(NotImplementedError):
            p.generate(_make_request())

    def test_openai_validate_no_key(self):
        p = OpenAIProvider()
        result = p.validate()
        assert len(result.warnings) > 0

    def test_openai_validate_no_model(self):
        p = OpenAIProvider(ProviderConfig(api_key="key"))
        result = p.validate()
        assert result.is_valid is False

    def test_openai_generate_no_key_raises(self):
        p = OpenAIProvider(ProviderConfig(model="gpt-4")).initialize()
        with pytest.raises(LLMProviderError):
            p.generate(_make_request())

    def test_anthropic_initialize(self):
        p = AnthropicProvider(ProviderConfig(api_key="key", model="claude")).initialize()
        assert p.is_initialized is True
        assert p.name == "anthropic"

    def test_anthropic_embed_raises(self):
        p = AnthropicProvider(ProviderConfig(api_key="key", model="claude")).initialize()
        with pytest.raises(NotImplementedError):
            p.embed(EmbeddingRequest(texts=("x",)))

    def test_google_initialize(self):
        p = GoogleProvider(ProviderConfig(api_key="key", model="gemini")).initialize()
        assert p.is_initialized is True
        assert p.name == "google"

    def test_mistral_initialize(self):
        p = MistralProvider(ProviderConfig(api_key="key", model="mistral")).initialize()
        assert p.is_initialized is True
        assert p.name == "mistral"

    def test_ollama_initialize(self):
        p = OllamaProvider().initialize()
        assert p.is_initialized is True
        assert p.name == "ollama"
        assert p.capabilities.tool_calling is False

    def test_ollama_validate_no_base(self):
        p = OllamaProvider(ProviderConfig(model="llama"))
        result = p.validate()
        assert result.is_valid is False

    def test_lmstudio_initialize(self):
        p = LMStudioProvider().initialize()
        assert p.is_initialized is True
        assert p.name == "lmstudio"

    def test_vllm_initialize(self):
        p = VLLMProvider().initialize()
        assert p.is_initialized is True
        assert p.name == "vllm"

    def test_provider_count_tokens(self):
        for cls in [OpenAIProvider, AnthropicProvider, GoogleProvider, MistralProvider, OllamaProvider, LMStudioProvider, VLLMProvider]:
            p = cls()
            assert p.count_tokens("hello world") > 0
            assert p.count_tokens("") == 0

    def test_provider_shutdown(self):
        for cls in [OpenAIProvider, AnthropicProvider, GoogleProvider]:
            p = cls(ProviderConfig(api_key="key", model="m")).initialize()
            p.shutdown()
            assert p.is_initialized is False

    def test_provider_reload(self):
        p = OpenAIProvider(ProviderConfig(api_key="key", model="m")).initialize()
        p.reload()
        assert p.is_initialized is True


# ---------------------------------------------------------------------------
# LLMCache
# ---------------------------------------------------------------------------

class TestLLMCache:
    def test_initialize(self):
        c = LLMCache().initialize()
        assert c.is_initialized is True

    def test_put_and_get(self):
        c = LLMCache().initialize()
        req = _make_request("test")
        resp = LLMResponse(content="cached")
        c.put(req, resp)
        result = c.get(req)
        assert result is not None
        assert result.content == "cached"

    def test_get_miss(self):
        c = LLMCache().initialize()
        assert c.get(_make_request("missing")) is None

    def test_ttl_expiry(self):
        c = LLMCache(CacheConfig(ttl=0.01)).initialize()
        req = _make_request("test")
        c.put(req, LLMResponse(content="x"))
        time.sleep(0.02)
        assert c.get(req) is None

    def test_lru_eviction(self):
        c = LLMCache(CacheConfig(max_size=2)).initialize()
        r1 = _make_request("a")
        r2 = _make_request("b")
        r3 = _make_request("c")
        c.put(r1, LLMResponse(content="1"))
        c.put(r2, LLMResponse(content="2"))
        c.put(r3, LLMResponse(content="3"))
        assert c.get(r1) is None
        assert c.get(r2) is not None
        assert c.get(r3) is not None

    def test_cache_disabled(self):
        c = LLMCache(CacheConfig(enabled=False)).initialize()
        req = _make_request("test")
        c.put(req, LLMResponse(content="x"))
        assert c.get(req) is None

    def test_clear(self):
        c = LLMCache().initialize()
        c.put(_make_request("x"), LLMResponse(content="y"))
        c.clear()
        assert c.size == 0

    def test_statistics(self):
        c = LLMCache().initialize()
        req = _make_request("test")
        c.put(req, LLMResponse(content="x"))
        c.get(req)
        c.get(_make_request("miss"))
        stats = c.statistics()
        assert stats["hits"] == 1
        assert stats["misses"] == 1
        assert stats["size"] == 1

    def test_validate(self):
        c = LLMCache(CacheConfig(ttl=-1))
        result = c.validate()
        assert result.is_valid is False

    def test_reload(self):
        c = LLMCache().initialize()
        c.put(_make_request("x"), LLMResponse(content="y"))
        c.reload()
        assert c.size == 0

    def test_uninitialized_raises(self):
        c = LLMCache()
        with pytest.raises(LLMProviderError):
            c.get(_make_request())


# ---------------------------------------------------------------------------
# LLMStream
# ---------------------------------------------------------------------------

class TestLLMStream:
    def test_iterate(self):
        source = iter(["hello", " ", "world"])
        stream = LLMStream(source)
        chunks = list(stream)
        assert chunks == ["hello", " ", "world"]

    def test_collect(self):
        source = iter(["hello", " ", "world"])
        stream = LLMStream(source)
        assert stream.collect() == "hello world"

    def test_cancel(self):
        source = iter(["a", "b", "c"])
        stream = LLMStream(source)
        next(stream)
        stream.cancel()
        assert stream.is_cancelled is True

    def test_on_chunk_callback(self):
        received: list[str] = []
        source = iter(["a", "b"])
        stream = LLMStream(source)
        stream.on_chunk(lambda c: received.append(c))
        stream.collect()
        assert received == ["a", "b"]

    def test_chunks_property(self):
        source = iter(["x", "y"])
        stream = LLMStream(source)
        stream.collect()
        assert stream.chunks == ["x", "y"]

    def test_is_done(self):
        source = iter(["a"])
        stream = LLMStream(source)
        assert stream.is_done is False
        stream.collect()
        assert stream.is_done is True


# ---------------------------------------------------------------------------
# Tokenizer
# ---------------------------------------------------------------------------

class TestTokenizer:
    def test_mock_tokenizer(self):
        t = MockTokenizer()
        assert t.count_tokens("hello world") == 2
        assert t.count_tokens("") == 0
        assert t.name == "mock"

    def test_provider_tokenizer(self):
        t = ProviderTokenizer("openai", tokens_per_char=0.25)
        assert t.count_tokens("hello") >= 1
        assert t.count_tokens("") == 0
        assert t.name == "provider:openai"


# ---------------------------------------------------------------------------
# LLMMetrics
# ---------------------------------------------------------------------------

class TestLLMMetrics:
    def test_record_request(self):
        m = LLMMetrics()
        m.record_request("mock", True, 0.1, 10)
        stats = m.statistics()
        assert stats["requests"] == 1
        assert stats["successes"] == 1
        assert stats["tokens_generated"] == 10

    def test_record_failure(self):
        m = LLMMetrics()
        m.record_request("mock", False, 0.1)
        stats = m.statistics()
        assert stats["failures"] == 1

    def test_cache_hit_miss(self):
        m = LLMMetrics()
        m.record_cache_hit()
        m.record_cache_miss()
        stats = m.statistics()
        assert stats["cache_hits"] == 1
        assert stats["cache_misses"] == 1

    def test_stream_and_embedding(self):
        m = LLMMetrics()
        m.record_stream()
        m.record_embedding()
        stats = m.statistics()
        assert stats["stream_count"] == 1
        assert stats["embedding_count"] == 1

    def test_retry(self):
        m = LLMMetrics()
        m.record_retry()
        m.record_retry()
        stats = m.statistics()
        assert stats["retry_count"] == 2

    def test_provider_stats(self):
        m = LLMMetrics()
        m.record_request("mock", True, 0.1)
        m.record_request("openai", False, 0.2)
        stats = m.statistics()
        assert "mock" in stats["providers"]
        assert "openai" in stats["providers"]

    def test_reset(self):
        m = LLMMetrics()
        m.record_request("mock", True, 0.1)
        m.reset()
        assert m.statistics()["requests"] == 0


# ---------------------------------------------------------------------------
# ProviderRegistry
# ---------------------------------------------------------------------------

class TestProviderRegistry:
    def test_initialize(self):
        r = ProviderRegistry().initialize()
        assert r.is_initialized is True

    def test_register(self):
        r = ProviderRegistry().initialize()
        p = _make_mock_provider()
        r.register(p)
        assert "mock" in r.list()

    def test_register_with_aliases(self):
        r = ProviderRegistry().initialize()
        p = _make_mock_provider()
        r.register(p, aliases=("m", "mock-alias"))
        assert r.get("m") is p
        assert r.get("mock-alias") is p

    def test_register_duplicate_raises(self):
        r = ProviderRegistry().initialize()
        p1 = _make_mock_provider()
        p2 = MockProvider().initialize()
        r.register(p1)
        with pytest.raises(LLMProviderError):
            r.register(p2)

    def test_register_alias_conflict_raises(self):
        r = ProviderRegistry().initialize()
        p1 = _make_mock_provider()
        p2 = MockProvider().initialize()
        r.register(p1, aliases=("x",))
        with pytest.raises(LLMProviderError):
            r.register(p2, aliases=("x",))

    def test_unregister(self):
        r = ProviderRegistry().initialize()
        r.register(_make_mock_provider())
        assert r.unregister("mock") is True
        assert "mock" not in r.list()

    def test_unregister_missing(self):
        r = ProviderRegistry().initialize()
        assert r.unregister("missing") is False

    def test_get(self):
        r = ProviderRegistry().initialize()
        p = _make_mock_provider()
        r.register(p)
        assert r.get("mock") is p

    def test_get_missing(self):
        r = ProviderRegistry().initialize()
        assert r.get("missing") is None

    def test_default_provider(self):
        r = ProviderRegistry().initialize()
        p = _make_mock_provider()
        r.register(p)
        assert r.default_provider() is p

    def test_set_default(self):
        r = ProviderRegistry().initialize()
        p1 = MockProvider().initialize()
        p2 = OllamaProvider().initialize()
        r.register(p1)
        r.register(p2)
        r.set_default(p2.name)
        assert r.default_provider() is p2

    def test_set_default_missing_raises(self):
        r = ProviderRegistry().initialize()
        with pytest.raises(LLMProviderError):
            r.set_default("missing")

    def test_validate_empty(self):
        r = ProviderRegistry().initialize()
        result = r.validate()
        assert len(result.warnings) > 0

    def test_validate_valid(self):
        r = ProviderRegistry().initialize()
        r.register(_make_mock_provider())
        result = r.validate()
        assert result.is_valid is True

    def test_reload(self):
        r = ProviderRegistry().initialize()
        r.register(_make_mock_provider())
        r.reload()
        assert r.list() == []

    def test_uninitialized_raises(self):
        r = ProviderRegistry()
        with pytest.raises(LLMProviderError):
            r.register(_make_mock_provider())


# ---------------------------------------------------------------------------
# LLMManager
# ---------------------------------------------------------------------------

class TestLLMManager:
    def test_initialize(self):
        m = LLMManager().initialize()
        assert m.is_initialized is True

    def test_double_initialize(self):
        m = LLMManager().initialize()
        m.initialize()
        assert m.is_initialized is True

    def test_register_provider(self):
        m = LLMManager().initialize()
        m.register_provider(_make_mock_provider())
        assert "mock" in m.registry.list()

    def test_remove_provider(self):
        m = LLMManager().initialize()
        m.register_provider(_make_mock_provider())
        assert m.remove_provider("mock") is True
        assert "mock" not in m.registry.list()

    def test_provider(self):
        m = LLMManager().initialize()
        p = _make_mock_provider()
        m.register_provider(p)
        assert m.provider() is p

    def test_provider_by_name(self):
        m = LLMManager().initialize()
        p = _make_mock_provider()
        m.register_provider(p)
        assert m.provider("mock") is p

    def test_provider_missing(self):
        m = LLMManager().initialize()
        assert m.provider("missing") is None

    def test_generate(self):
        m = LLMManager().initialize()
        m.register_provider(_make_mock_provider())
        resp = m.generate(_make_request("hello"))
        assert resp.content == "mock response for: hello"

    def test_generate_with_cache(self):
        m = LLMManager(LLMConfig(cache=CacheConfig(enabled=True))).initialize()
        m.register_provider(_make_mock_provider())
        req = _make_request("cached")
        r1 = m.generate(req)
        r2 = m.generate(req)
        assert r1.content == r2.content
        stats = m.statistics()
        assert stats.cache_hits >= 1

    def test_generate_cache_disabled(self):
        m = LLMManager(LLMConfig(cache=CacheConfig(enabled=False))).initialize()
        m.register_provider(_make_mock_provider())
        m.generate(_make_request("x"))
        stats = m.statistics()
        assert stats.cache_hits == 0

    def test_generate_provider_not_found(self):
        m = LLMManager().initialize()
        with pytest.raises(LLMProviderError):
            m.generate(_make_request())

    def test_stream(self):
        m = LLMManager().initialize()
        m.register_provider(_make_mock_provider())
        stream = m.stream(_make_request("hello"))
        assert isinstance(stream, LLMStream)
        result = stream.collect()
        assert len(result) > 0

    def test_embed(self):
        m = LLMManager().initialize()
        m.register_provider(_make_mock_provider())
        resp = m.embed(EmbeddingRequest(texts=("hello",)))
        assert len(resp.vectors) == 1

    def test_embed_failure(self):
        m = LLMManager().initialize()
        p = AnthropicProvider(ProviderConfig(api_key="key", model="claude")).initialize()
        m.register_provider(p)
        with pytest.raises(LLMProviderError):
            m.embed(EmbeddingRequest(texts=("x",)), provider_name="anthropic")

    def test_count_tokens(self):
        m = LLMManager().initialize()
        assert m.count_tokens("hello world") == 2

    def test_statistics(self):
        m = LLMManager().initialize()
        m.register_provider(_make_mock_provider())
        m.generate(_make_request("x"))
        stats = m.statistics()
        assert stats.requests >= 1
        assert stats.successes >= 1

    def test_validate(self):
        m = LLMManager().initialize()
        m.register_provider(_make_mock_provider())
        result = m.validate()
        assert result.is_valid is True

    def test_reload(self):
        m = LLMManager().initialize()
        m.register_provider(_make_mock_provider())
        m.generate(_make_request("x"))
        m.reload()
        assert m.is_initialized is False

    def test_shutdown(self):
        m = LLMManager().initialize()
        m.register_provider(_make_mock_provider())
        m.shutdown()
        assert m.is_initialized is False

    def test_uninitialized_generate_raises(self):
        m = LLMManager()
        with pytest.raises(LLMProviderError):
            m.generate(_make_request())

    def test_uninitialized_stream_raises(self):
        m = LLMManager()
        with pytest.raises(LLMProviderError):
            m.stream(_make_request())

    def test_uninitialized_embed_raises(self):
        m = LLMManager()
        with pytest.raises(LLMProviderError):
            m.embed(EmbeddingRequest(texts=("x",)))

    def test_uninitialized_statistics_raises(self):
        m = LLMManager()
        with pytest.raises(LLMProviderError):
            m.statistics()

    def test_uninitialized_validate(self):
        m = LLMManager()
        result = m.validate()
        assert len(result.warnings) > 0

    def test_fallback(self):
        m = LLMManager(LLMConfig(fallback_enabled=True)).initialize()
        p1 = MockProvider().initialize()
        p2 = OllamaProvider().initialize()
        m.register_provider(p1)
        m.register_provider(p2)
        resp = m.generate(_make_request("test"))
        assert resp.content != ""


# ---------------------------------------------------------------------------
# Thread Safety
# ---------------------------------------------------------------------------

class TestThreadSafety:
    def test_concurrent_generate(self):
        m = LLMManager().initialize()
        m.register_provider(_make_mock_provider())
        n = 20
        barrier = threading.Barrier(n)
        results: list[LLMResponse] = []
        lock = threading.Lock()

        def worker():
            barrier.wait()
            resp = m.generate(_make_request("concurrent"))
            with lock:
                results.append(resp)

        threads = [threading.Thread(target=worker) for _ in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert len(results) == n

    def test_concurrent_cache(self):
        c = LLMCache().initialize()
        n = 20
        barrier = threading.Barrier(n)

        def worker():
            barrier.wait()
            req = _make_request("test")
            c.put(req, LLMResponse(content="cached"))
            c.get(req)

        threads = [threading.Thread(target=worker) for _ in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert c.size >= 1

    def test_concurrent_metrics(self):
        m = LLMMetrics()
        n = 30
        barrier = threading.Barrier(n)

        def worker():
            barrier.wait()
            m.record_request("mock", True, 0.1, 5)

        threads = [threading.Thread(target=worker) for _ in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert m.statistics()["requests"] == n

    def test_concurrent_registry(self):
        r = ProviderRegistry().initialize()
        n = 10
        barrier = threading.Barrier(n)

        def worker(i):
            barrier.wait()
            p = MockProvider().initialize()
            try:
                r.register(p, aliases=(f"alias-{i}",))
            except LLMProviderError:
                pass

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert len(r.list()) >= 1


# ---------------------------------------------------------------------------
# Integration
# ---------------------------------------------------------------------------

class TestIntegration:
    def test_manager_with_multiple_providers(self):
        m = LLMManager().initialize()
        mock = MockProvider().initialize()
        m.register_provider(mock, aliases=("default-mock",))
        assert m.provider("default-mock") is mock
        resp = m.generate(_make_request("test"))
        assert resp.provider == "mock"

    def test_manager_statistics_aggregation(self):
        m = LLMManager().initialize()
        m.register_provider(_make_mock_provider())
        for i in range(5):
            m.generate(_make_request(f"request {i}"))
        stats = m.statistics()
        assert stats.requests >= 5
        assert stats.successes >= 5

    def test_full_workflow(self):
        m = LLMManager(LLMConfig(cache=CacheConfig(ttl=60, max_size=100))).initialize()
        m.register_provider(_make_mock_provider())
        req = _make_request("What is AI?")
        resp = m.generate(req)
        assert resp.content != ""
        assert resp.usage.total_tokens > 0
        stream = m.stream(req)
        text = stream.collect()
        assert len(text) > 0
        embed_resp = m.embed(EmbeddingRequest(texts=("AI",)))
        assert len(embed_resp.vectors) == 1
        stats = m.statistics()
        assert stats.requests >= 1
        m.shutdown()
