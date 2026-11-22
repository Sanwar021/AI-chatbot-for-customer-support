import json
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_tenant, get_current_user, require_admin
from app.models.bot import Bot, BotSettings
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.bot import BotCreateRequest, BotResponse, BotUpdateRequest

router = APIRouter(prefix="/bots", tags=["Bot Management"])

@router.get("", response_model=List[BotResponse])
def list_bots(
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all chatbots belonging to the active tenant workspace."""
    bots = db.query(Bot).filter(Bot.tenant_id == current_tenant.id).order_by(Bot.created_at.desc()).all()
    res = []
    for b in bots:
        st = b.settings
        res.append(
            BotResponse(
                id=b.id,
                tenant_id=b.tenant_id,
                name=b.name,
                public_key=b.public_key,
                avatar_url=b.avatar_url,
                language=b.language,
                is_active=b.is_active,
                settings={
                    "system_prompt": st.system_prompt if st else "",
                    "welcome_message": st.welcome_message if st else "",
                    "fallback_message": st.fallback_message if st else "",
                    "primary_color": st.primary_color if st else "#087b6d",
                    "position": st.position if st else "bottom-right",
                    "suggested_questions": json.loads(st.suggested_questions) if st and st.suggested_questions else [],
                    "pre_chat_form_enabled": st.pre_chat_form_enabled if st else True,
                    "allowed_domains": st.allowed_domains if st else "*",
                    "confidence_threshold": st.confidence_threshold if st else "0.55",
                } if st else None,
                created_at=b.created_at.isoformat(),
            )
        )
    return res

@router.post("", response_model=BotResponse)
def create_bot(
    req: BotCreateRequest,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new chatbot with plan limit enforcement."""
    # Check plan limit
    max_bots = current_tenant.plan.max_bots if current_tenant.plan else 1
    existing_count = db.query(Bot).filter(Bot.tenant_id == current_tenant.id).count()
    if existing_count >= max_bots:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Plan limit reached. Your current plan allows maximum {max_bots} bots. Upgrade to add more.",
        )

    bot = Bot(
        tenant_id=current_tenant.id,
        name=req.name,
        avatar_url=req.avatar_url,
        language=req.language,
        is_active=True,
    )
    db.add(bot)
    db.flush()

    settings_input = req.settings
    questions = settings_input.suggested_questions if settings_input and settings_input.suggested_questions else [
        "What are your opening hours?",
        "What services do you provide?",
        "How can I book an appointment?",
    ]

    bot_settings = BotSettings(
        bot_id=bot.id,
        system_prompt=settings_input.system_prompt if settings_input else "You are a professional customer support assistant.",
        welcome_message=settings_input.welcome_message if settings_input and settings_input.welcome_message else "Hello! How can I help you today? | আসসালামু আলাইকুম! আমি কীভাবে সাহায্য করতে পারি?",
        fallback_message=settings_input.fallback_message if settings_input and settings_input.fallback_message else "I am sorry, but I do not have that specific information in my official records. Would you like me to connect you with a human agent?",
        primary_color=settings_input.primary_color if settings_input and settings_input.primary_color else "#087b6d",
        position=settings_input.position if settings_input and settings_input.position else "bottom-right",
        suggested_questions=json.dumps(questions),
        pre_chat_form_enabled=settings_input.pre_chat_form_enabled if settings_input else True,
        allowed_domains=settings_input.allowed_domains if settings_input and settings_input.allowed_domains else "*",
        confidence_threshold=settings_input.confidence_threshold if settings_input and settings_input.confidence_threshold else "0.55",
    )
    db.add(bot_settings)
    db.commit()
    db.refresh(bot)

    return BotResponse(
        id=bot.id,
        tenant_id=bot.tenant_id,
        name=bot.name,
        public_key=bot.public_key,
        avatar_url=bot.avatar_url,
        language=bot.language,
        is_active=bot.is_active,
        settings={
            "system_prompt": bot_settings.system_prompt,
            "welcome_message": bot_settings.welcome_message,
            "fallback_message": bot_settings.fallback_message,
            "primary_color": bot_settings.primary_color,
            "position": bot_settings.position,
            "suggested_questions": questions,
            "pre_chat_form_enabled": bot_settings.pre_chat_form_enabled,
            "allowed_domains": bot_settings.allowed_domains,
            "confidence_threshold": bot_settings.confidence_threshold,
        },
        created_at=bot.created_at.isoformat(),
    )

