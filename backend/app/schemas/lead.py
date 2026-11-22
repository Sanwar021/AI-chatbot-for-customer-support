from typing import Optional
from pydantic import BaseModel, EmailStr

class LeadCreateRequest(BaseModel):
    bot_id: str
    conversation_id: Optional[str] = None
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    source: str = "pre_chat_form"
    notes: Optional[str] = None

class LeadResponse(BaseModel):
    id: str
    tenant_id: str
    bot_id: str
    conversation_id: Optional[str]
    name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    source: str
    notes: Optional[str]
    created_at: str

    class Config:
        from_attributes = True
