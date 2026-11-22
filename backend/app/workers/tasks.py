import asyncio
import json
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.ai.factory import get_ai_provider
from app.core.database import SessionLocal
from app.models.knowledge import Document, DocumentChunk, DocumentStatus, FAQ
from app.rag.chunker import TextChunker
from app.rag.crawler import WebsiteCrawler
from app.rag.parser import DocumentParser

logger = logging.getLogger(__name__)

async def process_document_task(document_id: str):
    """
    Background worker task to extract text, chunk, embed, and store document knowledge.
    """
    db: Session = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"Document {document_id} not found.")
            return

        doc.status = DocumentStatus.PROCESSING
        db.commit()

        # 1. Extract text
        if doc.file_path:
            raw_text = DocumentParser.extract_text(doc.file_path, doc.file_type)
        else:
            raise ValueError("No file path provided for document.")

        if not raw_text.strip():
            raise ValueError("No text could be extracted from document.")

        # 2. Chunk text
        chunker = TextChunker(chunk_size=600, chunk_overlap=100)
        chunks_text = chunker.chunk_text(raw_text)

        if not chunks_text:
            raise ValueError("Document yielded 0 chunks.")

        # 3. Generate embeddings
        ai_provider = get_ai_provider()
        embeddings = await ai_provider.embed(chunks_text)

        # 4. Remove any prior chunks if reprocessing
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()

        # 5. Insert new chunks
        for idx, (content, emb) in enumerate(zip(chunks_text, embeddings)):
            chunk = DocumentChunk(
                document_id=doc.id,
                tenant_id=doc.tenant_id,
                bot_id=doc.bot_id,
                content=content,
                chunk_index=idx,
                embedding=json.dumps(emb),
                chunk_metadata=json.dumps({
                    "source": doc.name,
                    "type": doc.file_type,
                    "index": idx,
                }),
            )
            db.add(chunk)

        doc.status = DocumentStatus.READY
        doc.chunks_count = len(chunks_text)
        doc.error_message = None
        doc.updated_at = datetime.now(timezone.utc)
        db.commit()
        logger.info(f"Document {doc.id} processed successfully with {len(chunks_text)} chunks.")

    except Exception as e:
        logger.exception(f"Error processing document {document_id}: {e}")
        db.rollback()
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = DocumentStatus.FAILED
            doc.error_message = str(e)
            doc.updated_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()

async def crawl_and_index_url_task(document_id: str, start_url: str):
    """
    Background worker task to crawl a website URL safely and index its content.
    """
    db: Session = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return

        doc.status = DocumentStatus.PROCESSING
        db.commit()

        crawler = WebsiteCrawler(max_pages=5)
        pages = await crawler.crawl_site(start_url)

        if not pages:
            raise ValueError(f"No pages could be crawled from {start_url}")

        chunker = TextChunker(chunk_size=600, chunk_overlap=100)
        all_chunks = []
        all_metas = []

        for p in pages:
            page_chunks = chunker.chunk_text(p["content"])
            for idx, c in enumerate(page_chunks):
                all_chunks.append(c)
                all_metas.append({"url": p["url"], "title": p["title"], "page_index": idx})

        if not all_chunks:
            raise ValueError("Crawled content produced 0 text chunks.")

        ai_provider = get_ai_provider()
        embeddings = await ai_provider.embed(all_chunks)

        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()

        for idx, (content, emb, meta) in enumerate(zip(all_chunks, embeddings, all_metas)):
            chunk = DocumentChunk(
                document_id=doc.id,
                tenant_id=doc.tenant_id,
                bot_id=doc.bot_id,
                content=content,
                chunk_index=idx,
                embedding=json.dumps(emb),
                chunk_metadata=json.dumps(meta),
            )
            db.add(chunk)

        doc.status = DocumentStatus.READY
        doc.chunks_count = len(all_chunks)
        doc.error_message = None
        doc.updated_at = datetime.now(timezone.utc)
        db.commit()
        logger.info(f"URL {start_url} crawled & indexed with {len(all_chunks)} chunks.")

    except Exception as e:
        logger.exception(f"Error crawling URL for doc {document_id}: {e}")
        db.rollback()
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = DocumentStatus.FAILED
            doc.error_message = str(e)
            doc.updated_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()

async def embed_faq_task(faq_id: str):
    """Generate and store embedding for a single FAQ."""
    db: Session = SessionLocal()
    try:
        faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
        if not faq:
            return

        text_to_embed = f"Question: {faq.question}\nAnswer: {faq.answer}"
        ai_provider = get_ai_provider()
        embeddings = await ai_provider.embed([text_to_embed])
        if embeddings and embeddings[0]:
            faq.embedding = json.dumps(embeddings[0])
            faq.updated_at = datetime.now(timezone.utc)
            db.commit()
    except Exception as e:
        logger.error(f"Failed to embed FAQ {faq_id}: {e}")
    finally:
        db.close()
