from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_tenant, get_current_user, require_owner
from app.models.bot import Bot
from app.models.tenant import Plan, Subscription, Tenant
from app.models.usage import UsageRecord
from app.models.user import User
from app.schemas.billing import PlanResponse, UpgradePlanRequest, UsageStatusResponse

router = APIRouter(prefix="/billing", tags=["Subscription & Usage"])

@router.get("/plans", response_model=List[PlanResponse])
def get_available_plans(db: Session = Depends(get_db)):
    """List SaaS subscription pricing plans."""
    plans = db.query(Plan).all()
    if not plans:
        # Seed default plans if empty
        p1 = Plan(name="Basic", max_bots=1, max_messages_per_month=1000, whatsapp_allowed=False, price_cents=1900)
        p2 = Plan(name="Pro", max_bots=3, max_messages_per_month=10000, whatsapp_allowed=True, price_cents=4900)
        p3 = Plan(name="Business", max_bots=999, max_messages_per_month=50000, whatsapp_allowed=True, price_cents=14900)
        db.add_all([p1, p2, p3])
        db.commit()
        plans = [p1, p2, p3]

    return [
        PlanResponse(
            id=p.id,
            name=p.name,
            max_bots=p.max_bots,
            max_messages_per_month=p.max_messages_per_month,
            whatsapp_allowed=p.whatsapp_allowed,
            price_cents=p.price_cents,
        )
        for p in plans
    ]

@router.get("/status", response_model=UsageStatusResponse)
def get_usage_status(
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve active plan limits, current monthly consumption, and remaining quota."""
    plan = current_tenant.plan
    if not plan:
        plan = db.query(Plan).filter(Plan.name == "Pro").first()

    month_key = datetime.now(timezone.utc).strftime("%Y-%m")
    usage = (
        db.query(UsageRecord)
        .filter(UsageRecord.tenant_id == current_tenant.id, UsageRecord.month_year == month_key)
        .first()
    )

    current_msgs = usage.messages_count if usage else 0
    current_tokens = usage.ai_tokens_count if usage else 0
    cost_usd = (usage.estimated_cost_cents / 100.0) if usage else 0.0

    max_msgs = plan.max_messages_per_month if plan else 1000
    usage_pct = min(100.0, round((current_msgs / max_msgs) * 100.0, 1)) if max_msgs > 0 else 0.0

    bots_count = db.query(Bot).filter(Bot.tenant_id == current_tenant.id).count()

    sub = db.query(Subscription).filter(Subscription.tenant_id == current_tenant.id).first()
    sub_status = sub.status if sub else "active"

    return UsageStatusResponse(
        plan_name=plan.name if plan else "Pro",
        max_bots=plan.max_bots if plan else 3,
        current_bots=bots_count,
        max_messages_per_month=max_msgs,
        current_month_messages=current_msgs,
        usage_percentage=usage_pct,
        current_month_tokens=current_tokens,
        estimated_cost_usd=cost_usd,
        whatsapp_allowed=plan.whatsapp_allowed if plan else True,
        billing_status=sub_status,
    )

@router.post("/upgrade")
def upgrade_plan(
    req: UpgradePlanRequest,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    """Upgrade or switch subscription plan."""
    target_plan = db.query(Plan).filter(Plan.name == req.plan_name).first()
    if not target_plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    current_tenant.plan_id = target_plan.id

    sub = db.query(Subscription).filter(Subscription.tenant_id == current_tenant.id).first()
    if not sub:
        sub = Subscription(tenant_id=current_tenant.id, plan_id=target_plan.id, status="active")
        db.add(sub)
    else:
        sub.plan_id = target_plan.id
        sub.status = "active"

    db.commit()
    return {"message": f"Successfully upgraded workspace to {target_plan.name} plan.", "plan": target_plan.name}
