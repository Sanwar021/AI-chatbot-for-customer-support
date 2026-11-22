import logging
from app.ai.base import BaseAIProvider
from app.ai.gemini import GeminiProvider
from app.ai.mock import MockAIProvider
from app.core.config import settings

logger = logging.getLogger(__name__)

_provider_instance = None

def get_ai_provider() -> BaseAIProvider:
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance

    provider_name = (settings.AI_PROVIDER or "mock").lower()

    if provider_name == "gemini" and settings.GEMINI_API_KEY:
        logger.info("Initializing Google Gemini AI Provider.")
        _provider_instance = GeminiProvider()
    else:
        if provider_name == "gemini" and not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not configured. Falling back to Mock AI Provider.")
        else:
            logger.info("Initializing Mock AI Provider.")
        _provider_instance = MockAIProvider(dimensions=settings.EMBEDDING_DIMENSIONS)

    return _provider_instance
