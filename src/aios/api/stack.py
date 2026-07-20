"""EOS stack factory — wires together all EOS layers."""

from __future__ import annotations

import importlib
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Any

from aios.core.config import AIOSConfig, load_config
from aios.core.logger import get_logger
from aios.eos.agent_integration import AgentExecutor, ToolRegistry
from aios.eos.capability_discovery import CapabilityDiscovery
from aios.eos.context_builder import EOSContextBuilder
from aios.eos.decision_engine import EOSDecisionEngine
from aios.eos.event_bus import EventBus
from aios.eos.knowledge_service import KnowledgeService
from aios.eos.loader import EOSLoader
from aios.eos.observability import ObservabilityConsumer
from aios.eos.persistence import PersistenceStore
from aios.eos.registry import RegistryManager
from aios.eos.runtime_engine import RuntimeEngine
from aios.eos.workflow_engine import WorkflowEngine

if TYPE_CHECKING:
    from aios.agent.agent_manager import AgentManager
    from aios.config.manager import ConfigManager
    from aios.embedding.manager import EmbeddingManager
    from aios.llm.manager import LLMManager
    from aios.memory.memory_manager import MemoryManager
    from aios.multiagent.coordinator import Coordinator
    from aios.plugins.manager import PluginManager
    from aios.rag.manager import RAGManager
    from aios.scheduler.manager import Scheduler
    from aios.security.manager import SecurityManager
    from aios.tools.manager import ToolManager
    from aios.vectorstore.manager import VectorStoreManager


@dataclass(slots=True)
class EOSStack:
    config: AIOSConfig | None = None
    loader: EOSLoader | None = None
    registry: RegistryManager | None = None
    capability_discovery: CapabilityDiscovery | None = None
    knowledge_service: KnowledgeService | None = None
    context_builder: EOSContextBuilder | None = None
    decision_engine: EOSDecisionEngine | None = None
    workflow_engine: WorkflowEngine | None = None
    runtime_engine: RuntimeEngine | None = None
    event_bus: EventBus | None = None
    observability: ObservabilityConsumer | None = None
    persistence: PersistenceStore | None = None
    tool_registry: ToolRegistry | None = None
    agent_executor: AgentExecutor | None = None
    memory_manager: MemoryManager | None = None
    llm_manager: LLMManager | None = None
    embedding_manager: EmbeddingManager | None = None
    vectorstore_manager: VectorStoreManager | None = None
    rag_manager: RAGManager | None = None
    tool_manager: ToolManager | None = None
    agent_manager: AgentManager | None = None
    multiagent_coordinator: Coordinator | None = None
    plugin_manager: PluginManager | None = None
    config_manager: ConfigManager | None = None
    security_manager: SecurityManager | None = None
    scheduler: Scheduler | None = None

    @property
    def is_initialized(self) -> bool:
        return self.event_bus is not None and self.event_bus.is_initialized


def _ensure_eos_tree(eos_root: Path) -> None:
    """Create the minimal EOS directory structure if it does not exist."""
    from aios.eos.loader import REQUIRED_DIRECTORIES, REQUIRED_KERNEL_FILES

    eos_root.mkdir(parents=True, exist_ok=True)
    for dirname in REQUIRED_DIRECTORIES:
        (eos_root / dirname).mkdir(parents=True, exist_ok=True)
    kernel_dir = eos_root / "kernel"
    kernel_dir.mkdir(parents=True, exist_ok=True)
    for fname in REQUIRED_KERNEL_FILES:
        fpath = kernel_dir / fname
        if not fpath.exists():
            fpath.write_text(f"# {fname}\n")


