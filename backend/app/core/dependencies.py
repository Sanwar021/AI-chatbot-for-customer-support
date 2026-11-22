from typing import Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token
from app.models.bot import Bot
from app.models.tenant import Tenant
from app.models.user import User, UserRole

security_scheme = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Validate Bearer JWT access token and return authenticated User."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type.",
            )
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload.",
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired or is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    return user

async def get_current_tenant(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Tenant:
    """Enforce tenant context and confirm tenant is active."""
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant workspace not found.",
        )
    if not tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant workspace is currently suspended.",
        )
    return tenant

def require_roles(*allowed_roles: str):
    """Factory dependency to enforce role-based access control."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role == UserRole.SUPERADMIN:
            return current_user # Super admin bypasses standard workspace RBAC
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires one of the following roles: {', '.join(allowed_roles)}",
            )
        return current_user
    return role_checker

require_owner = require_roles(UserRole.OWNER)
require_admin = require_roles(UserRole.OWNER, UserRole.ADMIN)
require_agent = require_roles(UserRole.OWNER, UserRole.ADMIN, UserRole.AGENT)

async def require_superadmin(current_user: User = Depends(get_current_user)) -> User:
    """Ensure user is a platform super administrator."""
    if current_user.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Administrator access required.",
        )
    return current_user

async def get_bot_by_public_key(bot_key: str, db: Session = Depends(get_db)) -> Bot:
    """Dependency for public chat widget authentication."""
    if not bot_key:
        raise HTTPException(status_code=400, detail="Missing data-bot-key.")
    bot = db.query(Bot).filter(Bot.public_key == bot_key, Bot.is_active.is_(True)).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or inactive.")
    return bot
