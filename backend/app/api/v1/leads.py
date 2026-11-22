import csv
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_tenant, get_current_user, require_admin
from app.models.lead import Lead
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.lead import LeadCreateRequest, LeadResponse

router = APIRouter(prefix="/leads", tags=["Lead Capture & Management"])

@router.get("", response_model=List[LeadResponse])
def list_leads(
    bot_id: Optional[str] = None,
    source: Optional[str] = None,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List captured customer leads with filtering."""
    query = db.query(Lead).filter(Lead.tenant_id == current_tenant.id)
    if bot_id:
        query = query.filter(Lead.bot_id == bot_id)
    if source:
        query = query.filter(Lead.source == source)

    leads = query.order_by(Lead.created_at.desc()).all()
    return [
        LeadResponse(
            id=l.id,
            tenant_id=l.tenant_id,
            bot_id=l.bot_id,
            conversation_id=l.conversation_id,
            name=l.name,
            email=l.email,
            phone=l.phone,
            source=l.source,
            notes=l.notes,
            created_at=l.created_at.isoformat(),
        )
        for l in leads
    ]

@router.post("", response_model=LeadResponse)
def create_lead(
    req: LeadCreateRequest,
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Manually add a captured lead."""
    lead = Lead(
        tenant_id=current_tenant.id,
        bot_id=req.bot_id,
        conversation_id=req.conversation_id,
        name=req.name,
        email=req.email,
        phone=req.phone,
        source=req.source,
        notes=req.notes,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    return LeadResponse(
        id=lead.id,
        tenant_id=lead.tenant_id,
        bot_id=lead.bot_id,
        conversation_id=lead.conversation_id,
        name=lead.name,
        email=lead.email,
        phone=lead.phone,
        source=lead.source,
        notes=lead.notes,
        created_at=lead.created_at.isoformat(),
    )

@router.get("/export.csv")
def export_leads_csv(
    current_tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download captured leads as a formatted CSV file."""
    leads = db.query(Lead).filter(Lead.tenant_id == current_tenant.id).order_by(Lead.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Email", "Phone", "Source", "Date Captured", "Notes"])

    for l in leads:
        writer.writerow([
            l.id,
            l.name or "",
            l.email or "",
            l.phone or "",
            l.source,
            l.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            l.notes or "",
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=supportpilot_leads_{current_tenant.slug}.csv"},
    )
