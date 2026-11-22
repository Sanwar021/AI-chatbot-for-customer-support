from typing import List, Optional
from pydantic import BaseModel, Field

class BotSettingsUpdate(BaseModel):
    system_prompt: Optional[str] = None
    welcome_message: Optional[str] = None
    fallback_message: Optional[str] = None
    primary_color: Optional[str] = "#087b6d"
    position: Optional[str] = "bottom-right"
    suggested_questions: Optional[List[str]] = None
    pre_chat_form_enabled: Optional[bool] = True
    allowed_domains: Optional[str] = "*"
    confidence_threshold: Optional[str] = "0.55"

class BotCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    avatar_url: Optional[str] = None
    language: str = "en" # "en", "bn", "multi"
    settings: Optional[BotSettingsUpdate] = None

class BotUpdateRequest(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    language: Optional[str] = None
    is_active: Optional[bool] = None
    settings: Optional[BotSettingsUpdate] = None

class BotResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    public_key: str
    avatar_url: Optional[str]
    language: str
    is_active: bool
    settings: Optional[dict] = None
    created_at: str

    class Config:
        from_attributes = True
