"""AIOS FastAPI application factory."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from aios.api.routes import router
from aios.api.websocket_manager import manager
from aios.api.websocket_routes import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    await manager.start()
    yield
    await manager.stop()


def create_app(
    title: str = "AIOS API",
    version: str = "1.1.0",
    eos_path: str | Path | None = None,
    db_path: str | Path | None = None,
) -> FastAPI:
    app = FastAPI(title=title, version=version, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router, prefix="/api/v1")
    app.include_router(ws_router, prefix="/api/v1")

    return app
