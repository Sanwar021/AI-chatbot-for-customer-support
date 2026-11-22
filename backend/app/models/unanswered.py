import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class UnansweredStatus:
    UNREVIEWED = "unreviewed"
    ADDED_TO_FAQ = "added_to_faq"
    DISMISSED = "dismissed"

class UnansweredQuestion(Base):
    __tablename__ = "unanswered_questions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    bot_id = Column(String(36), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False, index=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True)
    question = Column(Text, nullable=False)
    frequency = Column(Integer, default=1, nullable=False)
    status = Column(String(50), default=UnansweredStatus.UNREVIEWED, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    bot = relationship("Bot", back_populates="unanswered_questions")
