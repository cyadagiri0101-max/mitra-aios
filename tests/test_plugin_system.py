"""Tests for AIOS Plugin System."""

from __future__ import annotations

import pytest

from aios.core.exceptions import PluginError
from aios.plugins.lifecycle import LifecycleManager
from aios.plugins.loader import PluginLoader
from aios.plugins.manager import PluginManager
from aios.plugins.models import (
    PluginInfo,
    PluginMetadata,
    PluginStatistics,
    PluginStatus,
    PluginValidationResult,
)
from aios.plugins.registry import PluginRegistry
from aios.plugins.validator import PluginValidator

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class TestModels:
    def test_plugin_metadata_creation(self):
        metadata = PluginMetadata(
            name="test-plugin",
            version="1.0.0",
            description="Test plugin",
            author="Test Author",
            entry_point="test_module",
        )
        assert metadata.name == "test-plugin"
        assert metadata.version == "1.0.0"
        assert metadata.description == "Test plugin"
        assert metadata.author == "Test Author"
        assert metadata.entry_point == "test_module"

    def test_plugin_info_creation(self):
        metadata = PluginMetadata(name="test", version="1.0.0")
        info = PluginInfo(
            metadata=metadata,
            status=PluginStatus.ENABLED,
            installed_at=1000.0,
            enabled_at=2000.0,
        )
        assert info.metadata == metadata
        assert info.status == PluginStatus.ENABLED
        assert info.installed_at == 1000.0
        assert info.enabled_at == 2000.0

    def test_plugin_statistics_creation(self):
        stats = PluginStatistics(
            total_plugins=10,
            enabled_plugins=7,
            disabled_plugins=2,
            error_plugins=1,
        )
        assert stats.total_plugins == 10
        assert stats.enabled_plugins == 7
        assert stats.disabled_plugins == 2
        assert stats.error_plugins == 1

    def test_plugin_validation_result_creation(self):
        result = PluginValidationResult(
            is_valid=False,
            warnings=["Warning 1"],
            errors=["Error 1"],
        )
        assert result.is_valid is False
        assert result.warnings == ["Warning 1"]
        assert result.errors == ["Error 1"]

    def test_plugin_status_enum(self):
        assert PluginStatus.INSTALLED.value == "installed"
        assert PluginStatus.ENABLED.value == "enabled"
        assert PluginStatus.DISABLED.value == "disabled"
        assert PluginStatus.ERROR.value == "error"
        assert PluginStatus.UNINSTALLED.value == "uninstalled"


# ---------------------------------------------------------------------------
# PluginValidator
# ---------------------------------------------------------------------------


class TestPluginValidator:
    def test_initialize(self):
        validator = PluginValidator()
        assert validator.is_initialized is False
        validator.initialize()
        assert validator.is_initialized is True

    def test_validate_metadata_valid(self):
        validator = PluginValidator().initialize()
        metadata = PluginMetadata(
            name="test-plugin",
            version="1.0.0",
            entry_point="test_module",
        )
        result = validator.validate_metadata(metadata)
        assert result.is_valid is True

    def test_validate_metadata_missing_name(self):
        validator = PluginValidator().initialize()
        metadata = PluginMetadata(version="1.0.0")
        result = validator.validate_metadata(metadata)
        assert result.is_valid is False
        assert any("name" in error.lower() for error in result.errors)

    def test_validate_metadata_invalid_name(self):
        validator = PluginValidator().initialize()
        metadata = PluginMetadata(
            name="invalid name!",
            version="1.0.0",
        )
        result = validator.validate_metadata(metadata)
        assert result.is_valid is False

    def test_validate_metadata_missing_version(self):
        validator = PluginValidator().initialize()
        metadata = PluginMetadata(name="test-plugin")
        result = validator.validate_metadata(metadata)
        assert result.is_valid is False
        assert any("version" in error.lower() for error in result.errors)

    def test_validate_dependencies_all_present(self):
        validator = PluginValidator().initialize()
        dependencies = ("dep1", "dep2")
        available = ["dep1", "dep2", "dep3"]
        result = validator.validate_dependencies(dependencies, available)
        assert result.is_valid is True

    def test_validate_dependencies_missing(self):
        validator = PluginValidator().initialize()
        dependencies = ("dep1", "dep2")
        available = ["dep1"]
        result = validator.validate_dependencies(dependencies, available)
        assert result.is_valid is False
        assert any("dep2" in error for error in result.errors)

    def test_validate_version_constraint_exact(self):
        validator = PluginValidator().initialize()
        assert validator.validate_version_constraint("1.0.0", "==1.0.0") is True
        assert validator.validate_version_constraint("1.0.1", "==1.0.0") is False

    def test_validate_version_constraint_gte(self):
        validator = PluginValidator().initialize()
        assert validator.validate_version_constraint("1.0.0", ">=1.0.0") is True
        assert validator.validate_version_constraint("1.0.1", ">=1.0.0") is True
        assert validator.validate_version_constraint("0.9.9", ">=1.0.0") is False

    def test_validate_version_constraint_lte(self):
        validator = PluginValidator().initialize()
        assert validator.validate_version_constraint("1.0.0", "<=1.0.0") is True
        assert validator.validate_version_constraint("0.9.9", "<=1.0.0") is True
        assert validator.validate_version_constraint("1.0.1", "<=1.0.0") is False

    def test_validate(self):
        validator = PluginValidator().initialize()
        result = validator.validate()
        assert isinstance(result, PluginValidationResult)

    def test_reload(self):
        validator = PluginValidator().initialize()
        validator.reload()
        assert validator.is_initialized is True

    def test_uninitialized_raises(self):
        validator = PluginValidator()
        with pytest.raises(PluginError):
            validator.validate_metadata(PluginMetadata())


