import uuid
import secrets
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def generate_bot_key() -> str:
    return f"sp_bot_{secrets.token_urlsafe(16)}"

class Bot(Base):
    __tablename__ = "bots"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    public_key = Column(String(64), unique=True, index=True, default=generate_bot_key, nullable=False)
    avatar_url = Column(String(255), nullable=True)
    language = Column(String(20), default="en", nullable=False) # "en", "bn", "multi"
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    tenant = relationship("Tenant", back_populates="bots")
    settings = relationship("BotSettings", back_populates="bot", uselist=False, cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="bot", cascade="all, delete-orphan")
    faqs = relationship("FAQ", back_populates="bot", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="bot", cascade="all, delete-orphan")
    leads = relationship("Lead", back_populates="bot", cascade="all, delete-orphan")
    unanswered_questions = relationship("UnansweredQuestion", back_populates="bot", cascade="all, delete-orphan")

class BotSettings(Base):
    __tablename__ = "bot_settings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    bot_id = Column(String(36), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False, unique=True)
    system_prompt = Column(Text, nullable=True)
    welcome_message = Column(Text, default="Hello! How can I help you today? | আসসালামু আলাইকুম! আমি কীভাবে সাহায্য করতে পারি?", nullable=False)
    fallback_message = Column(Text, default="I am sorry, but I do not have that specific information in my official knowledge base. Would you like me to connect you with a human support agent? | দুঃখিত, এই তথ্যটি আমার নলেজ বেসে নেই। আপনি কি কোনো প্রতিনিধির সাথে কথা বলতে চান?", nullable=False)
    primary_color = Column(String(20), default="#087b6d", nullable=False)
    position = Column(String(20), default="bottom-right", nullable=False) # bottom-right, bottom-left
    suggested_questions = Column(Text, default='["What are your opening hours?", "What services do you provide?", "How can I book an appointment?"]', nullable=False)
    pre_chat_form_enabled = Column(Boolean, default=True, nullable=False)
    allowed_domains = Column(Text, default="*", nullable=False) # Comma-separated or *
    confidence_threshold = Column(String(10), default="0.65", nullable=False)

    bot = relationship("Bot", back_populates="settings")
