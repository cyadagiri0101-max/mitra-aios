"""Validation engine for tool requests and responses."""

from __future__ import annotations

import threading

from aios.core.logger import get_logger
from aios.tools.models import (
    ToolDefinition,
    ToolRequest,
    ToolResponse,
    ToolValidationResult,
)


class ValidationEngine:
    def __init__(self) -> None:
        self.logger = get_logger("aios.tools.validation")
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> ValidationEngine:
        self._initialized = True
        self.logger.info("ValidationEngine initialized")
        return self

    def validate_request(self, request: ToolRequest, definition: ToolDefinition) -> ToolValidationResult:
        self._require_initialized()
        result = ToolValidationResult()
        if not request.tool_name:
            result.errors.append("Tool name is required")
            result.is_valid = False
        if request.tool_name != definition.name:
            result.errors.append(f"Tool name mismatch: '{request.tool_name}' != '{definition.name}'")
            result.is_valid = False
        for param in definition.parameters:
            if param.required and param.name not in request.arguments:
                result.errors.append(f"Missing required parameter: '{param.name}'")
                result.is_valid = False
        if request.timeout <= 0:
            result.errors.append("Timeout must be positive")
            result.is_valid = False
        return result

    def validate_response(self, response: ToolResponse) -> ToolValidationResult:
        self._require_initialized()
        result = ToolValidationResult()
        if response.execution_time < 0:
            result.errors.append("Execution time cannot be negative")
            result.is_valid = False
        return result

    def validate_definition(self, definition: ToolDefinition) -> ToolValidationResult:
        self._require_initialized()
        result = ToolValidationResult()
        if not definition.name:
            result.errors.append("Tool definition name is required")
            result.is_valid = False
        if definition.timeout <= 0:
            result.errors.append("Tool timeout must be positive")
            result.is_valid = False
        return result

    def validate(self) -> ToolValidationResult:
        return ToolValidationResult()

    def reload(self) -> ValidationEngine:
        self.logger.info("Reloading ValidationEngine")
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            from aios.core.exceptions import ToolError
            raise ToolError("ValidationEngine has not been initialized")