@router.get("/{bot_id}", response_model=BotResponse)
def get_bot(
    bot_id: str,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve specific bot details."""
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.tenant_id == current_tenant.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found.")

    st = bot.settings
    return BotResponse(
        id=bot.id,
        tenant_id=bot.tenant_id,
        name=bot.name,
        public_key=bot.public_key,
        avatar_url=bot.avatar_url,
        language=bot.language,
        is_active=bot.is_active,
        settings={
            "system_prompt": st.system_prompt if st else "",
            "welcome_message": st.welcome_message if st else "",
            "fallback_message": st.fallback_message if st else "",
            "primary_color": st.primary_color if st else "#087b6d",
            "position": st.position if st else "bottom-right",
            "suggested_questions": json.loads(st.suggested_questions) if st and st.suggested_questions else [],
            "pre_chat_form_enabled": st.pre_chat_form_enabled if st else True,
            "allowed_domains": st.allowed_domains if st else "*",
            "confidence_threshold": st.confidence_threshold if st else "0.55",
        } if st else None,
        created_at=bot.created_at.isoformat(),
    )

@router.put("/{bot_id}", response_model=BotResponse)
def update_bot(
    bot_id: str,
    req: BotUpdateRequest,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update chatbot metadata and configuration settings."""
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.tenant_id == current_tenant.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found.")

    if req.name is not None:
        bot.name = req.name
    if req.avatar_url is not None:
        bot.avatar_url = req.avatar_url
    if req.language is not None:
        bot.language = req.language
    if req.is_active is not None:
        bot.is_active = req.is_active

    if req.settings:
        st = bot.settings
        if not st:
            st = BotSettings(bot_id=bot.id)
            db.add(st)
        if req.settings.system_prompt is not None:
            st.system_prompt = req.settings.system_prompt
        if req.settings.welcome_message is not None:
            st.welcome_message = req.settings.welcome_message
        if req.settings.fallback_message is not None:
            st.fallback_message = req.settings.fallback_message
        if req.settings.primary_color is not None:
            st.primary_color = req.settings.primary_color
        if req.settings.position is not None:
            st.position = req.settings.position
        if req.settings.suggested_questions is not None:
            st.suggested_questions = json.dumps(req.settings.suggested_questions)
        if req.settings.pre_chat_form_enabled is not None:
            st.pre_chat_form_enabled = req.settings.pre_chat_form_enabled
        if req.settings.allowed_domains is not None:
            st.allowed_domains = req.settings.allowed_domains
        if req.settings.confidence_threshold is not None:
            st.confidence_threshold = req.settings.confidence_threshold

    bot.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(bot)

    st = bot.settings
    return BotResponse(
        id=bot.id,
        tenant_id=bot.tenant_id,
        name=bot.name,
        public_key=bot.public_key,
        avatar_url=bot.avatar_url,
        language=bot.language,
        is_active=bot.is_active,
        settings={
            "system_prompt": st.system_prompt if st else "",
            "welcome_message": st.welcome_message if st else "",
            "fallback_message": st.fallback_message if st else "",
            "primary_color": st.primary_color if st else "#087b6d",
            "position": st.position if st else "bottom-right",
            "suggested_questions": json.loads(st.suggested_questions) if st and st.suggested_questions else [],
            "pre_chat_form_enabled": st.pre_chat_form_enabled if st else True,
            "allowed_domains": st.allowed_domains if st else "*",
            "confidence_threshold": st.confidence_threshold if st else "0.55",
        } if st else None,
        created_at=bot.created_at.isoformat(),
    )

@router.delete("/{bot_id}")
def delete_bot(
    bot_id: str,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a bot and all associated data."""
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.tenant_id == current_tenant.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found.")

    db.delete(bot)
    db.commit()
    return {"message": "Bot deleted successfully."}
