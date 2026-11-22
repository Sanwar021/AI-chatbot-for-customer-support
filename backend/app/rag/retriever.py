import json
from typing import Any, Dict, List, Optional
import numpy as np
from sqlalchemy.orm import Session
from app.ai.factory import get_ai_provider
from app.models.knowledge import DocumentChunk, FAQ, Document

STOP_WORDS = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with", "is",
    "are", "am", "was", "were", "be", "been", "do", "does", "did", "can", "could",
    "would", "should", "what", "where", "when", "how", "who", "which", "you", "your",
    "we", "our", "i", "my", "it", "its", "this", "that", "there", "have", "has", "had",
    "কি", "কী", "কেন", "কখন", "কোথায়", "এবং", "বা", "থেকে", "হলো", "হয়", "আছে", "কি?"
}

class KnowledgeRetriever:
    """Retrieve relevant knowledge chunks and FAQs scoped strictly by tenant and bot."""

    @staticmethod
    def _cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))

    @classmethod
    async def retrieve_relevant_knowledge(
        cls,
        db: Session,
        tenant_id: str,
        bot_id: str,
        query: str,
        top_k: int = 4,
        threshold: float = 0.45,
    ) -> List[Dict[str, Any]]:
        """
        Embed customer query and search both DocumentChunks and FAQs for the specific tenant and bot.
        Enforces tenant isolation at database query time.
        """
        ai_provider = get_ai_provider()
        query_embeddings = await ai_provider.embed([query])
        if not query_embeddings or not query_embeddings[0]:
            return []

        query_vec = np.array(query_embeddings[0], dtype=np.float32)

        # Extract meaningful query keywords (excluding stopwords)
        query_words = [w.strip('.,?!-()|:;') for w in query.lower().split()]
        meaningful_tokens = set(w for w in query_words if w and w not in STOP_WORDS and len(w) >= 3)

        results: List[Dict[str, Any]] = []

        # 1. Search FAQs
        faqs = (
            db.query(FAQ)
            .filter(
                FAQ.tenant_id == tenant_id,
                FAQ.bot_id == bot_id,
                FAQ.is_active.is_(True),
            )
            .all()
        )

        for faq in faqs:
            score = 0.0
            if faq.embedding:
                try:
                    faq_vec = np.array(json.loads(faq.embedding), dtype=np.float32)
                    score = cls._cosine_similarity(query_vec, faq_vec)
                except Exception:
                    pass

            faq_words = [w.strip('.,?!-()|:;') for w in (faq.question + " " + faq.answer).lower().split()]
            faq_tokens = set(w for w in faq_words if w and w not in STOP_WORDS and len(w) >= 3)
            overlap = len(meaningful_tokens.intersection(faq_tokens))
            if overlap >= 2:
                score = max(score, 0.78)
            elif overlap == 1 and any(len(t) >= 5 for t in meaningful_tokens.intersection(faq_tokens)):
                score = max(score, 0.65)

            if score >= threshold:
                results.append({
                    "id": faq.id,
                    "type": "faq",
                    "title": f"FAQ: {faq.question}",
                    "content": f"Q: {faq.question}\nA: {faq.answer}",
                    "score": round(score, 4),
                    "source_name": "Verified FAQ",
                    "metadata": {"category": faq.category},
                })

        # 2. Search Document Chunks
        chunks = (
            db.query(DocumentChunk, Document.name)
            .join(Document, DocumentChunk.document_id == Document.id)
            .filter(
                DocumentChunk.tenant_id == tenant_id,
                DocumentChunk.bot_id == bot_id,
                Document.status == "ready",
            )
            .all()
        )

        for chunk, doc_name in chunks:
            score = 0.0
            if chunk.embedding:
                try:
                    chunk_vec = np.array(json.loads(chunk.embedding), dtype=np.float32)
                    score = cls._cosine_similarity(query_vec, chunk_vec)
                except Exception:
                    pass

            c_words = [w.strip('.,?!-()|:;') for w in chunk.content.lower().split()]
            c_tokens = set(w for w in c_words if w and w not in STOP_WORDS and len(w) >= 3)
            overlap = len(meaningful_tokens.intersection(c_tokens))
            if overlap >= 2:
                score = max(score, 0.72)
            elif overlap == 1 and any(len(t) >= 6 for t in meaningful_tokens.intersection(c_tokens)):
                score = max(score, 0.60)

            if score >= threshold:
                results.append({
                    "id": chunk.id,
                    "type": "document_chunk",
                    "title": doc_name,
                    "content": chunk.content,
                    "score": round(score, 4),
                    "source_name": doc_name,
                    "metadata": json.loads(chunk.chunk_metadata) if chunk.chunk_metadata else {},
                })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]
