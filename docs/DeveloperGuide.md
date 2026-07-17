# MITRA AIOS Developer Guide

## Project Structure

```
Mitra3.0/
├── src/aios/                 # Main package
│   ├── api/                  # REST API & WebSocket
│   │   ├── app.py            # FastAPI application factory
│   │   ├── routes.py         # Main route definitions
│   │   ├── chat_routes.py    # /chat endpoints
│   │   ├── agent_routes.py   # /agents endpoints
│   │   ├── workflow_routes.py # /workflows endpoints
│   │   ├── memory_routes.py  # /memory endpoints
│   │   ├── rag_routes.py     # /rag endpoints
│   │   ├── tool_routes.py    # /tools endpoints
│   │   ├── plugin_routes.py  # /plugins endpoints
│   │   ├── embedding_routes.py # /embeddings endpoints
│   │   ├── vectorstore_routes.py # /vectorstores endpoints
│   │   ├── config_routes.py  # /config endpoints
│   │   ├── security_routes.py # /security endpoints
│   │   ├── websocket_routes.py # WebSocket endpoints
│   │   ├── websocket_manager.py # WebSocket connection manager
│   │   ├── pydantic_schemas.py # Pydantic v2 schemas
│   │   ├── auth.py           # Authentication hooks
│   │   ├── dependencies.py   # Dependency injection
│   │   ├── stack.py          # EOS stack factory
│   │   ├── manager.py        # API manager
│   │   ├── models.py         # API models
│   │   ├── schemas.py        # Legacy schemas
│   │   └── rate_limiter.py   # Rate limiting
│   ├── cli/                  # CLI commands (Typer)
│   ├── config/               # Configuration system
│   ├── core/                 # Core infrastructure
│   │   ├── config.py         # AIOSConfig
│   │   ├── exceptions.py     # Exception hierarchy
│   │   ├── logger.py         # Logging setup
│   │   └── types.py          # Type definitions
│   ├── memory/               # Memory subsystem
│   ├── llm/                  # LLM provider layer
│   ├── embedding/            # Embedding providers
│   ├── vectorstore/          # Vector store providers
│   ├── rag/                  # RAG engine
│   ├── tools/                # Tool execution
│   ├── agent/                # Agent system
│   ├── multiagent/           # Multi-agent coordination
│   ├── scheduler/            # Job scheduling
│   ├── plugins/              # Plugin system
│   ├── security/             # Security & auth
│   ├── events/               # Event bus
│   ├── observability/        # Metrics & monitoring
│   ├── context/              # Context builder
│   ├── intelligence/         # Decision engine
│   ├── state/                # State management
│   ├── eos/                  # EOS runtime components
│   └── orchestrator.py       # Main orchestrator
├── tests/                    # Test suite
├── docs/                     # Documentation
├── docker-compose.aios.yml   # Docker Compose
├── Dockerfile                # Container build
├── nginx.conf                # Reverse proxy config
├── pyproject.toml            # Project configuration
└── .env.example              # Environment template
```

## Development Setup

### Prerequisites

- Python 3.12+
- pip or uv
- Git

### Setup

```bash
git clone <repository-url>
cd Mitra3.0
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

### Code Quality

```bash
# Linting
ruff check src/ tests/

# Auto-fix
ruff check --fix src/ tests/

# Formatting
ruff format src/ tests/

# Type checking (if using mypy)
mypy src/aios/
```

### Testing

```bash
# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_api.py -v

# Run with coverage
pytest tests/ --cov=aios --cov-report=html

# Run tests matching pattern
pytest tests/ -k "test_chat" -v

# Run in parallel
pytest tests/ -n auto
```

## Architecture Patterns

### Manager Pattern

All major components follow the manager pattern:

```python
class ComponentManager:
    def __init__(self) -> None:
        self.logger = get_logger("aios.component.manager")
        self._lock = threading.Lock()
        self._initialized = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> ComponentManager:
        with self._lock:
            if self._initialized:
                return self
            # Initialize sub-components
            self._initialized = True
            self.logger.info("ComponentManager initialized")
        return self

    def validate(self) -> ValidationResult:
        self._require_initialized()
        result = ValidationResult()
        # Validate sub-components
        return result

    def reload(self) -> ComponentManager:
        with self._lock:
            self._initialized = False
        return self

    def shutdown(self) -> None:
        with self._lock:
            self._initialized = False

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise ComponentError("Not initialized")
```

### Exception Pattern

All exceptions inherit from `AIOSBaseError`:

```python
from aios.core.exceptions import AIOSBaseError

