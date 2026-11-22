from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_tenant, get_current_user, require_admin
from app.models.knowledge import FAQ
from app.models.tenant import Tenant
from app.models.unanswered import UnansweredQuestion, UnansweredStatus
from app.models.user import User
from app.schemas.unanswered import AddToFaqRequest, UnansweredResponse
from app.workers.tasks import embed_faq_task

router = APIRouter(prefix="/unanswered", tags=["Unanswered Questions"])

@router.get("", response_model=List[UnansweredResponse])
def list_unanswered(
    bot_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List customer questions the AI could not confidently answer."""
    query = db.query(UnansweredQuestion).filter(UnansweredQuestion.tenant_id == current_tenant.id)
    if bot_id:
        query = query.filter(UnansweredQuestion.bot_id == bot_id)
    if status_filter:
        query = query.filter(UnansweredQuestion.status == status_filter)

    items = query.order_by(UnansweredQuestion.frequency.desc(), UnansweredQuestion.updated_at.desc()).all()
    return [
        UnansweredResponse(
            id=item.id,
            tenant_id=item.tenant_id,
            bot_id=item.bot_id,
            conversation_id=item.conversation_id,
            question=item.question,
            frequency=item.frequency,
            status=item.status,
            created_at=item.created_at.isoformat(),
            updated_at=item.updated_at.isoformat(),
        )
        for item in items
    ]

@router.post("/{unanswered_id}/add-to-faq")
def add_unanswered_to_faq(
    unanswered_id: str,
    req: AddToFaqRequest,
    background_tasks: BackgroundTasks,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Promote an unanswered question into the official knowledge base as an FAQ."""
    item = (
        db.query(UnansweredQuestion)
        .filter(UnansweredQuestion.id == unanswered_id, UnansweredQuestion.tenant_id == current_tenant.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Unanswered question not found.")

    faq = FAQ(
        tenant_id=current_tenant.id,
        bot_id=item.bot_id,
        question=item.question,
        answer=req.answer.strip(),
        category=req.category.strip() or "General",
        is_active=True,
    )
    db.add(faq)
    item.status = UnansweredStatus.ADDED_TO_FAQ
    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(faq)

    # Embed FAQ in background
    background_tasks.add_task(embed_faq_task, faq.id)

    return {"message": "Question successfully added to FAQ and vectorized.", "faq_id": faq.id}

@router.post("/{unanswered_id}/dismiss")
def dismiss_unanswered(
    unanswered_id: str,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Mark an unanswered question as reviewed/dismissed."""
    item = (
        db.query(UnansweredQuestion)
        .filter(UnansweredQuestion.id == unanswered_id, UnansweredQuestion.tenant_id == current_tenant.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    item.status = UnansweredStatus.DISMISSED
    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Question marked as reviewed."}

@router.delete("/{unanswered_id}")
def delete_unanswered(
    unanswered_id: str,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete an unanswered question record."""
    item = (
        db.query(UnansweredQuestion)
        .filter(UnansweredQuestion.id == unanswered_id, UnansweredQuestion.tenant_id == current_tenant.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    db.delete(item)
    db.commit()
    return {"message": "Deleted successfully."}
