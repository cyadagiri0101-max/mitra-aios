"""Tests for AIOS CLI commands."""

from __future__ import annotations

from pathlib import Path

from typer.testing import CliRunner

from aios.cli.app import app

runner = CliRunner()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run(*args: str, root: Path | None = None):
    cmd = []
    if root:
        cmd.extend(["--root", str(root)])
    cmd.extend(list(args))
    return runner.invoke(app, cmd)


# ---------------------------------------------------------------------------
# Top-level
# ---------------------------------------------------------------------------


class TestAppCallback:
    def test_no_args_shows_help(self):
        result = _run()
        assert "AIOS" in result.output or "aios" in result.output

    def test_with_root_option(self, tmp_path: Path):
        result = _run(root=tmp_path)
        assert result.exit_code == 0

    def test_with_log_level(self, tmp_path: Path):
        result = _run("--log-level", "DEBUG", root=tmp_path)
        assert result.exit_code == 0

    def test_with_help_flag(self):
        result = _run("--help")
        assert result.exit_code == 0
        assert "AIOS" in result.output


# ---------------------------------------------------------------------------
# Chat command
# ---------------------------------------------------------------------------


class TestChatCommand:
    def test_chat_single_message(self, tmp_path: Path):
        result = _run("chat", "hello", root=tmp_path)
        assert result.exit_code == 0

    def test_chat_with_agent_option(self, tmp_path: Path):
        result = _run("chat", "hello", "--agent", "test", root=tmp_path)
        assert result.exit_code == 0

    def test_chat_json_output(self, tmp_path: Path):
        result = _run("chat", "hello", "--json", root=tmp_path)
        assert result.exit_code == 0

    def test_chat_with_model(self, tmp_path: Path):
        result = _run("chat", "hello", "--model", "gpt-4", root=tmp_path)
        assert result.exit_code == 0

    def test_chat_help(self):
        result = _run("chat", "--help")
        assert result.exit_code == 0


# ---------------------------------------------------------------------------
# Workflow command
# ---------------------------------------------------------------------------


class TestWorkflowCommand:
    def test_workflow_list(self, tmp_path: Path):
        result = _run("workflow", "list", root=tmp_path)
        assert result.exit_code == 0
        assert "Workflows" in result.output

    def test_workflow_list_json(self, tmp_path: Path):
        result = _run("workflow", "list", "--json", root=tmp_path)
        assert result.exit_code == 0

    def test_workflow_start_without_name(self, tmp_path: Path):
        result = _run("workflow", "start", root=tmp_path)
        assert result.exit_code != 0

    def test_workflow_start(self, tmp_path: Path):
        result = _run("workflow", "start", "--name", "test-wf", root=tmp_path)
        assert result.exit_code == 0

    def test_workflow_status_without_id(self, tmp_path: Path):
        result = _run("workflow", "status", root=tmp_path)
        assert result.exit_code != 0

    def test_workflow_status(self, tmp_path: Path):
        result = _run("workflow", "status", "--id", "wf-1", root=tmp_path)
        assert result.exit_code == 0

    def test_workflow_cancel_without_id(self, tmp_path: Path):
        result = _run("workflow", "cancel", root=tmp_path)
        assert result.exit_code != 0

    def test_workflow_cancel(self, tmp_path: Path):
        result = _run("workflow", "cancel", "--id", "wf-1", root=tmp_path)
        assert result.exit_code == 0

    def test_workflow_unknown_action(self, tmp_path: Path):
        result = _run("workflow", "bogus", root=tmp_path)
        assert result.exit_code != 0

    def test_workflow_help(self):
        result = _run("workflow", "--help")
        assert result.exit_code == 0


# ---------------------------------------------------------------------------
# Tools command
# ---------------------------------------------------------------------------


