from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_tenant, get_current_user, require_admin
from app.core.security import encrypt_secret
from app.integrations.order_lookup import OrderLookupService
from app.models.order import OrderIntegration
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.order import OrderIntegrationResponse, OrderIntegrationUpdateRequest, OrderLookupTestRequest
from app.utils.ssrf import is_safe_url

router = APIRouter(prefix="/orders", tags=["Order Status Lookup Connector"])

@router.get("/config", response_model=Optional[OrderIntegrationResponse])
def get_order_config(
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve tenant order integration settings."""
    integration = db.query(OrderIntegration).filter(OrderIntegration.tenant_id == current_tenant.id).first()
    if not integration:
        return None

    return OrderIntegrationResponse(
        id=integration.id,
        endpoint_url=integration.endpoint_url,
        verification_field=integration.verification_field,
        is_active=integration.is_active,
    )

@router.post("/config", response_model=OrderIntegrationResponse)
def save_order_config(
    req: OrderIntegrationUpdateRequest,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Save or update external business order lookup API endpoint."""
    if not is_safe_url(req.endpoint_url):
        raise HTTPException(
            status_code=400,
            detail="The provided URL violates SSRF safety policies (private IP / localhost blocked).",
        )

    integration = db.query(OrderIntegration).filter(OrderIntegration.tenant_id == current_tenant.id).first()
    if not integration:
        integration = OrderIntegration(
            tenant_id=current_tenant.id,
            endpoint_url=req.endpoint_url.strip(),
            encrypted_auth_header=encrypt_secret(req.auth_header.strip()) if req.auth_header else None,
            verification_field=req.verification_field,
            is_active=req.is_active,
        )
        db.add(integration)
    else:
        integration.endpoint_url = req.endpoint_url.strip()
        if req.auth_header:
            integration.encrypted_auth_header = encrypt_secret(req.auth_header.strip())
        integration.verification_field = req.verification_field
        integration.is_active = req.is_active
        integration.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(integration)

    return OrderIntegrationResponse(
        id=integration.id,
        endpoint_url=integration.endpoint_url,
        verification_field=integration.verification_field,
        is_active=integration.is_active,
    )

@router.post("/test-lookup")
async def test_order_lookup(
    req: OrderLookupTestRequest,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Test the order lookup connector."""
    result = await OrderLookupService.lookup_order(
        db=db,
        tenant_id=current_tenant.id,
        order_id=req.order_id,
        verification_value=req.verification_value,
    )
    return result
