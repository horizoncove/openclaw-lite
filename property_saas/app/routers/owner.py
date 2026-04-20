from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..deps import get_current_tenant, get_db
from ..models import Owner, OwnerUnit, Unit
from ..schemas import OwnerCreate, OwnerOut, OwnerUnitCreate, OwnerUnitOut

router = APIRouter(prefix="/owners", tags=["owner"])


@router.post("", response_model=OwnerOut, status_code=status.HTTP_201_CREATED)
def create_owner(
    body: OwnerCreate,
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> Owner:
    o = Owner(tenant_id=tenant_id, **body.model_dump())
    db.add(o)
    db.commit()
    db.refresh(o)
    return o


@router.get("", response_model=list[OwnerOut])
def list_owners(
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> list[Owner]:
    return list(db.query(Owner).filter(Owner.tenant_id == tenant_id).all())


@router.post("/assign", response_model=OwnerUnitOut, status_code=status.HTTP_201_CREATED)
def assign_unit(
    body: OwnerUnitCreate,
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> OwnerUnit:
    owner = db.get(Owner, body.owner_id)
    unit = db.get(Unit, body.unit_id)
    if not owner or owner.tenant_id != tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "owner not found")
    if not unit or unit.tenant_id != tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "unit not found")
    link = OwnerUnit(tenant_id=tenant_id, **body.model_dump())
    db.add(link)
    db.commit()
    db.refresh(link)
    return link
