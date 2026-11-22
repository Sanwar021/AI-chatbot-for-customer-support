from abc import ABC, abstractmethod
from typing import AsyncGenerator, Dict, List, Optional
from pydantic import BaseModel

class GenerationResult(BaseModel):
    text: str
    tokens_used: int
    finish_reason: str = "stop"
    provider: str

class BaseAIProvider(ABC):
    """Abstract interface for AI Providers."""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1000,
    ) -> GenerationResult:
        """Generate a complete text response."""
        pass

    @abstractmethod
    async def stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1000,
    ) -> AsyncGenerator[str, None]:
        """Stream chunks of response text."""
        pass

    @abstractmethod
    async def embed(self, texts: List[str]) -> List[List[float]]:
        """Generate 768-dimensional embeddings for given list of text segments."""
        pass

    @abstractmethod
    async def health_check(self) -> Dict[str, any]:
        """Verify API connectivity and model readiness."""
        pass