# ---------------------------------------------------------------------------
# PluginLoader
# ---------------------------------------------------------------------------


class TestPluginLoader:
    def test_initialize(self):
        loader = PluginLoader()
        assert loader.is_initialized is False
        loader.initialize()
        assert loader.is_initialized is True

    def test_load_plugin_no_entry_point(self):
        loader = PluginLoader().initialize()
        metadata = PluginMetadata(name="test")
        with pytest.raises(PluginError):
            loader.load_plugin(metadata)

    def test_load_plugin_import_error(self):
        loader = PluginLoader().initialize()
        metadata = PluginMetadata(
            name="test",
            entry_point="nonexistent_module_xyz",
        )
        with pytest.raises(PluginError):
            loader.load_plugin(metadata)

    def test_is_loaded(self):
        loader = PluginLoader().initialize()
        assert loader.is_loaded("test") is False

    def test_list_loaded(self):
        loader = PluginLoader().initialize()
        assert loader.list_loaded() == []

    def test_unload_plugin_not_loaded(self):
        loader = PluginLoader().initialize()
        assert loader.unload_plugin("test") is False

    def test_validate(self):
        loader = PluginLoader().initialize()
        result = loader.validate()
        assert isinstance(result, PluginValidationResult)

    def test_reload(self):
        loader = PluginLoader().initialize()
        loader.reload()
        assert loader.is_initialized is True

    def test_uninitialized_raises(self):
        loader = PluginLoader()
        with pytest.raises(PluginError):
            loader.is_loaded("test")


# ---------------------------------------------------------------------------
# PluginRegistry
# ---------------------------------------------------------------------------


class TestPluginRegistry:
    def test_initialize(self):
        registry = PluginRegistry()
        assert registry.is_initialized is False
        registry.initialize()
        assert registry.is_initialized is True

    def test_register_plugin(self):
        registry = PluginRegistry().initialize()
        metadata = PluginMetadata(name="test", version="1.0.0")
        info = registry.register(metadata)
        assert info.metadata.name == "test"
        assert info.status == PluginStatus.INSTALLED

    def test_register_duplicate_raises(self):
        registry = PluginRegistry().initialize()
        metadata = PluginMetadata(name="test", version="1.0.0")
        registry.register(metadata)
        with pytest.raises(PluginError):
            registry.register(metadata)

    def test_unregister_plugin(self):
        registry = PluginRegistry().initialize()
        metadata = PluginMetadata(name="test", version="1.0.0")
        registry.register(metadata)
        assert registry.unregister("test") is True
        assert registry.get("test") is None

    def test_unregister_nonexistent(self):
        registry = PluginRegistry().initialize()
        assert registry.unregister("nonexistent") is False

    def test_get_plugin(self):
        registry = PluginRegistry().initialize()
        metadata = PluginMetadata(name="test", version="1.0.0")
        registry.register(metadata)
        info = registry.get("test")
        assert info is not None
        assert info.metadata.name == "test"

    def test_update_status(self):
        registry = PluginRegistry().initialize()
        metadata = PluginMetadata(name="test", version="1.0.0")
        registry.register(metadata)
        assert registry.update_status("test", PluginStatus.ENABLED) is True
        info = registry.get("test")
        assert info.status == PluginStatus.ENABLED

    def test_update_status_nonexistent(self):
        registry = PluginRegistry().initialize()
        assert registry.update_status("nonexistent", PluginStatus.ENABLED) is False

    def test_list_all(self):
        registry = PluginRegistry().initialize()
        registry.register(PluginMetadata(name="test1", version="1.0.0"))
        registry.register(PluginMetadata(name="test2", version="1.0.0"))
        assert len(registry.list()) == 2

    def test_list_by_status(self):
        registry = PluginRegistry().initialize()
        registry.register(PluginMetadata(name="test1", version="1.0.0"))
        registry.register(PluginMetadata(name="test2", version="1.0.0"))
        registry.update_status("test1", PluginStatus.ENABLED)
        enabled = registry.list(PluginStatus.ENABLED)
        assert len(enabled) == 1
        assert "test1" in enabled

    def test_count_all(self):
        registry = PluginRegistry().initialize()
        registry.register(PluginMetadata(name="test1", version="1.0.0"))
        registry.register(PluginMetadata(name="test2", version="1.0.0"))
        assert registry.count() == 2

    def test_count_by_status(self):
        registry = PluginRegistry().initialize()
        registry.register(PluginMetadata(name="test1", version="1.0.0"))
        registry.register(PluginMetadata(name="test2", version="1.0.0"))
        registry.update_status("test1", PluginStatus.ENABLED)
        assert registry.count(PluginStatus.ENABLED) == 1
        assert registry.count(PluginStatus.INSTALLED) == 1

    def test_validate(self):
        registry = PluginRegistry().initialize()
        result = registry.validate()
        assert isinstance(result, PluginValidationResult)

    def test_reload(self):
        registry = PluginRegistry().initialize()
        registry.register(PluginMetadata(name="test", version="1.0.0"))
        registry.reload()
        assert registry.count() == 0

    def test_uninitialized_raises(self):
        registry = PluginRegistry()
        with pytest.raises(PluginError):
            registry.register(PluginMetadata(name="test", version="1.0.0"))


