from typing import List, Optional
from pydantic import BaseModel, EmailStr

class TeamMemberResponse(BaseModel):
    id: str
    tenant_id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True

class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: str = "agent"

class UpdateMemberRoleRequest(BaseModel):
    role: str
