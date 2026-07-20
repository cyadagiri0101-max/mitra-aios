"""CLI command implementations."""

from aios.cli.commands._stack import get_stack
from aios.cli.commands.agent import agent_cmd
from aios.cli.commands.chat import chat_cmd
from aios.cli.commands.checkpoint import checkpoint_cmd
from aios.cli.commands.config import config_cmd
from aios.cli.commands.context import context_cmd
from aios.cli.commands.decision import decision_cmd
from aios.cli.commands.doctor import doctor_cmd
from aios.cli.commands.execute import execute_cmd
from aios.cli.commands.health import health_cmd
from aios.cli.commands.index import index_cmd
from aios.cli.commands.memory import memory_cmd
from aios.cli.commands.metrics import metrics_cmd
from aios.cli.commands.plugins import plugins_cmd
from aios.cli.commands.recover import recover_cmd
from aios.cli.commands.report import report_cmd
from aios.cli.commands.run import run_cmd
from aios.cli.commands.scan import scan_cmd
from aios.cli.commands.state import state_cmd
from aios.cli.commands.tools import tools_cmd
from aios.cli.commands.validate import validate_cmd
from aios.cli.commands.workflow import workflow_cmd

__all__ = [
    "get_stack",
    "agent_cmd",
    "chat_cmd",
    "checkpoint_cmd",
    "config_cmd",
    "context_cmd",
    "decision_cmd",
    "doctor_cmd",
    "execute_cmd",
    "health_cmd",
    "index_cmd",
    "memory_cmd",
    "metrics_cmd",
    "plugins_cmd",
    "recover_cmd",
    "report_cmd",
    "run_cmd",
    "scan_cmd",
    "state_cmd",
    "tools_cmd",
    "validate_cmd",
    "workflow_cmd",
]