class TestToolsCommand:
    def test_tools_list(self, tmp_path: Path):
        result = _run("tools", "list", root=tmp_path)
        assert result.exit_code == 0
        assert "Tools" in result.output

    def test_tools_list_json(self, tmp_path: Path):
        result = _run("tools", "list", "--json", root=tmp_path)
        assert result.exit_code == 0

    def test_tools_inspect_without_tool(self, tmp_path: Path):
        result = _run("tools", "inspect", root=tmp_path)
        assert result.exit_code != 0

    def test_tools_inspect(self, tmp_path: Path):
        result = _run("tools", "inspect", "--tool", "shell", root=tmp_path)
        assert result.exit_code == 0

    def test_tools_run_without_tool(self, tmp_path: Path):
        result = _run("tools", "run", root=tmp_path)
        assert result.exit_code != 0

    def test_tools_run(self, tmp_path: Path):
        result = _run("tools", "run", "--tool", "shell", root=tmp_path)
        assert result.exit_code == 0

    def test_tools_run_invalid_json(self, tmp_path: Path):
        result = _run("tools", "run", "--tool", "shell", "--args", "not-json", root=tmp_path)
        assert result.exit_code != 0

    def test_tools_run_with_args(self, tmp_path: Path):
        result = _run("tools", "run", "--tool", "shell", "--args", '{"cmd": "ls"}', root=tmp_path)
        assert result.exit_code == 0

    def test_tools_permissions(self, tmp_path: Path):
        result = _run("tools", "permissions", root=tmp_path)
        assert result.exit_code == 0
        assert "read" in result.output

    def test_tools_permissions_json(self, tmp_path: Path):
        result = _run("tools", "permissions", "--json", root=tmp_path)
        assert result.exit_code == 0

    def test_tools_unknown_action(self, tmp_path: Path):
        result = _run("tools", "bogus", root=tmp_path)
        assert result.exit_code != 0

    def test_tools_help(self):
        result = _run("tools", "--help")
        assert result.exit_code == 0


# ---------------------------------------------------------------------------
# Plugins command
# ---------------------------------------------------------------------------


class TestPluginsCommand:
    def test_plugins_list(self, tmp_path: Path):
        result = _run("plugins", "list", root=tmp_path)
        assert result.exit_code == 0
        assert "Plugins" in result.output

    def test_plugins_list_json(self, tmp_path: Path):
        result = _run("plugins", "list", "--json", root=tmp_path)
        assert result.exit_code == 0

    def test_plugins_install_without_plugin(self, tmp_path: Path):
        result = _run("plugins", "install", root=tmp_path)
        assert result.exit_code != 0

    def test_plugins_install(self, tmp_path: Path):
        result = _run("plugins", "install", "--plugin", "test-plugin", root=tmp_path)
        assert result.exit_code == 0

    def test_plugins_uninstall(self, tmp_path: Path):
        result = _run("plugins", "uninstall", "--plugin", "test-plugin", root=tmp_path)
        assert result.exit_code == 0

    def test_plugins_enable(self, tmp_path: Path):
        result = _run("plugins", "enable", "--plugin", "test-plugin", root=tmp_path)
        assert result.exit_code == 0

    def test_plugins_disable(self, tmp_path: Path):
        result = _run("plugins", "disable", "--plugin", "test-plugin", root=tmp_path)
        assert result.exit_code == 0

    def test_plugins_info_without_plugin(self, tmp_path: Path):
        result = _run("plugins", "info", root=tmp_path)
        assert result.exit_code != 0

    def test_plugins_info(self, tmp_path: Path):
        result = _run("plugins", "info", "--plugin", "test-plugin", root=tmp_path)
        assert result.exit_code == 0

    def test_plugins_info_json(self, tmp_path: Path):
        result = _run("plugins", "info", "--plugin", "test-plugin", "--json", root=tmp_path)
        assert result.exit_code == 0

    def test_plugins_unknown_action(self, tmp_path: Path):
        result = _run("plugins", "bogus", root=tmp_path)
        assert result.exit_code != 0

    def test_plugins_help(self):
        result = _run("plugins", "--help")
        assert result.exit_code == 0


# ---------------------------------------------------------------------------
# Agent command
# ---------------------------------------------------------------------------


