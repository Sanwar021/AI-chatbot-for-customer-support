import os
import shutil
import uuid
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_tenant, get_current_user, require_admin
from app.models.bot import Bot
from app.models.knowledge import Document, DocumentChunk, DocumentStatus, FAQ
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.knowledge import DocumentResponse, FAQCreateRequest, FAQResponse, FAQUpdateRequest, UrlCrawlRequest
from app.utils.ssrf import is_safe_url
from app.workers.tasks import crawl_and_index_url_task, embed_faq_task, process_document_task

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"])

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "csv", "md", "markdown"}

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    bot_id: str = Form(...),
    file: UploadFile = File(...),
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Upload PDF, DOCX, TXT, CSV, or MD file for background RAG ingestion."""
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.tenant_id == current_tenant.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found.")

    filename = file.filename or "uploaded_file"
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Supported: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Save to disk
    tenant_dir = os.path.join(settings.UPLOAD_DIR, current_tenant.id)
    os.makedirs(tenant_dir, exist_ok=True)
    stored_filename = f"{uuid.uuid4()}_{filename}"
    file_path = os.path.join(tenant_dir, stored_filename)

    file_size = 0
    with open(file_path, "wb") as buffer:
        content = await file.read()
        file_size = len(content)
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if file_size > max_bytes:
            os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.",
            )
        buffer.write(content)

    doc = Document(
        tenant_id=current_tenant.id,
        bot_id=bot.id,
        name=filename,
        file_type=ext,
        file_size=file_size,
        file_path=file_path,
        status=DocumentStatus.PENDING,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Dispatch background ingestion
    background_tasks.add_task(process_document_task, doc.id)

    return DocumentResponse(
        id=doc.id,
        bot_id=doc.bot_id,
        name=doc.name,
        file_type=doc.file_type,
        file_size=doc.file_size,
        status=doc.status,
        error_message=doc.error_message,
        source_url=doc.source_url,
        chunks_count=doc.chunks_count,
        created_at=doc.created_at.isoformat(),
    )

@router.post("/crawl-url", response_model=DocumentResponse)
async def crawl_url(
    req: UrlCrawlRequest,
    background_tasks: BackgroundTasks,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Import and crawl website content into the knowledge base with SSRF protection."""
    bot = db.query(Bot).filter(Bot.id == req.bot_id, Bot.tenant_id == current_tenant.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found.")

    if not is_safe_url(req.url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The provided URL violates SSRF safety policies (private IP / localhost / metadata blocked).",
        )

    doc = Document(
        tenant_id=current_tenant.id,
        bot_id=bot.id,
        name=req.url,
        file_type="url",
        source_url=req.url,
        status=DocumentStatus.PENDING,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    background_tasks.add_task(crawl_and_index_url_task, doc.id, req.url)

    return DocumentResponse(
        id=doc.id,
        bot_id=doc.bot_id,
        name=doc.name,
        file_type=doc.file_type,
        file_size=0,
        status=doc.status,
        error_message=doc.error_message,
        source_url=doc.source_url,
        chunks_count=doc.chunks_count,
        created_at=doc.created_at.isoformat(),
    )

@router.get("/documents", response_model=List[DocumentResponse])
def list_documents(
    bot_id: Optional[str] = None,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List uploaded documents and crawled URLs."""
    query = db.query(Document).filter(Document.tenant_id == current_tenant.id)
    if bot_id:
        query = query.filter(Document.bot_id == bot_id)

    docs = query.order_by(Document.created_at.desc()).all()
    return [
        DocumentResponse(
            id=d.id,
            bot_id=d.bot_id,
            name=d.name,
            file_type=d.file_type,
            file_size=d.file_size,
            status=d.status,
            error_message=d.error_message,
            source_url=d.source_url,
            chunks_count=d.chunks_count,
            created_at=d.created_at.isoformat(),
        )
        for d in docs
    ]

@router.post("/documents/{doc_id}/reprocess", response_model=DocumentResponse)
def reprocess_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Re-extract, re-chunk, and re-embed a document."""
    doc = db.query(Document).filter(Document.id == doc_id, Document.tenant_id == current_tenant.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    doc.status = DocumentStatus.PENDING
    db.commit()

    if doc.file_type == "url" and doc.source_url:
        background_tasks.add_task(crawl_and_index_url_task, doc.id, doc.source_url)
    else:
        background_tasks.add_task(process_document_task, doc.id)

    return DocumentResponse(
        id=doc.id,
        bot_id=doc.bot_id,
        name=doc.name,
        file_type=doc.file_type,
        file_size=doc.file_size,
        status=doc.status,
        error_message=doc.error_message,
        source_url=doc.source_url,
        chunks_count=doc.chunks_count,
        created_at=doc.created_at.isoformat(),
    )

@router.delete("/documents/{doc_id}")
def delete_document(
    doc_id: str,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a document and all of its associated vector chunks."""
    doc = db.query(Document).filter(Document.id == doc_id, Document.tenant_id == current_tenant.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    return {"message": "Document and associated chunks deleted successfully."}

# ==================== FAQ MANAGEMENT ====================

@router.get("/faqs", response_model=List[FAQResponse])
def list_faqs(
    bot_id: Optional[str] = None,
    category: Optional[str] = None,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List FAQs with category and bot filtering."""
    q = db.query(FAQ).filter(FAQ.tenant_id == current_tenant.id)
    if bot_id:
        q = q.filter(FAQ.bot_id == bot_id)
    if category:
        q = q.filter(FAQ.category == category)

    faqs = q.order_by(FAQ.created_at.desc()).all()
    return [
        FAQResponse(
            id=f.id,
            bot_id=f.bot_id,
            question=f.question,
            answer=f.answer,
            category=f.category,
            is_active=f.is_active,
            created_at=f.created_at.isoformat(),
        )
        for f in faqs
    ]

@router.post("/faqs", response_model=FAQResponse)
def create_faq(
    req: FAQCreateRequest,
    background_tasks: BackgroundTasks,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Add a structured Q&A pair and generate vector embedding."""
    bot = db.query(Bot).filter(Bot.id == req.bot_id, Bot.tenant_id == current_tenant.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found.")

    faq = FAQ(
        tenant_id=current_tenant.id,
        bot_id=bot.id,
        question=req.question.strip(),
        answer=req.answer.strip(),
        category=req.category.strip() or "General",
        is_active=True,
    )
    db.add(faq)
    db.commit()
    db.refresh(faq)

    background_tasks.add_task(embed_faq_task, faq.id)

    return FAQResponse(
        id=faq.id,
        bot_id=faq.bot_id,
        question=faq.question,
        answer=faq.answer,
        category=faq.category,
        is_active=faq.is_active,
        created_at=faq.created_at.isoformat(),
    )

@router.put("/faqs/{faq_id}", response_model=FAQResponse)
def update_faq(
    faq_id: str,
    req: FAQUpdateRequest,
    background_tasks: BackgroundTasks,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update question, answer, category, or active status."""
    faq = db.query(FAQ).filter(FAQ.id == faq_id, FAQ.tenant_id == current_tenant.id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found.")

    re_embed = False
    if req.question is not None:
        faq.question = req.question.strip()
        re_embed = True
    if req.answer is not None:
        faq.answer = req.answer.strip()
        re_embed = True
    if req.category is not None:
        faq.category = req.category.strip()
    if req.is_active is not None:
        faq.is_active = req.is_active

    db.commit()
    db.refresh(faq)

    if re_embed:
        background_tasks.add_task(embed_faq_task, faq.id)

    return FAQResponse(
        id=faq.id,
        bot_id=faq.bot_id,
        question=faq.question,
        answer=faq.answer,
        category=faq.category,
        is_active=faq.is_active,
        created_at=faq.created_at.isoformat(),
    )

@router.delete("/faqs/{faq_id}")
def delete_faq(
    faq_id: str,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete an FAQ entry."""
    faq = db.query(FAQ).filter(FAQ.id == faq_id, FAQ.tenant_id == current_tenant.id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found.")

    db.delete(faq)
    db.commit()
    return {"message": "FAQ deleted successfully."}