# ---------------------------------------------------------------------------
# LifecycleManager
# ---------------------------------------------------------------------------


class TestLifecycleManager:
    def test_initialize(self):
        registry = PluginRegistry().initialize()
        loader = PluginLoader().initialize()
        validator = PluginValidator().initialize()
        lifecycle = LifecycleManager(registry, loader, validator)
        assert lifecycle.is_initialized is False
        lifecycle.initialize()
        assert lifecycle.is_initialized is True

    def test_install_plugin(self):
        registry = PluginRegistry().initialize()
        loader = PluginLoader().initialize()
        validator = PluginValidator().initialize()
        lifecycle = LifecycleManager(registry, loader, validator).initialize()

        metadata = PluginMetadata(name="test", version="1.0.0")
        assert lifecycle.install(metadata) is True
        assert registry.get("test") is not None

    def test_install_invalid_metadata(self):
        registry = PluginRegistry().initialize()
        loader = PluginLoader().initialize()
        validator = PluginValidator().initialize()
        lifecycle = LifecycleManager(registry, loader, validator).initialize()

        metadata = PluginMetadata()  # Missing name and version
        with pytest.raises(PluginError):
            lifecycle.install(metadata)

    def test_uninstall_plugin(self):
        registry = PluginRegistry().initialize()
        loader = PluginLoader().initialize()
        validator = PluginValidator().initialize()
        lifecycle = LifecycleManager(registry, loader, validator).initialize()

        metadata = PluginMetadata(name="test", version="1.0.0")
        lifecycle.install(metadata)
        assert lifecycle.uninstall("test") is True
        assert registry.get("test") is None

    def test_uninstall_nonexistent(self):
        registry = PluginRegistry().initialize()
        loader = PluginLoader().initialize()
        validator = PluginValidator().initialize()
        lifecycle = LifecycleManager(registry, loader, validator).initialize()

        assert lifecycle.uninstall("nonexistent") is False

    def test_enable_plugin_no_entry_point(self):
        registry = PluginRegistry().initialize()
        loader = PluginLoader().initialize()
        validator = PluginValidator().initialize()
        lifecycle = LifecycleManager(registry, loader, validator).initialize()

        metadata = PluginMetadata(name="test", version="1.0.0")
        lifecycle.install(metadata)
        with pytest.raises(PluginError):
            lifecycle.enable("test")

    def test_disable_plugin(self):
        registry = PluginRegistry().initialize()
        loader = PluginLoader().initialize()
        validator = PluginValidator().initialize()
        lifecycle = LifecycleManager(registry, loader, validator).initialize()

        metadata = PluginMetadata(name="test", version="1.0.0")
        lifecycle.install(metadata)
        assert lifecycle.disable("test") is True
        info = registry.get("test")
        assert info.status == PluginStatus.DISABLED

    def test_disable_nonexistent(self):
        registry = PluginRegistry().initialize()
        loader = PluginLoader().initialize()
        validator = PluginValidator().initialize()
        lifecycle = LifecycleManager(registry, loader, validator).initialize()

        assert lifecycle.disable("nonexistent") is False

    def test_validate(self):
        registry = PluginRegistry().initialize()
        loader = PluginLoader().initialize()
        validator = PluginValidator().initialize()
        lifecycle = LifecycleManager(registry, loader, validator).initialize()

        result = lifecycle.validate()
        assert isinstance(result, PluginValidationResult)

    def test_reload(self):
        registry = PluginRegistry().initialize()
        loader = PluginLoader().initialize()
        validator = PluginValidator().initialize()
        lifecycle = LifecycleManager(registry, loader, validator).initialize()

        lifecycle.reload()
        assert lifecycle.is_initialized is True

    def test_uninitialized_raises(self):
        registry = PluginRegistry().initialize()
        loader = PluginLoader().initialize()
        validator = PluginValidator().initialize()
        lifecycle = LifecycleManager(registry, loader, validator)

        with pytest.raises(PluginError):
            lifecycle.install(PluginMetadata(name="test", version="1.0.0"))


