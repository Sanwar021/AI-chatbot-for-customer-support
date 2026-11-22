from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.v1.websocket import inbox_ws_manager
from app.core.database import get_db
from app.core.dependencies import get_current_tenant, get_current_user, require_agent
from app.integrations.whatsapp import WhatsAppService
from app.models.channel import WhatsAppIntegration
from app.models.conversation import Conversation, ConversationStatus, Message, MessageSenderType
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.conversation import (
    AgentReplyRequest,
    AssignAgentRequest,
    ConversationResponse,
    MessageResponse,
)

router = APIRouter(prefix="/conversations", tags=["Conversations & Live Inbox"])

@router.get("", response_model=List[ConversationResponse])
def list_conversations(
    status_filter: Optional[str] = Query(None, alias="status"),
    channel: Optional[str] = None,
    bot_id: Optional[str] = None,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List tenant conversations with status, channel, and bot filters."""
    query = db.query(Conversation).filter(Conversation.tenant_id == current_tenant.id)

    if status_filter:
        query = query.filter(Conversation.status == status_filter)
    if channel:
        query = query.filter(Conversation.channel == channel)
    if bot_id:
        query = query.filter(Conversation.bot_id == bot_id)

    convs = query.order_by(Conversation.updated_at.desc()).all()
    res = []
    for c in convs:
        last_msg = db.query(Message).filter(Message.conversation_id == c.id).order_by(Message.created_at.desc()).first()
        count = db.query(Message).filter(Message.conversation_id == c.id).count()
        res.append(
            ConversationResponse(
                id=c.id,
                tenant_id=c.tenant_id,
                bot_id=c.bot_id,
                channel=c.channel,
                customer_id=c.customer_id,
                customer_name=c.customer_name or "Anonymous Visitor",
                customer_email=c.customer_email,
                customer_phone=c.customer_phone,
                status=c.status,
                assigned_agent_id=c.assigned_agent_id,
                created_at=c.created_at.isoformat(),
                updated_at=c.updated_at.isoformat(),
                messages_count=count,
                last_message=last_msg.content if last_msg else None,
            )
        )
    return res

@router.get("/{conv_id}/messages", response_model=List[MessageResponse])
def get_conversation_messages(
    conv_id: str,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all messages in a conversation turn-by-turn."""
    conv = db.query(Conversation).filter(Conversation.id == conv_id, Conversation.tenant_id == current_tenant.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    messages = db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.created_at.asc()).all()
    return [
        MessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_type=m.sender_type,
            sender_id=m.sender_id,
            content=m.content,
            sources=m.sources,
            created_at=m.created_at.isoformat(),
        )
        for m in messages
    ]

@router.post("/{conv_id}/reply")
async def send_agent_reply(
    conv_id: str,
    req: AgentReplyRequest,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db),
):
    """Human agent replies to customer. Dispatches to WhatsApp API if WhatsApp channel."""
    conv = db.query(Conversation).filter(Conversation.id == conv_id, Conversation.tenant_id == current_tenant.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    msg = Message(
        conversation_id=conv.id,
        sender_type=MessageSenderType.AGENT,
        sender_id=current_user.id,
        content=req.content.strip(),
    )
    db.add(msg)
    conv.updated_at = datetime.now(timezone.utc)
    conv.status = ConversationStatus.WITH_AGENT
    if not conv.assigned_agent_id:
        conv.assigned_agent_id = current_user.id
    db.commit()
    db.refresh(msg)

    # If WhatsApp, send out via Meta API
    if conv.channel == "whatsapp" and conv.customer_phone:
        integration = db.query(WhatsAppIntegration).filter(WhatsAppIntegration.tenant_id == current_tenant.id).first()
        if integration:
            await WhatsAppService.send_whatsapp_message(
                db=db,
                integration=integration,
                to_phone=conv.customer_phone,
                text=req.content.strip(),
            )

    # Real-time WebSocket broadcast
    await inbox_ws_manager.broadcast_to_tenant(
        current_tenant.id,
        {
            "event": "agent_reply",
            "conversation_id": conv.id,
            "message_id": msg.id,
            "agent_name": current_user.full_name,
            "content": req.content.strip(),
        },
    )

    return {"message_id": msg.id, "status": "sent"}

@router.post("/{conv_id}/assign")
async def assign_conversation(
    conv_id: str,
    req: Optional[AssignAgentRequest] = None,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db),
):
    """Assign conversation to an agent (defaults to current agent) and transition to WITH_AGENT."""
    conv = db.query(Conversation).filter(Conversation.id == conv_id, Conversation.tenant_id == current_tenant.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    target_agent_id = req.agent_id if req and req.agent_id else current_user.id
    conv.assigned_agent_id = target_agent_id
    conv.status = ConversationStatus.WITH_AGENT
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()

    await inbox_ws_manager.broadcast_to_tenant(
        current_tenant.id,
        {
            "event": "conversation_assigned",
            "conversation_id": conv.id,
            "agent_id": target_agent_id,
            "status": conv.status,
        },
    )
    return {"status": conv.status, "assigned_agent_id": target_agent_id}

@router.post("/{conv_id}/return-to-bot")
async def return_to_bot(
    conv_id: str,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db),
):
    """Release conversation back to automated AI bot processing."""
    conv = db.query(Conversation).filter(Conversation.id == conv_id, Conversation.tenant_id == current_tenant.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    conv.status = ConversationStatus.BOT_ACTIVE
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()

    await inbox_ws_manager.broadcast_to_tenant(
        current_tenant.id,
        {
            "event": "conversation_returned_to_bot",
            "conversation_id": conv.id,
            "status": conv.status,
        },
    )
    return {"status": conv.status}

@router.post("/{conv_id}/resolve")
async def resolve_conversation(
    conv_id: str,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db),
):
    """Mark customer conversation as resolved."""
    conv = db.query(Conversation).filter(Conversation.id == conv_id, Conversation.tenant_id == current_tenant.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    conv.status = ConversationStatus.RESOLVED
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()

    await inbox_ws_manager.broadcast_to_tenant(
        current_tenant.id,
        {
            "event": "conversation_resolved",
            "conversation_id": conv.id,
            "status": conv.status,
        },
    )
    return {"status": conv.status}
