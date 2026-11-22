from datetime import datetime, timedelta, timezone
from typing import Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_tenant, get_current_user
from app.models.conversation import Conversation, ConversationStatus, Message
from app.models.lead import Lead
from app.models.tenant import Tenant
from app.models.unanswered import UnansweredQuestion
from app.models.usage import UsageRecord
from app.models.user import User
from app.schemas.analytics import AnalyticsSummaryResponse, TrendDataPoint

router = APIRouter(prefix="/analytics", tags=["Analytics & Usage"])

@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_analytics_summary(
    days: int = 30,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculate real analytics metrics from tenant database records."""
    since_date = datetime.now(timezone.utc) - timedelta(days=days)

    total_convs = (
        db.query(Conversation)
        .filter(Conversation.tenant_id == current_tenant.id, Conversation.created_at >= since_date)
        .count()
    )

    handoffs = (
        db.query(Conversation)
        .filter(
            Conversation.tenant_id == current_tenant.id,
            Conversation.created_at >= since_date,
            Conversation.status.in_([ConversationStatus.WITH_AGENT, ConversationStatus.WAITING_AGENT]),
        )
        .count()
    )

    ai_resolved = (
        db.query(Conversation)
        .filter(
            Conversation.tenant_id == current_tenant.id,
            Conversation.created_at >= since_date,
            Conversation.status.in_([ConversationStatus.BOT_ACTIVE, ConversationStatus.RESOLVED]),
        )
        .count()
    )

    resolution_rate = round((ai_resolved / total_convs * 100), 1) if total_convs > 0 else 100.0

    # Total messages
    total_msgs = (
        db.query(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .filter(Conversation.tenant_id == current_tenant.id, Message.created_at >= since_date)
        .count()
    )

    total_leads = (
        db.query(Lead)
        .filter(Lead.tenant_id == current_tenant.id, Lead.created_at >= since_date)
        .count()
    )

    unanswered_count = (
        db.query(UnansweredQuestion)
        .filter(UnansweredQuestion.tenant_id == current_tenant.id, UnansweredQuestion.created_at >= since_date)
        .count()
    )

    # Current month usage
    month_key = datetime.now(timezone.utc).strftime("%Y-%m")
    usage = (
        db.query(UsageRecord)
        .filter(UsageRecord.tenant_id == current_tenant.id, UsageRecord.month_year == month_key)
        .first()
    )
    month_msgs = usage.messages_count if usage else 0
    month_tokens = usage.ai_tokens_count if usage else 0
    est_cost = (usage.estimated_cost_cents / 100.0) if usage else 0.0

    # Channel breakdown
    website_count = (
        db.query(Conversation)
        .filter(Conversation.tenant_id == current_tenant.id, Conversation.channel == "website")
        .count()
    )
    whatsapp_count = (
        db.query(Conversation)
        .filter(Conversation.tenant_id == current_tenant.id, Conversation.channel == "whatsapp")
        .count()
    )

    # Daily trends for the last 7 days
    daily_trends = []
    for i in range(6, -1, -1):
        day_date = datetime.now(timezone.utc).date() - timedelta(days=i)
        day_start = datetime.combine(day_date, datetime.min.time(), tzinfo=timezone.utc)
        day_end = datetime.combine(day_date, datetime.max.time(), tzinfo=timezone.utc)

        c_count = (
            db.query(Conversation)
            .filter(Conversation.tenant_id == current_tenant.id, Conversation.created_at.between(day_start, day_end))
            .count()
        )
        m_count = (
            db.query(Message)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .filter(Conversation.tenant_id == current_tenant.id, Message.created_at.between(day_start, day_end))
            .count()
        )
        l_count = (
            db.query(Lead)
            .filter(Lead.tenant_id == current_tenant.id, Lead.created_at.between(day_start, day_end))
            .count()
        )
        daily_trends.append(
            TrendDataPoint(
                date=day_date.strftime("%b %d"),
                conversations=c_count,
                messages=m_count,
                leads=l_count,
            )
        )

    return AnalyticsSummaryResponse(
        total_conversations=total_convs,
        total_messages=total_msgs,
        ai_resolved_conversations=ai_resolved,
        human_handoffs=handoffs,
        bot_resolution_rate=resolution_rate,
        total_leads=total_leads,
        unanswered_questions_count=unanswered_count,
        current_month_messages=month_msgs,
        current_month_tokens=month_tokens,
        estimated_cost_usd=est_cost,
        channel_breakdown={"website": website_count, "whatsapp": whatsapp_count},
        daily_trends=daily_trends,
    )
