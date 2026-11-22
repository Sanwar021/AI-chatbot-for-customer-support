import json
from typing import AsyncGenerator, Dict, List, Optional
import httpx
from app.ai.base import BaseAIProvider, GenerationResult
from app.core.config import settings

class GeminiProvider(BaseAIProvider):
    """Google Gemini AI Provider implementation."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = settings.GEMINI_CHAT_MODEL
        self.embedding_model = settings.GEMINI_EMBEDDING_MODEL
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1000,
    ) -> GenerationResult:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")

        url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }
        if system_prompt:
            payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

            candidates = data.get("candidates", [])
            if not candidates:
                return GenerationResult(
                    text="No response generated.",
                    tokens_used=0,
                    finish_reason="empty",
                    provider="gemini",
                )

            text_parts = []
            for part in candidates[0].get("content", {}).get("parts", []):
                text_parts.append(part.get("text", ""))

            usage = data.get("usageMetadata", {})
            total_tokens = usage.get("totalTokenCount", 0)

            return GenerationResult(
                text="".join(text_parts),
                tokens_used=total_tokens,
                finish_reason=candidates[0].get("finishReason", "stop"),
                provider="gemini",
            )

    async def stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1000,
    ) -> AsyncGenerator[str, None]:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")

        url = f"{self.base_url}/models/{self.model}:streamGenerateContent?alt=sse&key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }
        if system_prompt:
            payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

        async with httpx.AsyncClient(timeout=45.0) as client:
            async with client.stream("POST", url, json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str:
                            try:
                                chunk_json = json.loads(data_str)
                                candidates = chunk_json.get("candidates", [])
                                if candidates:
                                    parts = candidates[0].get("content", {}).get("parts", [])
                                    for p in parts:
                                        chunk_text = p.get("text", "")
                                        if chunk_text:
                                            yield chunk_text
                            except Exception:
                                continue

    async def embed(self, texts: List[str]) -> List[List[float]]:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")

        url = f"{self.base_url}/models/{self.embedding_model}:batchEmbedContents?key={self.api_key}"
        requests = [
            {"model": f"models/{self.embedding_model}", "content": {"parts": [{"text": t}]}}
            for t in texts
        ]
        payload = {"requests": requests}

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            embeddings = []
            for emb in data.get("embeddings", []):
                embeddings.append(emb.get("values", []))
            return embeddings

    async def health_check(self) -> Dict[str, any]:
        if not self.api_key:
            return {"status": "unconfigured", "error": "Missing GEMINI_API_KEY"}
        try:
            res = await self.generate("Hello", max_tokens=5)
            return {"status": "healthy", "provider": "gemini", "model": self.model}
        except Exception as e:
            return {"status": "error", "error": str(e)}
