from typing import List, Optional
from pydantic import BaseModel, Field

class ChatInitRequest(BaseModel):
    bot_key: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None

class ChatInitResponse(BaseModel):
    conversation_id: str
    customer_id: str
    bot_name: str
    welcome_message: str
    primary_color: str
    position: str
    suggested_questions: List[str]
    pre_chat_form_enabled: bool
    status: str

class SendMessageRequest(BaseModel):
    bot_key: str
    conversation_id: str
    query: str = Field(..., min_length=1)
    customer_id: Optional[str] = None

class ChatMessageResponse(BaseModel):
    message_id: str
    text: str
    sources: List[dict]
    is_fallback: bool
    provider: str

class HandoffRequest(BaseModel):
    conversation_id: str
    reason: Optional[str] = "Customer requested human support"

class FeedbackRequest(BaseModel):
    conversation_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
