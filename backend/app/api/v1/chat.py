import json
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.bot import Bot
from app.models.conversation import Conversation, ConversationFeedback, ConversationStatus, Message, MessageSenderType
from app.models.lead import Lead
from app.rag.engine import RAGEngine
from app.schemas.chat import (
    ChatInitRequest,
    ChatInitResponse,
    ChatMessageResponse,
    FeedbackRequest,
    HandoffRequest,
    SendMessageRequest,
)

router = APIRouter(prefix="/chat", tags=["Public Chat & Widget"])

@router.post("/init", response_model=ChatInitResponse)
def init_chat_session(req: ChatInitRequest, db: Session = Depends(get_db)):
    """Initialize a customer chat session from website widget or playground."""
    bot = db.query(Bot).filter(Bot.public_key == req.bot_key, Bot.is_active.is_(True)).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found or inactive.")

    customer_id = req.customer_id or f"cust_{uuid.uuid4().hex[:12]}"
    settings = bot.settings

    # Create new conversation session
    conv = Conversation(
        tenant_id=bot.tenant_id,
        bot_id=bot.id,
        channel="website",
        customer_id=customer_id,
        customer_name=req.customer_name,
        customer_email=req.customer_email,
        customer_phone=req.customer_phone,
        status=ConversationStatus.BOT_ACTIVE,
    )
    db.add(conv)

    # If pre-chat contact info is provided, automatically record as Lead
    if req.customer_email or req.customer_phone or req.customer_name:
        lead = Lead(
            tenant_id=bot.tenant_id,
            bot_id=bot.id,
            conversation_id=conv.id,
            name=req.customer_name,
            email=req.customer_email,
            phone=req.customer_phone,
            source="pre_chat_form",
        )
        db.add(lead)

    db.commit()
    db.refresh(conv)

    suggested = []
    if settings and settings.suggested_questions:
        try:
            suggested = json.loads(settings.suggested_questions)
        except Exception:
            suggested = []

    return ChatInitResponse(
        conversation_id=conv.id,
        customer_id=customer_id,
        bot_name=bot.name,
        welcome_message=settings.welcome_message if settings else "Hello! How can I help you today?",
        primary_color=settings.primary_color if settings else "#087b6d",
        position=settings.position if settings else "bottom-right",
        suggested_questions=suggested,
        pre_chat_form_enabled=settings.pre_chat_form_enabled if settings else True,
        status=conv.status,
    )

@router.post("/message", response_model=ChatMessageResponse)
async def send_chat_message(req: SendMessageRequest, db: Session = Depends(get_db)):
    """Send customer message and receive grounded AI answer with citations."""
    bot = db.query(Bot).filter(Bot.public_key == req.bot_key, Bot.is_active.is_(True)).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or inactive.")

    conv = (
        db.query(Conversation)
        .filter(Conversation.id == req.conversation_id, Conversation.tenant_id == bot.tenant_id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation session not found.")

    # If conversation is currently assigned to a human agent, record message and pause bot
    if conv.status == ConversationStatus.WITH_AGENT:
        customer_msg = Message(
            conversation_id=conv.id,
            sender_type=MessageSenderType.CUSTOMER,
            sender_id=req.customer_id or "customer",
            content=req.query,
        )
        db.add(customer_msg)
        db.commit()

        # Notify via live inbox
        from app.api.v1.websocket import inbox_ws_manager
        await inbox_ws_manager.broadcast_to_tenant(
            bot.tenant_id,
            {
                "event": "new_customer_message",
                "conversation_id": conv.id,
                "content": req.query,
                "sender_type": "customer",
            },
        )

        return ChatMessageResponse(
            message_id=customer_msg.id,
            text="Your message has been received by your support agent. Please hold on.",
            sources=[],
            is_fallback=False,
            provider="agent_pending",
        )

    # Run RAG Engine
    result = await RAGEngine.process_query(
        db=db,
        tenant_id=bot.tenant_id,
        bot_id=bot.id,
        conversation_id=conv.id,
        query=req.query,
        customer_id=req.customer_id,
    )

    return ChatMessageResponse(
        message_id=result["message_id"],
        text=result["text"],
        sources=result["sources"],
        is_fallback=result["is_fallback"],
        provider=result["provider"],
    )

@router.get("/stream")
async def stream_chat_message(
    bot_key: str = Query(...),
    conversation_id: str = Query(...),
    query: str = Query(...),
    customer_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Server-Sent Events (SSE) streaming endpoint for live typed AI answers."""
    bot = db.query(Bot).filter(Bot.public_key == bot_key, Bot.is_active.is_(True)).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found.")

    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.tenant_id == bot.tenant_id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    async def event_generator():
        async for chunk in RAGEngine.stream_query(
            db=db,
            tenant_id=bot.tenant_id,
            bot_id=bot.id,
            conversation_id=conv.id,
            query=query,
            customer_id=customer_id,
        ):
            yield f"data: {chunk}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/handoff")
async def request_handoff(req: HandoffRequest, db: Session = Depends(get_db)):
    """Customer-initiated human handoff trigger."""
    conv = db.query(Conversation).filter(Conversation.id == req.conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    conv.status = ConversationStatus.WAITING_AGENT
    sys_msg = Message(
        conversation_id=conv.id,
        sender_type=MessageSenderType.SYSTEM,
        content=f"Human handoff requested: {req.reason}",
    )
    db.add(sys_msg)
    db.commit()

    # Broadcast handoff alert to Live Inbox
    from app.api.v1.websocket import inbox_ws_manager
    await inbox_ws_manager.broadcast_to_tenant(
        conv.tenant_id,
        {
            "event": "handoff_requested",
            "conversation_id": conv.id,
            "customer_name": conv.customer_name or "Website Visitor",
            "reason": req.reason,
        },
    )

    return {
        "status": "waiting_agent",
        "message": "A human customer support specialist has been alerted and will join shortly.",
    }

@router.post("/feedback")
def submit_feedback(req: FeedbackRequest, db: Session = Depends(get_db)):
    """Save customer CSAT feedback and rating."""
    conv = db.query(Conversation).filter(Conversation.id == req.conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    feedback = ConversationFeedback(
        conversation_id=conv.id,
        rating=req.rating,
        comment=req.comment,
    )
    db.add(feedback)
    db.commit()
    return {"message": "Thank you for your feedback!"}