class ComponentError(AIOSBaseError):
    def __init__(
        self,
        message: str,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details)
```

### Route Pattern

```python
from fastapi import APIRouter, Depends, HTTPException
from aios.api.auth import get_current_user
from aios.api.dependencies import get_stack
from aios.api.pydantic_schemas import RequestModel, ResponseModel
from aios.api.stack import EOSStack

router = APIRouter(prefix="/component", tags=["component"])

@router.post(
    "/action",
    response_model=ResponseModel,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def action_endpoint(
    req: RequestModel,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> ResponseModel:
    if stack.component_manager is None:
        raise HTTPException(status_code=503, detail="Component not available")
    try:
        result = stack.component_manager.do_action(req.param)
        return ResponseModel(field=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Test Pattern

```python
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from aios.api.app import create_app
from aios.api.dependencies import reset_stack, set_stack
from aios.api.stack import EOSStack

@pytest.fixture
def mock_stack():
    stack = EOSStack()
    stack.component_manager = MagicMock()
    stack.component_manager.is_initialized = True
    set_stack(stack)
    yield stack
    reset_stack()

@pytest.fixture
def client(mock_stack):
    app = create_app()
    return TestClient(app)

class TestComponentEndpoint:
    def test_action(self, client, mock_stack):
        mock_stack.component_manager.do_action.return_value = "result"
        response = client.post("/api/v1/component/action", json={"param": "value"})
        assert response.status_code == 200
        data = response.json()
        assert data["field"] == "result"

    def test_action_error(self, client, mock_stack):
        mock_stack.component_manager.do_action.side_effect = Exception("error")
        response = client.post("/api/v1/component/action", json={"param": "value"})
        assert response.status_code == 500
```

## Adding New Components

### 1. Create Module

```python
# src/aios/newcomponent/manager.py
from aios.core.logger import get_logger

class NewComponentManager:
    def __init__(self) -> None:
        self.logger = get_logger("aios.newcomponent.manager")
        self._initialized = False

    def initialize(self) -> "NewComponentManager":
        self._initialized = True
        return self
```

### 2. Add to Stack

```python
# src/aios/api/stack.py
@dataclass(slots=True)
class EOSStack:
    # ... existing fields ...
    new_component: object | None = field(default=None)
```

### 3. Create Routes

```python
# src/aios/api/newcomponent_routes.py
router = APIRouter(prefix="/newcomponent", tags=["newcomponent"])
```

### 4. Register Routes

```python
# src/aios/api/routes.py
from aios.api.newcomponent_routes import router as newcomponent_router
router.include_router(newcomponent_router)
```

### 5. Create Schemas

```python
# src/aios/api/pydantic_schemas.py
class NewComponentRequest(BaseModel):
    param: str

class NewComponentResponse(BaseModel):
    result: str
```

### 6. Write Tests

```python
# tests/test_newcomponent.py
class TestNewComponent:
    def test_action(self, client, mock_stack):
        # ...
```

## Code Style

### Python

- Python 3.12+ features
- Type hints everywhere
- `from __future__ import annotations`
- Docstrings for public APIs
- f-strings for formatting
- `threading.Lock` for shared state
- `frozen=True` for dataclasses where possible

### Imports

```python
from __future__ import annotations

import asyncio
import time
from typing import Any

from fastapi import APIRouter, Depends

from aios.core.logger import get_logger
```

### Naming

- `snake_case` for variables and functions
- `PascalCase` for classes
- `UPPER_SNAKE_CASE` for constants
- Prefix private methods with `_`
- Prefix internal module methods with `_require_initialized`

## Debugging

### Common Issues

1. **Manager not initialized**: Call `initialize()` before using
2. **Import errors**: Check module structure and `__init__.py`
3. **Test failures**: Ensure mock_stack fixture is used
4. **Type errors**: Add proper type hints

### Logging

```python
from aios.core.logger import get_logger

logger = get_logger("aios.component")
logger.info("Component started")
logger.error("Error occurred", exc_info=True)
```
