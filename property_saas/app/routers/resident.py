from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..deps import get_current_tenant, get_db
from ..models import Lease, Resident, Unit
from ..schemas import LeaseCreate, LeaseOut, ResidentCreate, ResidentOut

router = APIRouter(prefix="/residents", tags=["resident"])


@router.post("", response_model=ResidentOut, status_code=status.HTTP_201_CREATED)
def create_resident(
    body: ResidentCreate,
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> Resident:
    r = Resident(tenant_id=tenant_id, **body.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.get("", response_model=list[ResidentOut])
def list_residents(
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> list[Resident]:
    return list(db.query(Resident).filter(Resident.tenant_id == tenant_id).all())


@router.post("/leases", response_model=LeaseOut, status_code=status.HTTP_201_CREATED)
def create_lease(
    body: LeaseCreate,
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> Lease:
    if body.end_date < body.start_date:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "end_date must be >= start_date")

    unit = db.get(Unit, body.unit_id)
    resident = db.get(Resident, body.resident_id)
    if not unit or unit.tenant_id != tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "unit not found")
    if not resident or resident.tenant_id != tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "resident not found")

    lease = Lease(tenant_id=tenant_id, **body.model_dump())
    db.add(lease)
    # when a unit gets leased, flag it as rented
    unit.status = "rented"
    db.commit()
    db.refresh(lease)
    return lease
