from typing import Optional
from pydantic import BaseModel

class UnansweredResponse(BaseModel):
    id: str
    tenant_id: str
    bot_id: str
    conversation_id: Optional[str]
    question: str
    frequency: int
    status: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class AddToFaqRequest(BaseModel):
    answer: str
    category: str = "General"
