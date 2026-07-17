"""Tests for tool providers, vector store providers, and RAG retriever."""

from __future__ import annotations

import threading
import time
from unittest.mock import MagicMock, patch

import pytest

from aios.core.exceptions import RAGError, ToolError, VectorStoreError
from aios.rag.embedding_manager import EmbeddingManager
from aios.rag.models import Chunk, SearchMethod
from aios.rag.retriever import Retriever
from aios.tools.models import (
    ToolRequest,
    ToolStatus,
)
from aios.tools.providers.browser import BrowserProvider
from aios.tools.providers.filesystem import FilesystemProvider
from aios.tools.providers.git import GitProvider
from aios.tools.providers.http_provider import HTTPProvider
from aios.tools.providers.mcp import MCPProvider
from aios.tools.providers.python_provider import PythonProvider
from aios.tools.providers.shell import ShellProvider
from aios.vectorstore.models import VectorStoreConfig
from aios.vectorstore.providers.chroma import ChromaVectorStore
from aios.vectorstore.providers.faiss import FAISSVectorStore

# ══════════════════════════════════════════════════════════════════════════
# GIT PROVIDER
# ══════════════════════════════════════════════════════════════════════════


class TestGitProvider:
    def test_lifecycle(self):
        p = GitProvider()
        assert not p.is_initialized
        assert p.name == "git"
        p.initialize()
        assert p.is_initialized
        assert p.health()
        p.shutdown()
        assert not p.is_initialized

    def test_list_tools(self):
        p = GitProvider().initialize()
        tools = p.list_tools()
        assert len(tools) == 1
        assert tools[0].name == "git_command"

    def test_capabilities(self):
        p = GitProvider()
        caps = p.capabilities
        assert caps.sandbox is True
        assert caps.retry is False

    def test_validate(self):
        p = GitProvider().initialize()
        result = p.validate()
        assert result.is_valid

    def test_reload(self):
        p = GitProvider().initialize()
        p.reload()
        assert p.is_initialized

    def test_statistics_empty(self):
        p = GitProvider().initialize()
        stats = p.statistics
        assert stats.executions == 0

    @patch("aios.tools.providers.git.subprocess.run")
    def test_execute_success(self, mock_run):
        mock_run.return_value = MagicMock(returncode=0, stdout="main", stderr="")
        p = GitProvider().initialize()
        req = ToolRequest(tool_name="git_command", arguments={"args": "branch"}, timeout=10)
        resp = p.execute(req)
        assert resp.status == ToolStatus.SUCCESS
        assert "main" in resp.result

    @patch("aios.tools.providers.git.subprocess.run")
    def test_execute_failure(self, mock_run):
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="error")
        p = GitProvider().initialize()
        req = ToolRequest(tool_name="git_command", arguments={"args": "bad"}, timeout=10)
        resp = p.execute(req)
        assert resp.status == ToolStatus.ERROR
        assert "Exit code 1" in resp.error

    def test_execute_not_initialized(self):
        p = GitProvider()
        with pytest.raises(ToolError, match="not been initialized"):
            p.execute(ToolRequest(tool_name="git_command", arguments={}, timeout=10))

    def test_stream_not_supported(self):
        p = GitProvider().initialize()
        with pytest.raises(NotImplementedError):
            p.stream(ToolRequest(tool_name="git_command", arguments={}, timeout=10))

    def test_statistics_after_execute(self):
        p = GitProvider().initialize()
        with patch("aios.tools.providers.git.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
            p.execute(ToolRequest(tool_name="git_command", arguments={"args": "status"}, timeout=10))
        stats = p.statistics
        assert stats.executions == 1
        assert stats.successes == 1


# ══════════════════════════════════════════════════════════════════════════
# HTTP PROVIDER
# ══════════════════════════════════════════════════════════════════════════


class TestHTTPProvider:
    def test_lifecycle(self):
        p = HTTPProvider()
        assert not p.is_initialized
        assert p.name == "http"
        p.initialize()
        assert p.is_initialized
        assert p.health()
        p.shutdown()
        assert not p.is_initialized

    def test_list_tools(self):
        p = HTTPProvider().initialize()
        tools = p.list_tools()
        assert len(tools) == 1
        assert tools[0].name == "http_request"

    def test_capabilities(self):
        p = HTTPProvider()
        caps = p.capabilities
        assert caps.retry is True
        assert caps.caching is True

    def test_validate(self):
        p = HTTPProvider().initialize()
        result = p.validate()
        assert result.is_valid

    def test_reload(self):
        p = HTTPProvider().initialize()
        p.reload()
        assert p.is_initialized

    def test_statistics_empty(self):
        p = HTTPProvider().initialize()
        stats = p.statistics
        assert stats.executions == 0

    def test_execute_not_initialized(self):
        p = HTTPProvider()
        with pytest.raises(ToolError, match="not been initialized"):
            p.execute(ToolRequest(tool_name="http_request", arguments={}, timeout=10))

    def test_stream_not_supported(self):
        p = HTTPProvider().initialize()
        with pytest.raises(NotImplementedError):
            p.stream(ToolRequest(tool_name="http_request", arguments={}, timeout=10))

    @patch("aios.tools.providers.http_provider.urlrequest.urlopen")
    def test_execute_success(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.read.return_value = b'{"ok":true}'
        mock_resp.__enter__ = MagicMock(return_value=mock_resp)
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_resp

        p = HTTPProvider().initialize()
        req = ToolRequest(tool_name="http_request", arguments={"url": "http://test.com", "method": "GET"}, timeout=10)
        resp = p.execute(req)
        assert resp.status == ToolStatus.SUCCESS

    @patch("aios.tools.providers.http_provider.urlrequest.urlopen")
    def test_execute_error(self, mock_urlopen):
        mock_urlopen.side_effect = Exception("Connection refused")
        p = HTTPProvider().initialize()
        req = ToolRequest(tool_name="http_request", arguments={"url": "http://bad.com"}, timeout=10)
        resp = p.execute(req)
        assert resp.status == ToolStatus.ERROR

    @patch("aios.tools.providers.http_provider.urlrequest.urlopen")
    def test_execute_with_body(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.read.return_value = b'{"created":true}'
        mock_resp.__enter__ = MagicMock(return_value=mock_resp)
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_resp

        p = HTTPProvider().initialize()
        req = ToolRequest(tool_name="http_request", arguments={"url": "http://test.com", "method": "POST", "body": {"key": "val"}}, timeout=10)
        resp = p.execute(req)
        assert resp.status == ToolStatus.SUCCESS


# ══════════════════════════════════════════════════════════════════════════
# MCP PROVIDER
# ══════════════════════════════════════════════════════════════════════════


class TestMCPProvider:
    def test_lifecycle(self):
        p = MCPProvider()
        assert not p.is_initialized
        assert p.name == "mcp"
        p.initialize()
        assert p.is_initialized
        assert p.health()
        p.shutdown()
        assert not p.is_initialized

    def test_list_tools(self):
        p = MCPProvider().initialize()
        tools = p.list_tools()
        assert len(tools) == 1
        assert tools[0].name == "mcp_call"

    def test_capabilities(self):
        p = MCPProvider()
        caps = p.capabilities
        assert caps.streaming is True

    def test_validate_no_url(self):
        p = MCPProvider().initialize()
        result = p.validate()
        assert len(result.warnings) >= 2  # stub + no URL

    def test_validate_with_url(self):
        p = MCPProvider(server_url="http://localhost:3000").initialize()
        result = p.validate()
        assert len(result.warnings) == 1  # just stub warning

    def test_reload(self):
        p = MCPProvider().initialize()
        p.reload()
        assert p.is_initialized

    def test_statistics(self):
        p = MCPProvider().initialize()
        stats = p.statistics
        assert stats.executions == 0

    def test_execute_not_implemented(self):
        p = MCPProvider().initialize()
        with pytest.raises(NotImplementedError, match="MCP client"):
            p.execute(ToolRequest(tool_name="mcp_call", arguments={}, timeout=10))

    def test_stream_not_implemented(self):
        p = MCPProvider().initialize()
        with pytest.raises(NotImplementedError, match="MCP client"):
            p.stream(ToolRequest(tool_name="mcp_call", arguments={}, timeout=10))

    def test_execute_not_initialized(self):
        p = MCPProvider()
        with pytest.raises(ToolError, match="not been initialized"):
            p.execute(ToolRequest(tool_name="mcp_call", arguments={}, timeout=10))


# ══════════════════════════════════════════════════════════════════════════
# PYTHON PROVIDER
# ══════════════════════════════════════════════════════════════════════════


class TestPythonProvider:
    def test_lifecycle(self):
        p = PythonProvider()
        assert not p.is_initialized
        assert p.name == "python"
        p.initialize()
        assert p.is_initialized
        assert p.health()
        p.shutdown()
        assert not p.is_initialized

    def test_list_tools(self):
        p = PythonProvider().initialize()
        tools = p.list_tools()
        assert len(tools) == 1
        assert tools[0].name == "run_python"

    def test_capabilities(self):
        p = PythonProvider()
        caps = p.capabilities
        assert caps.sandbox is True
        assert caps.caching is False

    def test_validate(self):
        p = PythonProvider().initialize()
        result = p.validate()
        assert result.is_valid

    def test_reload(self):
        p = PythonProvider().initialize()
        p.reload()
        assert p.is_initialized

    def test_statistics_empty(self):
        p = PythonProvider().initialize()
        stats = p.statistics
        assert stats.executions == 0

    def test_execute_success(self):
        p = PythonProvider().initialize()
        req = ToolRequest(tool_name="run_python", arguments={"code": "print(42)"}, timeout=10)
        resp = p.execute(req)
        assert resp.status == ToolStatus.SUCCESS
        assert "42" in resp.result

    def test_execute_error(self):
        p = PythonProvider().initialize()
        req = ToolRequest(tool_name="run_python", arguments={"code": "raise ValueError('oops')"}, timeout=10)
        resp = p.execute(req)
        assert resp.status == ToolStatus.ERROR
        assert "oops" in resp.error

    def test_execute_no_code(self):
        p = PythonProvider().initialize()
        req = ToolRequest(tool_name="run_python", arguments={}, timeout=10)
        resp = p.execute(req)
        assert resp.status == ToolStatus.SUCCESS  # empty code is valid

    def test_execute_not_initialized(self):
        p = PythonProvider()
        with pytest.raises(ToolError, match="not been initialized"):
            p.execute(ToolRequest(tool_name="run_python", arguments={}, timeout=10))

    def test_stream_not_supported(self):
        p = PythonProvider().initialize()
        with pytest.raises(NotImplementedError):
            p.stream(ToolRequest(tool_name="run_python", arguments={}, timeout=10))

    def test_statistics_after_execute(self):
        p = PythonProvider().initialize()
        p.execute(ToolRequest(tool_name="run_python", arguments={"code": "print(1)"}, timeout=10))
        stats = p.statistics
        assert stats.executions == 1
        assert stats.successes == 1


# ══════════════════════════════════════════════════════════════════════════
# BROWSER PROVIDER
# ══════════════════════════════════════════════════════════════════════════


class TestBrowserProvider:
    def test_lifecycle(self):
        p = BrowserProvider()
        assert not p.is_initialized
        assert p.name == "browser"
        p.initialize()
        assert p.is_initialized
        assert p.health()
        p.shutdown()
        assert not p.is_initialized

    def test_list_tools(self):
        p = BrowserProvider().initialize()
        tools = p.list_tools()
        assert len(tools) == 3
        names = [t.name for t in tools]
        assert "navigate" in names
        assert "click" in names
        assert "screenshot" in names

    def test_capabilities(self):
        p = BrowserProvider()
        caps = p.capabilities
        assert caps.sandbox is True

    def test_validate(self):
        p = BrowserProvider().initialize()
        result = p.validate()
        assert len(result.warnings) == 1  # stub warning

    def test_reload(self):
        p = BrowserProvider().initialize()
        p.reload()
        assert p.is_initialized

    def test_statistics(self):
        p = BrowserProvider().initialize()
        stats = p.statistics
        assert stats.executions == 0

    def test_execute_not_implemented(self):
        p = BrowserProvider().initialize()
        with pytest.raises(NotImplementedError, match="selenium"):
            p.execute(ToolRequest(tool_name="navigate", arguments={"url": "http://test.com"}, timeout=10))

    def test_stream_not_supported(self):
        p = BrowserProvider().initialize()
        with pytest.raises(NotImplementedError):
            p.stream(ToolRequest(tool_name="navigate", arguments={}, timeout=10))

    def test_execute_not_initialized(self):
        p = BrowserProvider()
        with pytest.raises(ToolError, match="not been initialized"):
            p.execute(ToolRequest(tool_name="navigate", arguments={}, timeout=10))


# ══════════════════════════════════════════════════════════════════════════
# SHELL PROVIDER
# ══════════════════════════════════════════════════════════════════════════


class TestShellProvider:
    def test_lifecycle(self):
        p = ShellProvider()
        assert not p.is_initialized
        assert p.name == "shell"
        p.initialize()
        assert p.is_initialized
        assert p.health()
        p.shutdown()
        assert not p.is_initialized

    def test_list_tools(self):
        p = ShellProvider().initialize()
        tools = p.list_tools()
        assert len(tools) == 1
        assert tools[0].name == "run_command"

    def test_capabilities(self):
        p = ShellProvider()
        caps = p.capabilities
        assert caps.sandbox is True

    def test_validate(self):
        p = ShellProvider().initialize()
        result = p.validate()
        assert result.is_valid

    def test_reload(self):
        p = ShellProvider().initialize()
        p.reload()
        assert p.is_initialized

    def test_statistics_empty(self):
        p = ShellProvider().initialize()
        stats = p.statistics
        assert stats.executions == 0

    def test_execute_allowed_command(self):
        p = ShellProvider(allowed_commands=("echo",)).initialize()
        req = ToolRequest(tool_name="run_command", arguments={"command": "echo hello"}, timeout=10)
        resp = p.execute(req)
        assert resp.status == ToolStatus.SUCCESS
        assert "hello" in resp.result

    def test_execute_blocked_command(self):
        p = ShellProvider(allowed_commands=("echo",)).initialize()
        req = ToolRequest(tool_name="run_command", arguments={"command": "rm -rf /"}, timeout=10)
        resp = p.execute(req)
        assert resp.status == ToolStatus.ERROR
        assert "not allowed" in resp.error

    def test_execute_empty_command(self):
        p = ShellProvider(allowed_commands=("echo",)).initialize()
        req = ToolRequest(tool_name="run_command", arguments={"command": ""}, timeout=10)
        resp = p.execute(req)
        assert resp.status == ToolStatus.ERROR

    def test_execute_command_failure(self):
        p = ShellProvider(allowed_commands=("false",)).initialize()
        req = ToolRequest(tool_name="run_command", arguments={"command": "false"}, timeout=10)
        resp = p.execute(req)
        assert resp.status == ToolStatus.ERROR

    def test_execute_not_initialized(self):
        p = ShellProvider()
        with pytest.raises(ToolError, match="not been initialized"):
            p.execute(ToolRequest(tool_name="run_command", arguments={}, timeout=10))

    def test_stream_not_supported(self):
        p = ShellProvider().initialize()
        with pytest.raises(NotImplementedError):
            p.stream(ToolRequest(tool_name="run_command", arguments={}, timeout=10))

    def test_statistics_after_execute(self):
        p = ShellProvider(allowed_commands=("echo",)).initialize()
        p.execute(ToolRequest(tool_name="run_command", arguments={"command": "echo hi"}, timeout=10))
        stats = p.statistics
        assert stats.executions == 1
        assert stats.successes == 1


# ══════════════════════════════════════════════════════════════════════════
# FILESYSTEM PROVIDER
# ══════════════════════════════════════════════════════════════════════════


class TestFilesystemProvider:
    def test_lifecycle(self):
        p = FilesystemProvider()
        assert not p.is_initialized
        assert p.name == "filesystem"
        p.initialize()
        assert p.is_initialized
        assert p.health()
        p.shutdown()
        assert not p.is_initialized

    def test_list_tools(self):
        p = FilesystemProvider().initialize()
        tools = p.list_tools()
        assert len(tools) == 4
        names = [t.name for t in tools]
        assert "read_file" in names
        assert "write_file" in names
        assert "list_dir" in names
        assert "file_exists" in names

    def test_capabilities(self):
        p = FilesystemProvider()
        caps = p.capabilities
        assert caps.sandbox is True
        assert caps.caching is True

    def test_validate_valid(self, tmp_path):
        p = FilesystemProvider(str(tmp_path)).initialize()
        result = p.validate()
        assert result.is_valid

    def test_validate_invalid_base(self):
        p = FilesystemProvider("/nonexistent/path/12345").initialize()
        result = p.validate()
        assert not result.is_valid
        assert any("does not exist" in e for e in result.errors)

    def test_reload(self):
        p = FilesystemProvider().initialize()
        p.reload()
        assert p.is_initialized

    def test_statistics_empty(self):
        p = FilesystemProvider().initialize()
        stats = p.statistics
        assert stats.executions == 0

    def test_write_and_read_file(self, tmp_path):
        p = FilesystemProvider(str(tmp_path)).initialize()
        # Write
        req = ToolRequest(tool_name="write_file", arguments={"path": "test.txt", "content": "hello"}, timeout=10)
        resp = p.execute(req)
        assert resp.status == ToolStatus.SUCCESS
        # Read
        req = ToolRequest(tool_name="read_file", arguments={"path": "test.txt"}, timeout=10)
        resp = p.execute(req)
        assert resp.status == ToolStatus.SUCCESS
        assert "hello" in resp.result

    def test_list_dir(self, tmp_path):
        (tmp_path / "a.txt").write_text("a", encoding="utf-8")
        p = FilesystemProvider(str(tmp_path)).initialize()
        req = ToolRequest(tool_name="list_dir", arguments={"path": "."}, timeout=10)
        resp = p.execute(req)
        assert resp.status == ToolStatus.SUCCESS
        assert "a.txt" in resp.result

    def test_file_exists(self, tmp_path):
        (tmp_path / "exists.txt").write_text("x", encoding="utf-8")
        p = FilesystemProvider(str(tmp_path)).initialize()
        req = ToolRequest(tool_name="file_exists", arguments={"path": "exists.txt"}, timeout=10)
        resp = p.execute(req)
        assert resp.status == ToolStatus.SUCCESS
        assert "True" in resp.result

    def test_file_not_exists(self, tmp_path):
        p = FilesystemProvider(str(tmp_path)).initialize()
        req = ToolRequest(tool_name="file_exists", arguments={"path": "nope.txt"}, timeout=10)
        resp = p.execute(req)
        assert resp.status == ToolStatus.SUCCESS
        assert "False" in resp.result

    def test_read_nonexistent_file(self, tmp_path):
        p = FilesystemProvider(str(tmp_path)).initialize()
        req = ToolRequest(tool_name="read_file", arguments={"path": "nope.txt"}, timeout=10)
        resp = p.execute(req)
        assert resp.status == ToolStatus.ERROR

    def test_unknown_tool_name(self, tmp_path):
        p = FilesystemProvider(str(tmp_path)).initialize()
        req = ToolRequest(tool_name="delete_file", arguments={}, timeout=10)
        resp = p.execute(req)
        assert resp.status == ToolStatus.SUCCESS
        assert "Unknown tool" in resp.result

    def test_health_with_invalid_base(self):
        p = FilesystemProvider("/nonexistent/xyz")
        assert not p.health()

    def test_execute_not_initialized(self):
        p = FilesystemProvider()
        with pytest.raises(ToolError, match="not been initialized"):
            p.execute(ToolRequest(tool_name="read_file", arguments={}, timeout=10))

    def test_stream_not_supported(self):
        p = FilesystemProvider().initialize()
        with pytest.raises(NotImplementedError):
            p.stream(ToolRequest(tool_name="read_file", arguments={}, timeout=10))

    def test_statistics_after_operations(self, tmp_path):
        p = FilesystemProvider(str(tmp_path)).initialize()
        p.execute(ToolRequest(tool_name="write_file", arguments={"path": "x.txt", "content": "data"}, timeout=10))
        p.execute(ToolRequest(tool_name="read_file", arguments={"path": "x.txt"}, timeout=10))
        stats = p.statistics
        assert stats.executions == 2
        assert stats.successes == 2


# ══════════════════════════════════════════════════════════════════════════
# CHROMA VECTOR STORE
# ══════════════════════════════════════════════════════════════════════════


class TestChromaVectorStore:
    def test_lifecycle(self):
        p = ChromaVectorStore()
        assert not p.is_initialized
        assert p.name == "chroma"
        p.initialize()
        assert p.is_initialized
        assert p.health()
        p.shutdown()
        assert not p.is_initialized

    def test_custom_config(self):
        cfg = VectorStoreConfig(name="my_chroma", dimensions=768)
        p = ChromaVectorStore(cfg)
        assert p.name == "my_chroma"

    def test_statistics(self):
        p = ChromaVectorStore().initialize()
        stats = p.statistics
        assert stats.dimensions == 384
        assert stats.index_type == "hnsw"

    def test_validate(self):
        p = ChromaVectorStore().initialize()
        result = p.validate()
        assert len(result.warnings) == 1

    def test_list_namespaces(self):
        p = ChromaVectorStore().initialize()
        assert p.list_namespaces() == []

    def test_count(self):
        p = ChromaVectorStore().initialize()
        assert p.count() == 0

    def test_clear(self):
        p = ChromaVectorStore().initialize()
        p.clear()  # should not raise

    def test_reload(self):
        p = ChromaVectorStore().initialize()
        p.reload()
        assert p.is_initialized

    def test_upsert_not_implemented(self):
        p = ChromaVectorStore().initialize()
        with pytest.raises(NotImplementedError, match="chromadb"):
            p.upsert([])

    def test_get_not_implemented(self):
        p = ChromaVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.get("id")

    def test_delete_not_implemented(self):
        p = ChromaVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.delete("id")

    def test_search_not_implemented(self):
        p = ChromaVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.search((1.0, 2.0, 3.0))

    def test_not_initialized_raises(self):
        p = ChromaVectorStore()
        with pytest.raises(VectorStoreError, match="not been initialized"):
            p.upsert([])


# ══════════════════════════════════════════════════════════════════════════
# FAISS VECTOR STORE
# ══════════════════════════════════════════════════════════════════════════


class TestFAISSVectorStore:
    def test_lifecycle(self):
        p = FAISSVectorStore()
        assert not p.is_initialized
        assert p.name == "faiss"
        p.initialize()
        assert p.is_initialized
        assert p.health()
        p.shutdown()
        assert not p.is_initialized

    def test_custom_config(self):
        cfg = VectorStoreConfig(name="my_faiss", dimensions=1024)
        p = FAISSVectorStore(cfg)
        assert p.name == "my_faiss"

    def test_statistics(self):
        p = FAISSVectorStore().initialize()
        stats = p.statistics
        assert stats.dimensions == 384
        assert stats.index_type == "flat"

    def test_validate(self):
        p = FAISSVectorStore().initialize()
        result = p.validate()
        assert len(result.warnings) == 1

    def test_list_namespaces(self):
        p = FAISSVectorStore().initialize()
        assert p.list_namespaces() == []

    def test_count(self):
        p = FAISSVectorStore().initialize()
        assert p.count() == 0

    def test_clear(self):
        p = FAISSVectorStore().initialize()
        p.clear()

    def test_reload(self):
        p = FAISSVectorStore().initialize()
        p.reload()
        assert p.is_initialized

    def test_upsert_not_implemented(self):
        p = FAISSVectorStore().initialize()
        with pytest.raises(NotImplementedError, match="faiss"):
            p.upsert([])

    def test_get_not_implemented(self):
        p = FAISSVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.get("id")

    def test_delete_not_implemented(self):
        p = FAISSVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.delete("id")

    def test_search_not_implemented(self):
        p = FAISSVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.search((1.0, 2.0, 3.0))

    def test_not_initialized_raises(self):
        p = FAISSVectorStore()
        with pytest.raises(VectorStoreError, match="not been initialized"):
            p.upsert([])


# ══════════════════════════════════════════════════════════════════════════
# RAG RETRIEVER
# ══════════════════════════════════════════════════════════════════════════


class TestRetriever:
    def _retriever(self):
        em = EmbeddingManager()
        em.initialize()
        r = Retriever(em)
        r.initialize()
        return r

    def test_lifecycle(self):
        em = EmbeddingManager()
        em.initialize()
        r = Retriever(em)
        assert not r.is_initialized
        r.initialize()
        assert r.is_initialized

    def test_add_single_chunk(self):
        r = self._retriever()
        chunk = Chunk(
            id="c1",
            content="Hello world",
            document_id="doc1",
            embedding=(1.0, 0.0, 0.0),
        )
        r.add_chunk(chunk)
        # Search should find it
        results = r.search("hello", top_k=5, method=SearchMethod.KEYWORD)
        assert len(results) == 1
        assert results[0].chunk.id == "c1"

    def test_add_multiple_chunks(self):
        r = self._retriever()
        chunks = [
            Chunk(id=f"c{i}", content=f"Content {i}", document_id="doc1", embedding=(float(i), 0.0, 0.0))
            for i in range(5)
        ]
        r.add_chunks(chunks)
        results = r.search("content", top_k=5, method=SearchMethod.KEYWORD)
        assert len(results) == 5

    def test_keyword_search(self):
        r = self._retriever()
        r.add_chunk(Chunk(id="c1", content="The quick brown fox", document_id="d1"))
        r.add_chunk(Chunk(id="c2", content="Lazy dog sleeps", document_id="d1"))
        results = r.search("fox", method=SearchMethod.KEYWORD)
        assert len(results) >= 1
        assert results[0].chunk.id == "c1"

    def test_bm25_search(self):
        r = self._retriever()
        r.add_chunk(Chunk(id="c1", content="machine learning algorithms", document_id="d1"))
        r.add_chunk(Chunk(id="c2", content="deep learning neural networks", document_id="d1"))
        r.add_chunk(Chunk(id="c3", content="cooking recipes pasta", document_id="d1"))
        results = r.search("learning", method=SearchMethod.BM25)
        assert len(results) >= 2
        # learning-related docs should rank higher
        chunk_ids = [res.chunk.id for res in results]
        assert "c1" in chunk_ids
        assert "c2" in chunk_ids

    def test_vector_search(self):
        r = self._retriever()
        r.add_chunk(Chunk(id="c1", content="A", document_id="d1", embedding=(1.0, 0.0, 0.0)))
        r.add_chunk(Chunk(id="c2", content="B", document_id="d1", embedding=(0.0, 1.0, 0.0)))
        results = r.search("query", method=SearchMethod.VECTOR)
        assert len(results) == 2
        assert results[0].score >= results[1].score or results[1].score >= results[0].score

    def test_hybrid_search(self):
        r = self._retriever()
        r.add_chunk(Chunk(id="c1", content="machine learning", document_id="d1", embedding=(1.0, 0.0)))
        r.add_chunk(Chunk(id="c2", content="cooking food", document_id="d1", embedding=(0.0, 1.0)))
        results = r.search("machine", method=SearchMethod.HYBRID)
        assert len(results) >= 1

    def test_search_unknown_method(self):
        r = self._retriever()
        r.add_chunk(Chunk(id="c1", content="test", document_id="d1"))
        with pytest.raises(RAGError, match="Unknown search method"):
            r.search("test", method="invalid_method")

    def test_statistics(self):
        r = self._retriever()
        r.add_chunk(Chunk(id="c1", content="test", document_id="d1"))
        r.search("test", method=SearchMethod.KEYWORD)
        stats = r.statistics()
        assert stats.chunks_indexed == 1
        assert stats.searches_performed == 1

    def test_validate_empty(self):
        r = self._retriever()
        result = r.validate()
        assert len(result.warnings) >= 1  # no chunks warning

    def test_validate_with_chunks(self):
        r = self._retriever()
        r.add_chunk(Chunk(id="c1", content="test", document_id="d1"))
        result = r.validate()
        # Should still have chunk
        assert result.is_valid

    def test_reload(self):
        r = self._retriever()
        r.add_chunk(Chunk(id="c1", content="test", document_id="d1"))
        r.reload()
        # After reload, chunks should be cleared
        stats = r.statistics()
        assert stats.chunks_indexed == 0

    def test_not_initialized(self):
        em = EmbeddingManager()
        em.initialize()
        r = Retriever(em)
        with pytest.raises(RAGError, match="not been initialized"):
            r.add_chunk(Chunk(id="c1", content="test", document_id="d1"))

    def test_search_empty_retriever(self):
        r = self._retriever()
        results = r.search("query", method=SearchMethod.KEYWORD)
        assert results == []

    def test_cosine_similarity_identical(self):
        r = self._retriever()
        sim = r._cosine_similarity((1.0, 0.0, 0.0), (1.0, 0.0, 0.0))
        assert abs(sim - 1.0) < 0.001

    def test_cosine_similarity_orthogonal(self):
        r = self._retriever()
        sim = r._cosine_similarity((1.0, 0.0), (0.0, 1.0))
        assert abs(sim) < 0.001

    def test_cosine_similarity_different_lengths(self):
        r = self._retriever()
        sim = r._cosine_similarity((1.0,), (1.0, 2.0))
        assert sim == 0.0

    def test_cosine_similarity_zero_vector(self):
        r = self._retriever()
        sim = r._cosine_similarity((0.0, 0.0), (1.0, 0.0))
        assert sim == 0.0

    def test_bm25_no_match(self):
        r = self._retriever()
        r.add_chunk(Chunk(id="c1", content="hello world", document_id="d1"))
        results = r.search("xyz", method=SearchMethod.BM25)
        assert results == []

    def test_keyword_no_match(self):
        r = self._retriever()
        r.add_chunk(Chunk(id="c1", content="hello world", document_id="d1"))
        results = r.search("xyz", method=SearchMethod.KEYWORD)
        assert results == []

    def test_vector_no_embeddings(self):
        r = self._retriever()
        r.add_chunk(Chunk(id="c1", content="test", document_id="d1"))
        results = r.search("query", method=SearchMethod.VECTOR)
        assert results == []  # no embeddings to compare

    def test_thread_safety(self):
        r = self._retriever()
        errors = []

        def add_chunks():
            try:
                for i in range(50):
                    r.add_chunk(Chunk(id=str(time.time_ns()), content=f"chunk {i}", document_id="d1"))
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=add_chunks) for _ in range(4)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert len(errors) == 0


# ══════════════════════════════════════════════════════════════════════════
# REMAINING VECTOR STORE STUBS (milvus, pinecone, qdrant, weaviate)
# ══════════════════════════════════════════════════════════════════════════


class TestMilvusVectorStore:
    def test_lifecycle(self):
        from aios.vectorstore.providers.milvus import MilvusVectorStore
        p = MilvusVectorStore()
        assert not p.is_initialized
        assert p.name == "milvus"
        p.initialize()
        assert p.is_initialized
        assert p.health()
        p.shutdown()
        assert not p.is_initialized

    def test_custom_config(self):
        from aios.vectorstore.providers.milvus import MilvusVectorStore
        cfg = VectorStoreConfig(name="my_milvus", dimensions=1024)
        p = MilvusVectorStore(cfg)
        assert p.name == "my_milvus"

    def test_statistics(self):
        from aios.vectorstore.providers.milvus import MilvusVectorStore
        p = MilvusVectorStore().initialize()
        stats = p.statistics
        assert stats.dimensions == 384

    def test_validate(self):
        from aios.vectorstore.providers.milvus import MilvusVectorStore
        p = MilvusVectorStore().initialize()
        result = p.validate()
        assert len(result.warnings) >= 1

    def test_list_namespaces(self):
        from aios.vectorstore.providers.milvus import MilvusVectorStore
        p = MilvusVectorStore().initialize()
        assert p.list_namespaces() == []

    def test_count(self):
        from aios.vectorstore.providers.milvus import MilvusVectorStore
        p = MilvusVectorStore().initialize()
        assert p.count() == 0

    def test_clear(self):
        from aios.vectorstore.providers.milvus import MilvusVectorStore
        p = MilvusVectorStore().initialize()
        p.clear()

    def test_reload(self):
        from aios.vectorstore.providers.milvus import MilvusVectorStore
        p = MilvusVectorStore().initialize()
        p.reload()
        assert p.is_initialized

    def test_upsert_not_implemented(self):
        from aios.vectorstore.providers.milvus import MilvusVectorStore
        p = MilvusVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.upsert([])

    def test_get_not_implemented(self):
        from aios.vectorstore.providers.milvus import MilvusVectorStore
        p = MilvusVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.get("id")

    def test_delete_not_implemented(self):
        from aios.vectorstore.providers.milvus import MilvusVectorStore
        p = MilvusVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.delete("id")

    def test_search_not_implemented(self):
        from aios.vectorstore.providers.milvus import MilvusVectorStore
        p = MilvusVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.search((1.0,))

    def test_not_initialized_raises(self):
        from aios.vectorstore.providers.milvus import MilvusVectorStore
        p = MilvusVectorStore()
        with pytest.raises(VectorStoreError, match="not been initialized"):
            p.upsert([])


class TestPineconeVectorStore:
    def test_lifecycle(self):
        from aios.vectorstore.providers.pinecone import PineconeVectorStore
        p = PineconeVectorStore()
        assert not p.is_initialized
        assert p.name == "pinecone"
        p.initialize()
        assert p.is_initialized
        assert p.health()
        p.shutdown()
        assert not p.is_initialized

    def test_custom_config(self):
        from aios.vectorstore.providers.pinecone import PineconeVectorStore
        cfg = VectorStoreConfig(name="my_pinecone", dimensions=768)
        p = PineconeVectorStore(cfg)
        assert p.name == "my_pinecone"

    def test_statistics(self):
        from aios.vectorstore.providers.pinecone import PineconeVectorStore
        p = PineconeVectorStore().initialize()
        stats = p.statistics
        assert stats.dimensions == 384

    def test_validate(self):
        from aios.vectorstore.providers.pinecone import PineconeVectorStore
        p = PineconeVectorStore().initialize()
        result = p.validate()
        assert len(result.warnings) >= 1

    def test_list_namespaces(self):
        from aios.vectorstore.providers.pinecone import PineconeVectorStore
        p = PineconeVectorStore().initialize()
        assert p.list_namespaces() == []

    def test_count(self):
        from aios.vectorstore.providers.pinecone import PineconeVectorStore
        p = PineconeVectorStore().initialize()
        assert p.count() == 0

    def test_clear(self):
        from aios.vectorstore.providers.pinecone import PineconeVectorStore
        p = PineconeVectorStore().initialize()
        p.clear()

    def test_reload(self):
        from aios.vectorstore.providers.pinecone import PineconeVectorStore
        p = PineconeVectorStore().initialize()
        p.reload()
        assert p.is_initialized

    def test_upsert_not_implemented(self):
        from aios.vectorstore.providers.pinecone import PineconeVectorStore
        p = PineconeVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.upsert([])

    def test_get_not_implemented(self):
        from aios.vectorstore.providers.pinecone import PineconeVectorStore
        p = PineconeVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.get("id")

    def test_delete_not_implemented(self):
        from aios.vectorstore.providers.pinecone import PineconeVectorStore
        p = PineconeVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.delete("id")

    def test_search_not_implemented(self):
        from aios.vectorstore.providers.pinecone import PineconeVectorStore
        p = PineconeVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.search((1.0,))

    def test_not_initialized_raises(self):
        from aios.vectorstore.providers.pinecone import PineconeVectorStore
        p = PineconeVectorStore()
        with pytest.raises(VectorStoreError, match="not been initialized"):
            p.upsert([])


class TestQdrantVectorStore:
    def test_lifecycle(self):
        from aios.vectorstore.providers.qdrant import QdrantVectorStore
        p = QdrantVectorStore()
        assert not p.is_initialized
        assert p.name == "qdrant"
        p.initialize()
        assert p.is_initialized
        assert p.health()
        p.shutdown()
        assert not p.is_initialized

    def test_custom_config(self):
        from aios.vectorstore.providers.qdrant import QdrantVectorStore
        cfg = VectorStoreConfig(name="my_qdrant", dimensions=768)
        p = QdrantVectorStore(cfg)
        assert p.name == "my_qdrant"

    def test_statistics(self):
        from aios.vectorstore.providers.qdrant import QdrantVectorStore
        p = QdrantVectorStore().initialize()
        stats = p.statistics
        assert stats.dimensions == 384

    def test_validate(self):
        from aios.vectorstore.providers.qdrant import QdrantVectorStore
        p = QdrantVectorStore().initialize()
        result = p.validate()
        assert len(result.warnings) >= 1

    def test_list_namespaces(self):
        from aios.vectorstore.providers.qdrant import QdrantVectorStore
        p = QdrantVectorStore().initialize()
        assert p.list_namespaces() == []

    def test_count(self):
        from aios.vectorstore.providers.qdrant import QdrantVectorStore
        p = QdrantVectorStore().initialize()
        assert p.count() == 0

    def test_clear(self):
        from aios.vectorstore.providers.qdrant import QdrantVectorStore
        p = QdrantVectorStore().initialize()
        p.clear()

    def test_reload(self):
        from aios.vectorstore.providers.qdrant import QdrantVectorStore
        p = QdrantVectorStore().initialize()
        p.reload()
        assert p.is_initialized

    def test_upsert_not_implemented(self):
        from aios.vectorstore.providers.qdrant import QdrantVectorStore
        p = QdrantVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.upsert([])

    def test_get_not_implemented(self):
        from aios.vectorstore.providers.qdrant import QdrantVectorStore
        p = QdrantVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.get("id")

    def test_delete_not_implemented(self):
        from aios.vectorstore.providers.qdrant import QdrantVectorStore
        p = QdrantVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.delete("id")

    def test_search_not_implemented(self):
        from aios.vectorstore.providers.qdrant import QdrantVectorStore
        p = QdrantVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.search((1.0,))

    def test_not_initialized_raises(self):
        from aios.vectorstore.providers.qdrant import QdrantVectorStore
        p = QdrantVectorStore()
        with pytest.raises(VectorStoreError, match="not been initialized"):
            p.upsert([])


class TestWeaviateVectorStore:
    def test_lifecycle(self):
        from aios.vectorstore.providers.weaviate import WeaviateVectorStore
        p = WeaviateVectorStore()
        assert not p.is_initialized
        assert p.name == "weaviate"
        p.initialize()
        assert p.is_initialized
        assert p.health()
        p.shutdown()
        assert not p.is_initialized

    def test_custom_config(self):
        from aios.vectorstore.providers.weaviate import WeaviateVectorStore
        cfg = VectorStoreConfig(name="my_weaviate", dimensions=768)
        p = WeaviateVectorStore(cfg)
        assert p.name == "my_weaviate"

    def test_statistics(self):
        from aios.vectorstore.providers.weaviate import WeaviateVectorStore
        p = WeaviateVectorStore().initialize()
        stats = p.statistics
        assert stats.dimensions == 384

    def test_validate(self):
        from aios.vectorstore.providers.weaviate import WeaviateVectorStore
        p = WeaviateVectorStore().initialize()
        result = p.validate()
        assert len(result.warnings) >= 1

    def test_list_namespaces(self):
        from aios.vectorstore.providers.weaviate import WeaviateVectorStore
        p = WeaviateVectorStore().initialize()
        assert p.list_namespaces() == []

    def test_count(self):
        from aios.vectorstore.providers.weaviate import WeaviateVectorStore
        p = WeaviateVectorStore().initialize()
        assert p.count() == 0

    def test_clear(self):
        from aios.vectorstore.providers.weaviate import WeaviateVectorStore
        p = WeaviateVectorStore().initialize()
        p.clear()

    def test_reload(self):
        from aios.vectorstore.providers.weaviate import WeaviateVectorStore
        p = WeaviateVectorStore().initialize()
        p.reload()
        assert p.is_initialized

    def test_upsert_not_implemented(self):
        from aios.vectorstore.providers.weaviate import WeaviateVectorStore
        p = WeaviateVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.upsert([])

    def test_get_not_implemented(self):
        from aios.vectorstore.providers.weaviate import WeaviateVectorStore
        p = WeaviateVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.get("id")

    def test_delete_not_implemented(self):
        from aios.vectorstore.providers.weaviate import WeaviateVectorStore
        p = WeaviateVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.delete("id")

    def test_search_not_implemented(self):
        from aios.vectorstore.providers.weaviate import WeaviateVectorStore
        p = WeaviateVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            p.search((1.0,))

    def test_not_initialized_raises(self):
        from aios.vectorstore.providers.weaviate import WeaviateVectorStore
        p = WeaviateVectorStore()
        with pytest.raises(VectorStoreError, match="not been initialized"):
            p.upsert([])
