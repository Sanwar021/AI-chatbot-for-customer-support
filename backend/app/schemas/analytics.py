from typing import Dict, List, Optional
from pydantic import BaseModel

class TrendDataPoint(BaseModel):
    date: str
    conversations: int
    messages: int
    leads: int

class AnalyticsSummaryResponse(BaseModel):
    total_conversations: int
    total_messages: int
    ai_resolved_conversations: int
    human_handoffs: int
    bot_resolution_rate: float # percentage e.g. 84.5
    total_leads: int
    unanswered_questions_count: int
    current_month_messages: int
    current_month_tokens: int
    estimated_cost_usd: float
    channel_breakdown: Dict[str, int]
    daily_trends: List[TrendDataPoint]