# ---------------------------------------------------------------------------
# PluginManager
# ---------------------------------------------------------------------------


class TestPluginManager:
    def test_initialize(self):
        manager = PluginManager()
        assert manager.is_initialized is False
        manager.initialize()
        assert manager.is_initialized is True

    def test_double_initialize(self):
        manager = PluginManager().initialize()
        manager.initialize()
        assert manager.is_initialized is True

    def test_install_plugin(self):
        manager = PluginManager().initialize()
        metadata = PluginMetadata(name="test", version="1.0.0")
        assert manager.install_plugin(metadata) is True

    def test_uninstall_plugin(self):
        manager = PluginManager().initialize()
        metadata = PluginMetadata(name="test", version="1.0.0")
        manager.install_plugin(metadata)
        assert manager.uninstall_plugin("test") is True

    def test_get_plugin(self):
        manager = PluginManager().initialize()
        metadata = PluginMetadata(name="test", version="1.0.0")
        manager.install_plugin(metadata)
        info = manager.get_plugin("test")
        assert info is not None
        assert info.metadata.name == "test"

    def test_list_plugins(self):
        manager = PluginManager().initialize()
        manager.install_plugin(PluginMetadata(name="test1", version="1.0.0"))
        manager.install_plugin(PluginMetadata(name="test2", version="1.0.0"))
        plugins = manager.list_plugins()
        assert len(plugins) == 2

    def test_get_statistics(self):
        manager = PluginManager().initialize()
        manager.install_plugin(PluginMetadata(name="test1", version="1.0.0"))
        manager.install_plugin(PluginMetadata(name="test2", version="1.0.0"))
        stats = manager.get_statistics()
        assert isinstance(stats, PluginStatistics)
        assert stats.total_plugins == 2

    def test_validate(self):
        manager = PluginManager().initialize()
        result = manager.validate()
        assert isinstance(result, PluginValidationResult)

    def test_reload(self):
        manager = PluginManager().initialize()
        manager.install_plugin(PluginMetadata(name="test", version="1.0.0"))
        manager.reload()
        assert manager.is_initialized is False

    def test_shutdown(self):
        manager = PluginManager().initialize()
        manager.install_plugin(PluginMetadata(name="test", version="1.0.0"))
        manager.shutdown()
        assert manager.is_initialized is False

    def test_uninitialized_raises(self):
        manager = PluginManager()
        with pytest.raises(PluginError):
            manager.install_plugin(PluginMetadata(name="test", version="1.0.0"))

    def test_components_accessible(self):
        manager = PluginManager().initialize()
        assert manager.registry is not None
        assert manager.loader is not None
        assert manager.validator is not None
        assert manager.lifecycle is not None


# ---------------------------------------------------------------------------
# Integration
# ---------------------------------------------------------------------------


class TestIntegration:
    def test_full_plugin_workflow(self):
        manager = PluginManager().initialize()

        # Install plugin
        metadata = PluginMetadata(
            name="test-plugin",
            version="1.0.0",
            description="Test plugin",
            author="Test Author",
        )
        assert manager.install_plugin(metadata) is True

        # Get plugin info
        info = manager.get_plugin("test-plugin")
        assert info is not None
        assert info.status == PluginStatus.INSTALLED

        # List plugins
        plugins = manager.list_plugins()
        assert "test-plugin" in plugins

        # Get statistics
        stats = manager.get_statistics()
        assert stats.total_plugins == 1

        # Validate
        validation = manager.validate()
        assert validation.is_valid is True

        # Uninstall
        assert manager.uninstall_plugin("test-plugin") is True
        assert manager.get_plugin("test-plugin") is None

        manager.shutdown()
