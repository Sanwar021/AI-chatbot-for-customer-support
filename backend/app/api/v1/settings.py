import hashlib
import secrets
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_tenant, get_current_user, require_admin, require_owner
from app.models.audit import AuditLog
from app.models.tenant import ApiKey, Tenant
from app.models.user import User

router = APIRouter(prefix="/settings", tags=["Workspace Settings & API Keys"])

class WorkspaceUpdateRequest(BaseModel):
    name: str

class ApiKeyCreateRequest(BaseModel):
    name: str

@router.get("/workspace")
def get_workspace_info(
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
):
    """Retrieve workspace profile information."""
    return {
        "id": current_tenant.id,
        "name": current_tenant.name,
        "slug": current_tenant.slug,
        "plan": current_tenant.plan.name if current_tenant.plan else "Pro",
        "created_at": current_tenant.created_at.isoformat(),
    }

@router.put("/workspace")
def update_workspace_info(
    req: WorkspaceUpdateRequest,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    """Update workspace business name."""
    current_tenant.name = req.name.strip()
    current_tenant.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Workspace profile updated successfully."}

@router.get("/api-keys")
def list_api_keys(
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List API keys generated for this workspace."""
    keys = db.query(ApiKey).filter(ApiKey.tenant_id == current_tenant.id).order_by(ApiKey.created_at.desc()).all()
    return [
        {
            "id": k.id,
            "name": k.name,
            "key_prefix": k.key_prefix,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
            "is_active": k.is_active,
            "created_at": k.created_at.isoformat(),
        }
        for k in keys
    ]

@router.post("/api-keys")
def create_api_key(
    req: ApiKeyCreateRequest,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Generate a new secure API key. Raw secret token is returned only once."""
    raw_token = f"sp_live_{secrets.token_urlsafe(32)}"
    prefix = raw_token[:12]
    key_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    key_record = ApiKey(
        tenant_id=current_tenant.id,
        name=req.name.strip(),
        key_prefix=prefix,
        key_hash=key_hash,
        is_active=True,
    )
    db.add(key_record)
    db.commit()
    db.refresh(key_record)

    return {
        "id": key_record.id,
        "name": key_record.name,
        "raw_key": raw_token,
        "key_prefix": prefix,
        "message": "Store this API key safely; it will not be displayed again.",
    }

@router.delete("/api-keys/{key_id}")
def delete_api_key(
    key_id: str,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Revoke and delete an API key."""
    key_record = db.query(ApiKey).filter(ApiKey.id == key_id, ApiKey.tenant_id == current_tenant.id).first()
    if not key_record:
        raise HTTPException(status_code=404, detail="API key not found.")

    db.delete(key_record)
    db.commit()
    return {"message": "API key revoked successfully."}

@router.get("/audit-logs")
def get_tenant_audit_logs(
    limit: int = 30,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """View security and action audit logs for the current workspace."""
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.tenant_id == current_tenant.id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": l.id,
            "action": l.action,
            "resource": l.resource,
            "details": l.details,
            "created_at": l.created_at.isoformat(),
        }
        for l in logs
    ]
