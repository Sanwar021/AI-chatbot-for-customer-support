from typing import List, Optional
from pydantic import BaseModel

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_type: str
    sender_id: Optional[str]
    content: str
    sources: Optional[str]
    created_at: str

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: str
    tenant_id: str
    bot_id: str
    channel: str
    customer_id: Optional[str]
    customer_name: Optional[str]
    customer_email: Optional[str]
    customer_phone: Optional[str]
    status: str
    assigned_agent_id: Optional[str]
    created_at: str
    updated_at: str
    messages_count: int = 0
    last_message: Optional[str] = None

    class Config:
        from_attributes = True

class AgentReplyRequest(BaseModel):
    content: str

class AssignAgentRequest(BaseModel):
    agent_id: Optional[str] = None
