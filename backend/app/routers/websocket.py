from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import asyncio

router = APIRouter(tags=["WebSocket Updates"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[SAARTHI WS] Client connected. Total active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"[SAARTHI WS] Client disconnected. Total active connections: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        disconnected = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"[SAARTHI WS WARN] Error sending to websocket: {e}")
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

ws_manager = ConnectionManager()

def broadcast_sync(message: Dict[str, Any]):
    try:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(ws_manager.broadcast(message))
        except RuntimeError:
            asyncio.run(ws_manager.broadcast(message))
    except Exception as e:
        print(f"[SAARTHI WS BROADCAST WARN]: {e}")

@router.websocket("/ws/updates")
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            print(f"[SAARTHI WS RECV]: {data}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"[SAARTHI WS ERR]: {e}")
        ws_manager.disconnect(websocket)
