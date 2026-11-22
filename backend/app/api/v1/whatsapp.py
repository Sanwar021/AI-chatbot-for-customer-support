from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_tenant, get_current_user, require_admin
from app.core.security import encrypt_secret
from app.integrations.whatsapp import WhatsAppService
from app.models.bot import Bot
from app.models.channel import WhatsAppIntegration
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.whatsapp import MockWebhookMessageRequest, WhatsAppConfigResponse, WhatsAppConfigUpdateRequest

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Cloud API"])

@router.get("/webhook")
def verify_meta_webhook(
    mode: Optional[str] = Query(None, alias="hub.mode"),
    verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    challenge: Optional[str] = Query(None, alias="hub.challenge"),
    db: Session = Depends(get_db),
):
    """
    Official Meta Cloud API Webhook Verification Endpoint.
    Validates hub.verify_token against configured system or tenant verify tokens.
    """
    if not mode or not verify_token:
        raise HTTPException(status_code=400, detail="Missing verification parameters.")

    # Check global token or tenant token
    matched = (verify_token == settings.WHATSAPP_VERIFY_TOKEN)
    if not matched:
        tenant_int = db.query(WhatsAppIntegration).filter(WhatsAppIntegration.verify_token == verify_token).first()
        if tenant_int:
            matched = True
            tenant_int.webhook_verified = True
            db.commit()

    if matched and mode == "subscribe":
        return Response(content=challenge or "", media_type="text/plain")

    raise HTTPException(status_code=403, detail="Verification token mismatch.")

@router.post("/webhook")
async def receive_meta_webhook(
    request: Request,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256"),
    db: Session = Depends(get_db),
):
    """
    Official Meta Cloud API Webhook Receiver.
    Validates HMAC signature and dispatches incoming messages to RAG engine.
    """
    raw_body = await request.body()

    # Optional signature validation if secret is configured
    if settings.WHATSAPP_APP_SECRET and x_hub_signature_256:
        valid = WhatsAppService.verify_signature(raw_body, x_hub_signature_256, settings.WHATSAPP_APP_SECRET)
        if not valid:
            raise HTTPException(status_code=403, detail="Invalid webhook signature.")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    await WhatsAppService.process_incoming_webhook(db=db, payload=payload)
    return {"status": "EVENT_RECEIVED"}

@router.get("/config", response_model=Optional[WhatsAppConfigResponse])
def get_whatsapp_config(
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve tenant WhatsApp configuration."""
    integration = db.query(WhatsAppIntegration).filter(WhatsAppIntegration.tenant_id == current_tenant.id).first()
    if not integration:
        return None

    webhook_url = f"{settings.PUBLIC_BASE_URL}/api/v1/whatsapp/webhook"
    return WhatsAppConfigResponse(
        id=integration.id,
        bot_id=integration.bot_id,
        phone_number_id=integration.phone_number_id,
        waba_id=integration.waba_id,
        display_phone_number=integration.display_phone_number,
        is_active=integration.is_active,
        webhook_verified=integration.webhook_verified,
        webhook_url=webhook_url,
        verify_token=integration.verify_token,
    )

@router.post("/config", response_model=WhatsAppConfigResponse)
def save_whatsapp_config(
    req: WhatsAppConfigUpdateRequest,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Save or update WhatsApp Cloud API credentials with encryption at rest."""
    bot = db.query(Bot).filter(Bot.id == req.bot_id, Bot.tenant_id == current_tenant.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found.")

    integration = db.query(WhatsAppIntegration).filter(WhatsAppIntegration.tenant_id == current_tenant.id).first()
    if not integration:
        integration = WhatsAppIntegration(
            tenant_id=current_tenant.id,
            bot_id=bot.id,
            phone_number_id=req.phone_number_id.strip(),
            waba_id=req.waba_id.strip() if req.waba_id else None,
            encrypted_access_token=encrypt_secret(req.access_token.strip()),
            verify_token=req.verify_token.strip(),
            display_phone_number=req.display_phone_number,
            is_active=req.is_active,
        )
        db.add(integration)
    else:
        integration.bot_id = bot.id
        integration.phone_number_id = req.phone_number_id.strip()
        if req.waba_id:
            integration.waba_id = req.waba_id.strip()
        if req.access_token:
            integration.encrypted_access_token = encrypt_secret(req.access_token.strip())
        integration.verify_token = req.verify_token.strip()
        integration.display_phone_number = req.display_phone_number
        integration.is_active = req.is_active
        integration.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(integration)

    return WhatsAppConfigResponse(
        id=integration.id,
        bot_id=integration.bot_id,
        phone_number_id=integration.phone_number_id,
        waba_id=integration.waba_id,
        display_phone_number=integration.display_phone_number,
        is_active=integration.is_active,
        webhook_verified=integration.webhook_verified,
        webhook_url=f"{settings.PUBLIC_BASE_URL}/api/v1/whatsapp/webhook",
        verify_token=integration.verify_token,
    )

@router.post("/test-mock")
async def test_mock_incoming_message(
    req: MockWebhookMessageRequest,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Simulate incoming Meta Cloud API WhatsApp message for testing without real Meta account."""
    integration = db.query(WhatsAppIntegration).filter(WhatsAppIntegration.tenant_id == current_tenant.id).first()
    if not integration:
        raise HTTPException(
            status_code=400,
            detail="Please configure WhatsApp credentials first (you can use dummy values in development).",
        )

    # Form standard Meta Cloud API webhook payload
    mock_payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": integration.waba_id or "WHATSAPP_BUSINESS_ACCOUNT_ID",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": integration.display_phone_number or "15551234567",
                                "phone_number_id": integration.phone_number_id,
                            },
                            "contacts": [
                                {
                                    "profile": {"name": req.sender_name},
                                    "wa_id": req.sender_phone,
                                }
                            ],
                            "messages": [
                                {
                                    "from": req.sender_phone,
                                    "id": f"wamid.{int(datetime.now(timezone.utc).timestamp())}",
                                    "timestamp": str(int(datetime.now(timezone.utc).timestamp())),
                                    "text": {"body": req.message_text},
                                    "type": "text",
                                }
                            ],
                        },
                        "field": "messages",
                    }
                ],
            }
        ],
    }

    result = await WhatsAppService.process_incoming_webhook(db=db, payload=mock_payload)
    return {
        "status": "success",
        "detail": "Mock WhatsApp message processed through RAG engine.",
        "payload_received": result,
    }
