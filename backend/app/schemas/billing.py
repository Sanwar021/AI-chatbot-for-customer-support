from typing import List, Optional
from pydantic import BaseModel

class PlanResponse(BaseModel):
    id: str
    name: str
    max_bots: int
    max_messages_per_month: int
    whatsapp_allowed: bool
    price_cents: int

    class Config:
        from_attributes = True

class UsageStatusResponse(BaseModel):
    plan_name: str
    max_bots: int
    current_bots: int
    max_messages_per_month: int
    current_month_messages: int
    usage_percentage: float
    current_month_tokens: int
    estimated_cost_usd: float
    whatsapp_allowed: bool
    billing_status: str

class UpgradePlanRequest(BaseModel):
    plan_name: str # "Basic", "Pro", "Business"
