import hashlib
import hmac
import logging
from typing import Any, Dict, Optional
import httpx
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import decrypt_secret
from app.models.channel import WhatsAppIntegration
from app.models.conversation import Conversation, ConversationStatus, MessageSenderType
from app.rag.engine import RAGEngine

logger = logging.getLogger(__name__)

class WhatsAppService:
    """Official Meta WhatsApp Cloud API Integration Service."""

    @staticmethod
    def verify_webhook_challenge(mode: str, token: str, challenge: str, expected_token: str) -> Optional[str]:
        """Validate Meta Webhook handshake challenge."""
        if mode == "subscribe" and token == expected_token:
            return challenge
        return None

    @staticmethod
    def verify_signature(payload_bytes: bytes, signature_header: str, app_secret: str) -> bool:
        """Verify HMAC-SHA256 signature from X-Hub-Signature-256 header."""
        if not app_secret or not signature_header:
            return False
        if signature_header.startswith("sha256="):
            signature_header = signature_header[7:]

        expected_sig = hmac.new(
            app_secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected_sig, signature_header)

    @classmethod
    async def process_incoming_webhook(cls, db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process incoming Meta Cloud API message webhook.
        Identifies customer phone, finds/creates conversation, and runs RAG engine.
        """
        entry = payload.get("entry", [])
        if not entry:
            return {"status": "ignored", "reason": "No entry found"}

        for ent in entry:
            for change in ent.get("changes", []):
                value = change.get("value", {})
                metadata = value.get("metadata", {})
                phone_number_id = metadata.get("phone_number_id")

                if not phone_number_id:
                    continue

                # Locate WhatsApp integration by phone_number_id
                integration = (
                    db.query(WhatsAppIntegration)
                    .filter(
                        WhatsAppIntegration.phone_number_id == phone_number_id,
                        WhatsAppIntegration.is_active.is_(True),
                    )
                    .first()
                )

                if not integration:
                    logger.warning(f"No active WhatsApp integration found for phone_number_id: {phone_number_id}")
                    continue

                contacts = value.get("contacts", [])
                customer_name = contacts[0].get("profile", {}).get("name") if contacts else "WhatsApp User"

                messages = value.get("messages", [])
                for msg in messages:
                    sender_phone = msg.get("from") # Customer's WhatsApp phone number
                    msg_type = msg.get("type")

                    if msg_type != "text":
                        # Send friendly polite fallback for unsupported media
                        await cls.send_whatsapp_message(
                            db=db,
                            integration=integration,
                            to_phone=sender_phone,
                            text="Thank you for reaching out. At this time, our automated assistant can only process text messages.",
                        )
                        continue

                    text_body = msg.get("text", {}).get("body", "").strip()
                    if not text_body:
                        continue

                    # Find or create active WhatsApp conversation
                    conv = (
                        db.query(Conversation)
                        .filter(
                            Conversation.tenant_id == integration.tenant_id,
                            Conversation.bot_id == integration.bot_id,
                            Conversation.channel == "whatsapp",
                            Conversation.customer_id == sender_phone,
                            Conversation.status != ConversationStatus.RESOLVED,
                        )
                        .first()
                    )

                    if not conv:
                        conv = Conversation(
                            tenant_id=integration.tenant_id,
                            bot_id=integration.bot_id,
                            channel="whatsapp",
                            customer_id=sender_phone,
                            customer_name=customer_name,
                            customer_phone=sender_phone,
                            status=ConversationStatus.BOT_ACTIVE,
                        )
                        db.add(conv)
                        db.commit()
                        db.refresh(conv)

                    # If conversation is currently with an agent, do not auto-reply with bot
                    if conv.status == ConversationStatus.WITH_AGENT:
                        # Append customer message so agent sees it in live inbox
                        from app.models.conversation import Message
                        cust_msg = Message(
                            conversation_id=conv.id,
                            sender_type=MessageSenderType.CUSTOMER,
                            sender_id=sender_phone,
                            content=text_body,
                        )
                        db.add(cust_msg)
                        db.commit()
                        continue

                    # Execute RAG query
                    rag_result = await RAGEngine.process_query(
                        db=db,
                        tenant_id=integration.tenant_id,
                        bot_id=integration.bot_id,
                        conversation_id=conv.id,
                        query=text_body,
                        customer_id=sender_phone,
                    )

                    bot_reply = rag_result["text"]

                    # Outbound message back to WhatsApp
                    await cls.send_whatsapp_message(
                        db=db,
                        integration=integration,
                        to_phone=sender_phone,
                        text=bot_reply,
                    )

        return {"status": "processed"}

    @classmethod
    async def send_whatsapp_message(
        cls,
        db: Session,
        integration: WhatsAppIntegration,
        to_phone: str,
        text: str,
    ) -> bool:
        """Send outgoing message through official Meta WhatsApp Cloud API."""
        access_token = decrypt_secret(integration.encrypted_access_token)
        if not access_token:
            logger.error("WhatsApp integration has missing or undecryptable access token.")
            return False

        url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{integration.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone,
            "type": "text",
            "text": {"preview_url": False, "body": text},
        }

        # In development / mock mode, avoid hitting Meta if dummy token
        if access_token.startswith("mock_") or "demo" in access_token.lower():
            logger.info(f"[MOCK WHATSAPP OUTBOUND] To: {to_phone} | Msg: {text[:60]}...")
            return True

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                res.raise_for_status()
                return True
        except Exception as e:
            logger.error(f"Failed to deliver WhatsApp message via Meta Cloud API: {e}")
            return False
