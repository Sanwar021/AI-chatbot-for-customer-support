import secrets
from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_tenant, get_current_user, require_admin, require_owner
from app.core.security import hash_password
from app.models.tenant import Tenant
from app.models.user import User, UserInvitation, UserRole
from app.schemas.team import InviteMemberRequest, TeamMemberResponse, UpdateMemberRoleRequest

router = APIRouter(prefix="/team", tags=["Team Management"])

@router.get("", response_model=List[TeamMemberResponse])
def list_team_members(
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all team members of the workspace."""
    users = db.query(User).filter(User.tenant_id == current_tenant.id).all()
    return [
        TeamMemberResponse(
            id=u.id,
            tenant_id=u.tenant_id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at.isoformat(),
        )
        for u in users
    ]

@router.post("/invite")
def invite_team_member(
    req: InviteMemberRequest,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Invite a new agent or admin to the workspace."""
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    token = secrets.token_urlsafe(32)
    invitation = UserInvitation(
        tenant_id=current_tenant.id,
        email=req.email.lower(),
        role=req.role,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        status="pending",
    )
    db.add(invitation)

    # For instant development convenience, pre-create the user with a default temporary password
    temp_user = User(
        tenant_id=current_tenant.id,
        email=req.email.lower(),
        hashed_password=hash_password("supportpilot123"),
        full_name=req.email.split("@")[0].capitalize(),
        role=req.role,
        is_active=True,
    )
    db.add(temp_user)
    db.commit()

    return {
        "message": f"Invitation dispatched to {req.email}",
        "invite_token": token,
        "temporary_password": "supportpilot123",
    }

@router.put("/{member_id}/role")
def update_team_member_role(
    member_id: str,
    req: UpdateMemberRoleRequest,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    """Update team member role (Owner only)."""
    user = db.query(User).filter(User.id == member_id, User.tenant_id == current_tenant.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Team member not found.")

    if req.role not in [UserRole.OWNER, UserRole.ADMIN, UserRole.AGENT]:
        raise HTTPException(status_code=400, detail="Invalid role specified.")

    user.role = req.role
    db.commit()
    return {"message": "Role updated successfully."}

@router.delete("/{member_id}")
def remove_team_member(
    member_id: str,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    """Remove a team member from the workspace."""
    if member_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot remove yourself from the workspace.")

    user = db.query(User).filter(User.id == member_id, User.tenant_id == current_tenant.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Team member not found.")

    db.delete(user)
    db.commit()
    return {"message": "Team member removed."}
