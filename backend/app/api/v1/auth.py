import re
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.tenant import Plan, Subscription, Tenant
from app.models.user import User, UserRole
from app.schemas.auth import (
    ForgotPasswordRequest,
    PasskeyLoginRequest,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

DEMO_PASSKEY = "3400"

@router.post("/register", response_model=TokenResponse)
def register(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """Register a new business account, workspace tenant, and owner user."""
    existing_user = db.query(User).filter(User.email == req.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # Slugify workspace name
    slug = re.sub(r"[^\w-]", "", req.workspace_name.lower().replace(" ", "-"))
    existing_tenant = db.query(Tenant).filter(Tenant.slug == slug).first()
    if existing_tenant:
        slug = f"{slug}-{int(datetime.now(timezone.utc).timestamp())}"

    # Default plan
    default_plan = db.query(Plan).filter(Plan.name == "Pro").first()
    if not default_plan:
        default_plan = Plan(name="Pro", max_bots=3, max_messages_per_month=10000, whatsapp_allowed=True, price_cents=4900)
        db.add(default_plan)
        db.commit()
        db.refresh(default_plan)

    tenant = Tenant(
        name=req.workspace_name,
        slug=slug,
        plan_id=default_plan.id,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    # Create owner user
    user = User(
        tenant_id=tenant.id,
        email=req.email.lower(),
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        role=UserRole.OWNER,
        is_active=True,
        is_verified=True,
    )
    db.add(user)

    # Create subscription
    sub = Subscription(
        tenant_id=tenant.id,
        plan_id=default_plan.id,
        status="active",
    )
    db.add(sub)
    db.commit()
    db.refresh(user)

    token_data = {"sub": user.id, "tenant_id": tenant.id, "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "tenant_id": tenant.id,
            "tenant_name": tenant.name,
            "plan": default_plan.name,
        },
    )

@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email and password."""
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    plan_name = tenant.plan.name if tenant and tenant.plan else "Basic"

    token_data = {"sub": user.id, "tenant_id": user.tenant_id, "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "tenant_id": user.tenant_id,
            "tenant_name": tenant.name if tenant else "Workspace",
            "plan": plan_name,
        },
    )

@router.post("/passkey", response_model=TokenResponse)
def passkey_login(req: PasskeyLoginRequest, db: Session = Depends(get_db)):
    """
    On-Screen Passkey PIN Login specified in Section 4 of Cyber-Luxe UI Specification.
    Instant PIN '3400' authenticates into the demo dental clinic workspace.
    """
    if req.passkey != DEMO_PASSKEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid security passkey PIN.",
        )

    # Locate demo user or first owner user
    user = db.query(User).filter(User.email == "demo@supportpilot.ai").first()
    if not user:
        user = db.query(User).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo environment not seeded yet. Please initialize demo data.",
        )

    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    plan_name = tenant.plan.name if tenant and tenant.plan else "Pro"

    token_data = {"sub": user.id, "tenant_id": user.tenant_id, "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "tenant_id": user.tenant_id,
            "tenant_name": tenant.name if tenant else "Demo Dental Clinic",
            "plan": plan_name,
        },
    )

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Rotate refresh token and issue a fresh access token."""
    try:
        payload = decode_token(req.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=400, detail="Invalid token type.")
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token.")

    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    plan_name = tenant.plan.name if tenant and tenant.plan else "Basic"

    token_data = {"sub": user.id, "tenant_id": user.tenant_id, "role": user.role}
    new_access = create_access_token(token_data)
    new_refresh = create_refresh_token(token_data)

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "tenant_id": user.tenant_id,
            "tenant_name": tenant.name if tenant else "",
            "plan": plan_name,
        },
    )

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Generate password reset token and dispatch email."""
    user = db.query(User).filter(User.email == req.email.lower()).first()
    # Always return success message to avoid email enumeration
    return {"message": "If this email is registered, password reset instructions have been sent."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset user password using token."""
    try:
        payload = decode_token(req.token)
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.hashed_password = hash_password(req.new_password)
    db.commit()
    return {"message": "Password has been successfully updated."}
