# app/core/websockets.py
import json
from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # Mapeo: user_id -> lista de WebSockets activos (permite múltiples pestañas/dispositivos)
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            for connection in list(self.active_connections[user_id]):
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    self.disconnect(user_id, connection)


manager = ConnectionManager()