from fastapi import APIRouter
from app.api.v1.analytics import router as analytics_router
from app.api.v1.auth import router as auth_router
from app.api.v1.bots import router as bots_router
from app.api.v1.chat import router as chat_router
from app.api.v1.conversations import router as conversations_router
from app.api.v1.knowledge import router as knowledge_router
from app.api.v1.leads import router as leads_router
from app.api.v1.orders import router as orders_router
from app.api.v1.settings import router as settings_router
from app.api.v1.superadmin import router as superadmin_router
from app.api.v1.team import router as team_router
from app.api.v1.unanswered import router as unanswered_router
from app.api.v1.usage import router as usage_router
from app.api.v1.websocket import router as ws_router
from app.api.v1.whatsapp import router as whatsapp_router

api_v1_router = APIRouter(prefix="/v1")

api_v1_router.include_router(auth_router)
api_v1_router.include_router(bots_router)
api_v1_router.include_router(knowledge_router)
api_v1_router.include_router(chat_router)
api_v1_router.include_router(conversations_router)
api_v1_router.include_router(leads_router)
api_v1_router.include_router(unanswered_router)
api_v1_router.include_router(analytics_router)
api_v1_router.include_router(team_router)
api_v1_router.include_router(usage_router)
api_v1_router.include_router(whatsapp_router)
api_v1_router.include_router(orders_router)
api_v1_router.include_router(superadmin_router)
api_v1_router.include_router(settings_router)
api_v1_router.include_router(ws_router)
