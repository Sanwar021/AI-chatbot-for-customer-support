from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_superadmin
from app.models.audit import AuditLog
from app.models.bot import Bot
from app.models.conversation import Conversation
from app.models.tenant import Plan, Tenant
from app.models.usage import UsageRecord
from app.models.user import User

router = APIRouter(prefix="/superadmin", tags=["Super Admin Panel"])

@router.get("/metrics")
def get_superadmin_metrics(
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Platform-wide system metrics for Super Admin."""
    tenants_count = db.query(Tenant).count()
    users_count = db.query(User).count()
    bots_count = db.query(Bot).count()
    convs_count = db.query(Conversation).count()

    total_msgs = db.query(func.sum(UsageRecord.messages_count)).scalar() or 0
    total_tokens = db.query(func.sum(UsageRecord.ai_tokens_count)).scalar() or 0
    total_cost_cents = db.query(func.sum(UsageRecord.estimated_cost_cents)).scalar() or 0

    return {
        "total_tenants": tenants_count,
        "total_users": users_count,
        "total_bots": bots_count,
        "total_conversations": convs_count,
        "total_platform_messages": total_msgs,
        "total_platform_tokens": total_tokens,
        "estimated_platform_cost_usd": round(total_cost_cents / 100.0, 2),
    }

@router.get("/tenants")
def list_all_tenants(
    search: Optional[str] = None,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """List all registered SaaS tenant workspaces."""
    query = db.query(Tenant)
    if search:
        query = query.filter(Tenant.name.ilike(f"%{search}%"))

    tenants = query.order_by(Tenant.created_at.desc()).all()
    res = []
    for t in tenants:
        bots_count = db.query(Bot).filter(Bot.tenant_id == t.id).count()
        users_count = db.query(User).filter(User.tenant_id == t.id).count()
        res.append({
            "id": t.id,
            "name": t.name,
            "slug": t.slug,
            "plan": t.plan.name if t.plan else "N/A",
            "is_active": t.is_active,
            "bots_count": bots_count,
            "users_count": users_count,
            "created_at": t.created_at.isoformat(),
        })
    return res

@router.put("/tenants/{tenant_id}/status")
def toggle_tenant_status(
    tenant_id: str,
    is_active: bool = Query(...),
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Suspend or activate a tenant workspace."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")

    tenant.is_active = is_active
    db.commit()
    return {"message": f"Tenant status set to {'active' if is_active else 'suspended'}"}

@router.get("/audit-logs")
def get_platform_audit_logs(
    limit: int = 50,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Retrieve platform-wide security audit logs."""
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "tenant_id": l.tenant_id,
            "action": l.action,
            "resource": l.resource,
            "details": l.details,
            "created_at": l.created_at.isoformat(),
        }
        for l in logs
    ]
