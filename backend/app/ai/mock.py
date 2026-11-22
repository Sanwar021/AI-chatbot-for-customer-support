import asyncio
import hashlib
import re
from typing import AsyncGenerator, Dict, List, Optional
import numpy as np
from app.ai.base import BaseAIProvider, GenerationResult

class MockAIProvider(BaseAIProvider):
    """
    Enterprise Mock AI Provider for testing and local demonstration.
    Generates realistic, grounded responses and deterministic 768-dimensional embeddings.
    Clearly marks all responses with [MOCK AI MODE].
    """

    def __init__(self, dimensions: int = 768):
        self.dimensions = dimensions

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1000,
    ) -> GenerationResult:
        await asyncio.sleep(0.02)
        text = self._synthesize_grounded_response(prompt, system_prompt)
        tokens_est = max(10, len(prompt.split()) + len(text.split()))
        return GenerationResult(
            text=text,
            tokens_used=tokens_est,
            finish_reason="stop",
            provider="mock",
        )

    async def stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1000,
    ) -> AsyncGenerator[str, None]:
        full_text = self._synthesize_grounded_response(prompt, system_prompt)
        words = full_text.split(" ")
        for i, word in enumerate(words):
            chunk = word if i == len(words) - 1 else word + " "
            await asyncio.sleep(0.01)
            yield chunk

    async def embed(self, texts: List[str]) -> List[List[float]]:
        await asyncio.sleep(0.01)
        embeddings = []
        for text in texts:
            vec = self._deterministic_vector(text)
            embeddings.append(vec.tolist())
        return embeddings

    async def health_check(self) -> Dict[str, any]:
        return {
            "status": "healthy",
            "provider": "mock",
            "mode": "Simulation & Local Test Harness",
            "dimensions": self.dimensions,
        }

    def _deterministic_vector(self, text: str) -> np.ndarray:
        """Create a reproducible, normalized pseudo-semantic vector from text tokens."""
        cleaned = re.sub(r"[^\w\s]", "", text.lower())
        tokens = cleaned.split()
        vec = np.zeros(self.dimensions, dtype=np.float32)

        if not tokens:
            vec[0] = 1.0
            return vec

        for token in tokens:
            h = int(hashlib.sha256(token.encode("utf-8")).hexdigest(), 16)
            idx1 = h % self.dimensions
            idx2 = (h >> 16) % self.dimensions
            idx3 = (h >> 32) % self.dimensions
            vec[idx1] += 1.0
            vec[idx2] += 0.5
            vec[idx3] += 0.25

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec

    def _synthesize_grounded_response(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Synthesize response based on context found in the prompt or system prompt."""
        # Detect if the customer query itself is in Bengali
        is_bengali = any("\u0980" <= ch <= "\u09FF" for ch in prompt)

        full_content = (system_prompt or "") + "\n" + (prompt or "")

        context_match = re.search(r"Context Knowledge:(.*?)(?:Bot Custom Guidance:|User Query:|Question:|$)", full_content, re.DOTALL | re.IGNORECASE)
        context_text = context_match.group(1).strip() if context_match else ""

        if not context_text or "NO_RELEVANT_CONTEXT_FOUND" in context_text:
            if is_bengali:
                return (
                    "[MOCK AI MODE] দুঃখিত, আমার অনুমোদিত নলেজ বেসে এই প্রশ্নের নির্দিষ্ট কোনো তথ্য নেই। "
                    "আমি কোনো ভুল বা বিভ্রান্তিকর তথ্য প্রদান করব না। আপনি চাইলে আমি আপনাকে আমাদের প্রতিনিধি বা হিউম্যান এজেন্টের সাথে সংযুক্ত করতে পারি।"
                )
            return (
                "[MOCK AI MODE] I do not have sufficient information in the approved knowledge base to answer this question accurately. "
                "I will not fabricate policies or prices. Would you like me to connect you with a human support agent?"
            )

        # Extract sentences from context
        sentences = [s.strip() for s in re.split(r"[\n.]+", context_text) if len(s.strip()) > 10 and not s.strip().startswith("[") and not s.strip().startswith("Source:")]
        grounded_facts = ". ".join(sentences[:3]) if sentences else context_text[:200]

        if is_bengali:
            return (
                f"[MOCK AI MODE: নলেজ বেস থেকে প্রাপ্ত তথ্য]\n"
                f"{grounded_facts}.\n"
                f"আপনার কি এই বিষয়ে আরও কোনো প্রশ্ন আছে?"
            )
        return (
            f"[MOCK AI MODE: Grounded Knowledge]\n"
            f"Based on our official records: {grounded_facts}.\n"
            f"Please let me know if you need any additional assistance!"
        )
