"""SaaS tenant (customer) administration."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from ..deps import get_db
from ..models import Tenant

router = APIRouter(prefix="/tenants", tags=["tenants"])


class TenantCreate(BaseModel):
    name: str
    contact_email: str | None = None


class TenantOut(TenantCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


@router.post("", response_model=TenantOut, status_code=status.HTTP_201_CREATED)
def create_tenant(body: TenantCreate, db: Session = Depends(get_db)) -> Tenant:
    t = Tenant(**body.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.get("", response_model=list[TenantOut])
def list_tenants(db: Session = Depends(get_db)) -> list[Tenant]:
    return list(db.query(Tenant).all())


@router.get("/{tenant_id}", response_model=TenantOut)
def get_tenant(tenant_id: int, db: Session = Depends(get_db)) -> Tenant:
    t = db.get(Tenant, tenant_id)
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "tenant not found")
    return t
