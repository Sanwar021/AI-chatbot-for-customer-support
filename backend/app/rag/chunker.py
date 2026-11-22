import re
from typing import List

class TextChunker:
    """Split extracted text into overlapping, semantically coherent chunks."""

    def __init__(self, chunk_size: int = 600, chunk_overlap: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_text(self, text: str) -> List[str]:
        if not text or not text.strip():
            return []

        # Normalize line breaks and spaces
        cleaned = re.sub(r"\r\n", "\n", text)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()

        # Split on paragraph boundaries first
        paragraphs = [p.strip() for p in cleaned.split("\n\n") if p.strip()]

        chunks = []
        current_chunk = []
        current_len = 0

        for para in paragraphs:
            # If paragraph itself is larger than chunk_size, split by sentences
            if len(para) > self.chunk_size:
                sentences = re.split(r"(?<=[.!?।])\s+", para)
                for sentence in sentences:
                    sentence = sentence.strip()
                    if not sentence:
                        continue
                    if current_len + len(sentence) > self.chunk_size and current_chunk:
                        chunk_str = " ".join(current_chunk)
                        chunks.append(chunk_str)
                        # Overlap: keep last sentence
                        current_chunk = [current_chunk[-1]] if len(current_chunk) > 1 else []
                        current_len = sum(len(s) for s in current_chunk)

                    current_chunk.append(sentence)
                    current_len += len(sentence)
            else:
                if current_len + len(para) > self.chunk_size and current_chunk:
                    chunk_str = " ".join(current_chunk)
                    chunks.append(chunk_str)
                    current_chunk = []
                    current_len = 0

                current_chunk.append(para)
                current_len += len(para)

        if current_chunk:
            chunk_str = " ".join(current_chunk)
            chunks.append(chunk_str)

        return chunks
