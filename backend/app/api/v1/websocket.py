import json
import logging
from typing import Dict, List, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import decode_token
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Real-time Live Inbox"])

class InboxConnectionManager:
    """Manages active WebSocket connections for Live Inbox agents, scoped by tenant."""

    def __init__(self):
        # Maps tenant_id -> set of active WebSocket instances
        self.tenant_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, tenant_id: str):
        await websocket.accept()
        if tenant_id not in self.tenant_connections:
            self.tenant_connections[tenant_id] = set()
        self.tenant_connections[tenant_id].add(websocket)
        logger.info(f"Agent connected to Live Inbox. Tenant: {tenant_id}. Total active: {len(self.tenant_connections[tenant_id])}")

    def disconnect(self, websocket: WebSocket, tenant_id: str):
        if tenant_id in self.tenant_connections:
            self.tenant_connections[tenant_id].discard(websocket)
            if not self.tenant_connections[tenant_id]:
                del self.tenant_connections[tenant_id]
        logger.info(f"Agent disconnected from Live Inbox. Tenant: {tenant_id}")

    async def broadcast_to_tenant(self, tenant_id: str, message: dict):
        """Broadcast an event strictly to agents in this tenant."""
        if tenant_id in self.tenant_connections:
            payload = json.dumps(message)
            dead_sockets = []
            for ws in list(self.tenant_connections[tenant_id]):
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead_sockets.append(ws)

            for dead in dead_sockets:
                self.tenant_connections[tenant_id].discard(dead)

inbox_ws_manager = InboxConnectionManager()

@router.websocket("/ws/live-inbox")
async def live_inbox_websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for agents to monitor conversations, accept handoffs, and receive customer replies.
    Token is passed via query param ?token=<jwt_access_token>.
    """
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return

    db: Session = SessionLocal()
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
        if not user:
            await websocket.close(code=4001, reason="User unauthorized")
            return
        tenant_id = user.tenant_id
    except Exception:
        await websocket.close(code=4001, reason="Invalid token")
        return
    finally:
        db.close()

    await inbox_ws_manager.connect(websocket, tenant_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming agent pings or broadcast echoes
            try:
                parsed = json.loads(data)
                action = parsed.get("action")
                if action == "ping":
                    await websocket.send_text(json.dumps({"event": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        inbox_ws_manager.disconnect(websocket, tenant_id)
