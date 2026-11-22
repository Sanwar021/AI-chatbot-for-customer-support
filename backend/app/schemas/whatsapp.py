from typing import Any, Dict, Optional
from pydantic import BaseModel

class WhatsAppConfigUpdateRequest(BaseModel):
    bot_id: str
    phone_number_id: str
    waba_id: Optional[str] = None
    access_token: str
    verify_token: str
    display_phone_number: Optional[str] = None
    is_active: bool = True

class WhatsAppConfigResponse(BaseModel):
    id: str
    bot_id: str
    phone_number_id: str
    waba_id: Optional[str]
    display_phone_number: Optional[str]
    is_active: bool
    webhook_verified: bool
    webhook_url: str
    verify_token: str

class MockWebhookMessageRequest(BaseModel):
    sender_phone: str = "8801700000000"
    sender_name: str = "Demo Customer"
    message_text: str = "What are the clinic opening hours?"
