from typing import List, Optional
from pydantic import BaseModel, Field, HttpUrl

class UrlCrawlRequest(BaseModel):
    bot_id: str
    url: str

class FAQCreateRequest(BaseModel):
    bot_id: str
    question: str = Field(..., min_length=2)
    answer: str = Field(..., min_length=2)
    category: str = "General"

class FAQUpdateRequest(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None

class FAQResponse(BaseModel):
    id: str
    bot_id: str
    question: str
    answer: str
    category: str
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True

class DocumentResponse(BaseModel):
    id: str
    bot_id: str
    name: str
    file_type: str
    file_size: int
    status: str
    error_message: Optional[str]
    source_url: Optional[str]
    chunks_count: int
    created_at: str

    class Config:
        from_attributes = True
