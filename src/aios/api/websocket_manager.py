"""WebSocket connection manager for real-time updates."""

from __future__ import annotations

import asyncio
import time
from collections import defaultdict
from typing import Any

from fastapi import WebSocket
from starlette.websockets import WebSocketState

from aios.core.logger import get_logger

logger = get_logger("aios.api.websocket_manager")


class ConnectionManager:
    """Manages WebSocket connections and broadcasts."""

    def __init__(self) -> None:
        self._active_connections: dict[str, WebSocket] = {}
        self._subscriptions: dict[str, set[str]] = defaultdict(set)
        self._lock = asyncio.Lock()
        self._message_queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._running = False
        self._broadcast_task: asyncio.Task | None = None

    async def connect(self, client_id: str, websocket: WebSocket) -> None:
        """Accept and register a WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            self._active_connections[client_id] = websocket
            logger.info("Client connected: %s (total: %d)", client_id, len(self._active_connections))

    async def disconnect(self, client_id: str) -> None:
        """Remove a WebSocket connection."""
        async with self._lock:
            if client_id in self._active_connections:
                del self._active_connections[client_id]
            if client_id in self._subscriptions:
                del self._subscriptions[client_id]
            logger.info("Client disconnected: %s (total: %d)", client_id, len(self._active_connections))

    async def subscribe(self, client_id: str, channels: list[str]) -> None:
        """Subscribe client to specific channels."""
        async with self._lock:
            self._subscriptions[client_id].update(channels)
            logger.debug("Client %s subscribed to: %s", client_id, channels)

    async def unsubscribe(self, client_id: str, channels: list[str]) -> None:
        """Unsubscribe client from channels."""
        async with self._lock:
            for channel in channels:
                self._subscriptions[client_id].discard(channel)
            logger.debug("Client %s unsubscribed from: %s", client_id, channels)

    async def send_personal(self, client_id: str, message: dict[str, Any]) -> bool:
        """Send message to specific client."""
        async with self._lock:
            websocket = self._active_connections.get(client_id)
            if websocket and websocket.client_state == WebSocketState.CONNECTED:
                try:
                    await websocket.send_json(message)
                    return True
                except Exception as e:
                    logger.error("Failed to send to %s: %s", client_id, e)
                    return False
            return False

    async def broadcast(self, channel: str, message: dict[str, Any]) -> int:
        """Broadcast message to all subscribers of a channel."""
        sent_count = 0
        async with self._lock:
            for client_id, websocket in list(self._active_connections.items()):
                if channel in self._subscriptions.get(client_id, set()) or "*" in self._subscriptions.get(client_id, set()):
                    if websocket.client_state == WebSocketState.CONNECTED:
                        try:
                            await websocket.send_json({
                                "channel": channel,
                                "timestamp": time.time(),
                                "data": message,
                            })
                            sent_count += 1
                        except Exception as e:
                            logger.error("Broadcast failed to %s: %s", client_id, e)
        return sent_count

    async def broadcast_all(self, message: dict[str, Any]) -> int:
        """Broadcast message to all connected clients."""
        sent_count = 0
        async with self._lock:
            for client_id, websocket in list(self._active_connections.items()):
                if websocket.client_state == WebSocketState.CONNECTED:
                    try:
                        await websocket.send_json({
                            "timestamp": time.time(),
                            "data": message,
                        })
                        sent_count += 1
                    except Exception as e:
                        logger.error("Broadcast all failed to %s: %s", client_id, e)
        return sent_count

    def get_active_connections(self) -> list[str]:
        """Get list of active client IDs."""
        return list(self._active_connections.keys())

    def get_subscriptions(self, client_id: str) -> list[str]:
        """Get subscriptions for a client."""
        return list(self._subscriptions.get(client_id, set()))

    async def start(self) -> None:
        """Start the broadcast worker."""
        self._running = True
        self._broadcast_task = asyncio.create_task(self._broadcast_worker())
        logger.info("WebSocket manager started")

    async def stop(self) -> None:
        """Stop the broadcast worker."""
        self._running = False
        if self._broadcast_task:
            self._broadcast_task.cancel()
            try:
                await self._broadcast_task
            except asyncio.CancelledError:
                pass
        logger.info("WebSocket manager stopped")

    async def _broadcast_worker(self) -> None:
        """Background worker for queued broadcasts."""
        while self._running:
            try:
                message = await asyncio.wait_for(self._message_queue.get(), timeout=1.0)
                channel = message.get("channel", "default")
                await self.broadcast(channel, message.get("data", {}))
            except TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Broadcast worker error: %s", e)

    async def queue_broadcast(self, channel: str, data: dict[str, Any]) -> None:
        """Queue a message for broadcast."""
        await self._message_queue.put({"channel": channel, "data": data})


manager = ConnectionManager()
