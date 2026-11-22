import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    """SMTP Email Notification Service."""

    @staticmethod
    def send_email(to_email: str, subject: str, body_html: str) -> bool:
        """Send email via SMTP if credentials are configured. Fails gracefully if not."""
        if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
            logger.info(f"[EMAIL SIMULATED] To: {to_email} | Subject: {subject}")
            return True

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_FROM_EMAIL
            msg["To"] = to_email

            part = MIMEText(body_html, "html")
            msg.attach(part)

            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())
            server.quit()
            return True
        except Exception as e:
            logger.warning(f"SMTP notification could not be sent to {to_email}: {e}")
            return False
