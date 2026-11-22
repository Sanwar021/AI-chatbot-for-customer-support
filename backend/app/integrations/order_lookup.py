import json
import logging
from typing import Any, Dict, Optional
import httpx
from sqlalchemy.orm import Session
from app.core.security import decrypt_secret
from app.models.audit import AuditLog
from app.models.order import OrderIntegration
from app.utils.ssrf import is_safe_url

logger = logging.getLogger(__name__)

class OrderLookupService:
    """Secure, controlled business order status lookup connector."""

    @classmethod
    async def lookup_order(
        cls,
        db: Session,
        tenant_id: str,
        order_id: str,
        verification_value: str,
    ) -> Dict[str, Any]:
        """Look up order details from tenant's external business API."""
        integration = (
            db.query(OrderIntegration)
            .filter(
                OrderIntegration.tenant_id == tenant_id,
                OrderIntegration.is_active.is_(True),
            )
            .first()
        )

        if not integration:
            return {
                "success": False,
                "message": "Order tracking service is currently not configured for this store.",
            }

        endpoint_url = integration.endpoint_url
        if not is_safe_url(endpoint_url):
            return {
                "success": False,
                "message": "Configured order lookup URL failed security verification.",
            }

        headers = {"Content-Type": "application/json", "User-Agent": "SupportPilot-OrderConnector/1.0"}
        if integration.encrypted_auth_header:
            auth_val = decrypt_secret(integration.encrypted_auth_header)
            if auth_val:
                headers["Authorization"] = auth_val

        payload = {
            "order_id": order_id.strip(),
            integration.verification_field: verification_value.strip(),
        }

        # Audit log entry
        audit = AuditLog(
            tenant_id=tenant_id,
            action="order_lookup",
            resource=f"order:{order_id}",
            details=f"Verification field: {integration.verification_field}",
        )
        db.add(audit)
        db.commit()

        # In dev or demo mode, provide realistic structured order response if endpoint is demo
        if "example.com" in endpoint_url or "demo" in endpoint_url:
            return {
                "success": True,
                "order_id": order_id,
                "status": "In Transit",
                "estimated_delivery": "Within 2-3 business days",
                "items": ["Dental Hygiene Kit (Demo)", "Whitening Strips (Demo)"],
                "tracking_number": f"TRK-{order_id.upper()}-882",
            }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(endpoint_url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
                return {"success": True, "data": data}
        except httpx.HTTPStatusError as e:
            logger.warning(f"Order API returned status {e.response.status_code}")
            return {"success": False, "message": "Order not found with the provided details."}
        except Exception as e:
            logger.error(f"Error querying external order API: {e}")
            return {"success": False, "message": "External order service is temporarily unreachable."}
