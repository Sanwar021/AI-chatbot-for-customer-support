from typing import Optional
from pydantic import BaseModel, HttpUrl

class OrderIntegrationUpdateRequest(BaseModel):
    endpoint_url: str
    auth_header: Optional[str] = None
    verification_field: str = "email" # email or phone
    is_active: bool = True

class OrderIntegrationResponse(BaseModel):
    id: str
    endpoint_url: str
    verification_field: str
    is_active: bool

class OrderLookupTestRequest(BaseModel):
    order_id: str
    verification_value: str