class TestAgentCommand:
    def test_agent_list(self, tmp_path: Path):
        result = _run("agent", "list", root=tmp_path)
        assert result.exit_code == 0
        assert "Agents" in result.output

    def test_agent_list_json(self, tmp_path: Path):
        result = _run("agent", "list", "--json", root=tmp_path)
        assert result.exit_code == 0

    def test_agent_create_without_name(self, tmp_path: Path):
        result = _run("agent", "create", root=tmp_path)
        assert result.exit_code != 0

    def test_agent_create(self, tmp_path: Path):
        result = _run("agent", "create", "--agent", "worker1", root=tmp_path)
        assert result.exit_code == 0

    def test_agent_create_with_type(self, tmp_path: Path):
        result = _run("agent", "create", "--agent", "super1", "--type", "supervisor", root=tmp_path)
        assert result.exit_code == 0

    def test_agent_status_without_name(self, tmp_path: Path):
        result = _run("agent", "status", root=tmp_path)
        assert result.exit_code != 0

    def test_agent_status(self, tmp_path: Path):
        result = _run("agent", "status", "--agent", "worker1", root=tmp_path)
        assert result.exit_code == 0

    def test_agent_status_verbose(self, tmp_path: Path):
        result = _run("agent", "status", "--agent", "worker1", "--verbose", root=tmp_path)
        assert result.exit_code == 0

    def test_agent_stop_without_name(self, tmp_path: Path):
        result = _run("agent", "stop", root=tmp_path)
        assert result.exit_code != 0

    def test_agent_stop(self, tmp_path: Path):
        result = _run("agent", "stop", "--agent", "worker1", root=tmp_path)
        assert result.exit_code == 0

    def test_agent_info_without_name(self, tmp_path: Path):
        result = _run("agent", "info", root=tmp_path)
        assert result.exit_code != 0

    def test_agent_info(self, tmp_path: Path):
        result = _run("agent", "info", "--agent", "worker1", root=tmp_path)
        assert result.exit_code == 0

    def test_agent_info_json(self, tmp_path: Path):
        result = _run("agent", "info", "--agent", "worker1", "--json", root=tmp_path)
        assert result.exit_code == 0

    def test_agent_unknown_action(self, tmp_path: Path):
        result = _run("agent", "bogus", root=tmp_path)
        assert result.exit_code != 0

    def test_agent_help(self):
        result = _run("agent", "--help")
        assert result.exit_code == 0


# ---------------------------------------------------------------------------
# Config command
# ---------------------------------------------------------------------------


class TestConfigCommand:
    def test_config_show(self, tmp_path: Path):
        result = _run("config", "show", root=tmp_path)
        assert result.exit_code == 0
        assert "Configuration" in result.output

    def test_config_show_json(self, tmp_path: Path):
        result = _run("config", "show", "--json", root=tmp_path)
        assert result.exit_code == 0

    def test_config_get_without_key(self, tmp_path: Path):
        result = _run("config", "get", root=tmp_path)
        assert result.exit_code != 0

    def test_config_get(self, tmp_path: Path):
        result = _run("config", "get", "--key", "mode", root=tmp_path)
        assert result.exit_code == 0

    def test_config_get_unknown_key(self, tmp_path: Path):
        result = _run("config", "get", "--key", "nonexistent", root=tmp_path)
        assert result.exit_code != 0

    def test_config_set_without_args(self, tmp_path: Path):
        result = _run("config", "set", root=tmp_path)
        assert result.exit_code != 0

    def test_config_set(self, tmp_path: Path):
        result = _run("config", "set", "--key", "mode", "--value", "production", root=tmp_path)
        assert result.exit_code == 0

    def test_config_set_unknown_key(self, tmp_path: Path):
        result = _run("config", "set", "--key", "nonexistent", "--value", "x", root=tmp_path)
        assert result.exit_code != 0

    def test_config_reset(self, tmp_path: Path):
        result = _run("config", "reset", root=tmp_path)
        assert result.exit_code == 0

    def test_config_validate(self, tmp_path: Path):
        result = _run("config", "validate", root=tmp_path)
        assert result.exit_code == 0
        assert "valid" in result.output.lower()

    def test_config_validate_verbose(self, tmp_path: Path):
        result = _run("config", "validate", "--verbose", root=tmp_path)
        assert result.exit_code == 0

    def test_config_validate_json(self, tmp_path: Path):
        result = _run("config", "validate", "--json", root=tmp_path)
        assert result.exit_code == 0

    def test_config_unknown_action(self, tmp_path: Path):
        result = _run("config", "bogus", root=tmp_path)
        assert result.exit_code != 0

    def test_config_help(self):
        result = _run("config", "--help")
        assert result.exit_code == 0


# ---------------------------------------------------------------------------
# Existing commands (smoke)
# ---------------------------------------------------------------------------


class TestExistingCommands:
    def test_health(self, tmp_path: Path):
        result = _run("health", root=tmp_path)
        assert result.exit_code == 0

    def test_validate(self, tmp_path: Path):
        result = _run("validate", root=tmp_path)
        assert result.exit_code == 0

    def test_memory_snapshot(self, tmp_path: Path):
        result = _run("memory", "snapshot", root=tmp_path)
        assert result.exit_code == 0

    def test_doctor(self, tmp_path: Path):
        result = _run("doctor", root=tmp_path)
        assert result.exit_code == 0

    def test_run_help(self):
        result = _run("run", "--help")
        assert result.exit_code == 0

    def test_execute_help(self):
        result = _run("execute", "--help")
        assert result.exit_code == 0

    def test_metrics_help(self):
        result = _run("metrics", "--help")
        assert result.exit_code == 0
