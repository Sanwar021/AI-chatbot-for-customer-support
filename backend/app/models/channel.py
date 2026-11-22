import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Channel(Base):
    __tablename__ = "channels"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    channel_type = Column(String(50), nullable=False) # website, whatsapp
    config_json = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

class WhatsAppIntegration(Base):
    __tablename__ = "whatsapp_integrations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    bot_id = Column(String(36), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    phone_number_id = Column(String(100), nullable=False)
    waba_id = Column(String(100), nullable=True) # WhatsApp Business Account ID
    encrypted_access_token = Column(Text, nullable=False) # Encrypted at rest
    verify_token = Column(String(100), nullable=False)
    display_phone_number = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    webhook_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    tenant = relationship("Tenant", back_populates="whatsapp_integration")