def create_stack(
    eos_path: str | Path | None = None,
    db_path: str | Path | None = None,
    repo_root: str | Path | None = None,
) -> EOSStack:
    stack = EOSStack()

    root = Path(repo_root) if repo_root else Path.cwd()
    config = load_config(root)
    stack.config = config

    eos_root = Path(eos_path) if eos_path else root / ".ai"

    _ensure_eos_tree(eos_root)

    stack.loader = EOSLoader(config)
    try:
        stack.loader.initialize()
    except Exception as exc:
        msg = f"Failed to initialize EOS tree at {eos_root}: {exc}"
        raise RuntimeError(msg) from exc

    stack.registry = RegistryManager()
    stack.registry.initialize(stack.loader)

    stack.capability_discovery = CapabilityDiscovery()
    stack.capability_discovery.initialize(stack.registry)

    stack.knowledge_service = KnowledgeService()
    stack.knowledge_service.initialize(stack.capability_discovery)

    stack.context_builder = EOSContextBuilder()
    stack.context_builder.initialize(stack.knowledge_service)

    stack.decision_engine = EOSDecisionEngine()
    stack.decision_engine.initialize(stack.context_builder)

    stack.workflow_engine = WorkflowEngine()
    stack.workflow_engine.initialize(stack.decision_engine)

    stack.runtime_engine = RuntimeEngine()
    stack.runtime_engine.initialize(stack.workflow_engine)

    stack.event_bus = EventBus()
    stack.event_bus.initialize(stack.runtime_engine)

    stack.observability = ObservabilityConsumer()
    stack.observability.initialize(stack.event_bus)

    if db_path:
        stack.persistence = PersistenceStore(db_path)
    else:
        stack.persistence = PersistenceStore()
    stack.persistence.initialize()

    stack.tool_registry = ToolRegistry()

    stack.agent_executor = AgentExecutor(
        stack.workflow_engine, stack.tool_registry,
    )
    stack.agent_executor.initialize()

    _initialize_optional_managers(stack, eos_root=eos_root)

    return stack


_OPTIONAL_MANAGER_IMPORTS: dict[str, type | None] = {}


def _init_single_manager(
    stack: EOSStack,
    attr: str,
    module_path: str,
    class_name: str,
    init_kwargs: dict[str, Any] | None = None,
) -> None:
    """Initialize a single optional manager with proper error handling.

    ImportError → logged at WARNING (expected for optional components).
    Other errors → logged at ERROR with full traceback.
    """
    logger = get_logger("aios.api.stack")

    if module_path not in _OPTIONAL_MANAGER_IMPORTS:
        try:
            module = importlib.import_module(module_path)
            _OPTIONAL_MANAGER_IMPORTS[module_path] = getattr(module, class_name)
        except ImportError:
            _OPTIONAL_MANAGER_IMPORTS[module_path] = None
            return

    cls = _OPTIONAL_MANAGER_IMPORTS[module_path]
    if cls is None:
        return

    try:
        instance = cls(**(init_kwargs or {}))
        instance.initialize()
        setattr(stack, attr, instance)
        logger.info("Initialized %s from %s.%s", attr, module_path, class_name)
        if hasattr(instance, "validate"):
            try:
                instance.validate()
            except Exception:
                logger.warning("%s.validate() failed (non-fatal)", attr)
    except Exception as exc:
        logger.error("Failed to initialize %s (%s.%s): %s", attr, module_path, class_name, exc, exc_info=True)


def _initialize_optional_managers(stack: EOSStack, eos_root: Path | None = None) -> None:
    """Initialize optional managers with proper error handling."""
    snapshot_dir = (eos_root / "runtime" / "snapshots") if eos_root else None
    managers = [
        ("memory_manager", "aios.memory.memory_manager", "MemoryManager",
         {"snapshot_dir": str(snapshot_dir)} if snapshot_dir else None),
        ("llm_manager", "aios.llm.manager", "LLMManager", None),
        ("embedding_manager", "aios.embedding.manager", "EmbeddingManager", None),
        ("vectorstore_manager", "aios.vectorstore.manager", "VectorStoreManager", None),
        ("rag_manager", "aios.rag.manager", "RAGManager", None),
        ("tool_manager", "aios.tools.manager", "ToolManager", None),
        ("agent_manager", "aios.agent.agent_manager", "AgentManager", None),
        ("multiagent_coordinator", "aios.multiagent.coordinator", "Coordinator", None),
        ("plugin_manager", "aios.plugins.manager", "PluginManager", None),
        ("config_manager", "aios.config.manager", "ConfigManager", None),
        ("security_manager", "aios.security.manager", "SecurityManager", None),
        ("scheduler", "aios.scheduler.manager", "Scheduler", None),
    ]
    for attr, module_path, class_name, init_kwargs in managers:
        _init_single_manager(stack, attr, module_path, class_name, init_kwargs)
