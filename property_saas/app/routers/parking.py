from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..deps import get_current_tenant, get_db
from ..models import Owner, ParkingAssignment, ParkingSpace, Resident
from ..schemas import (
    ParkingAssignmentCreate,
    ParkingAssignmentOut,
    ParkingSpaceCreate,
    ParkingSpaceOut,
)

router = APIRouter(prefix="/parking", tags=["parking"])


@router.post("/spaces", response_model=ParkingSpaceOut, status_code=status.HTTP_201_CREATED)
def create_space(
    body: ParkingSpaceCreate,
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> ParkingSpace:
    s = ParkingSpace(tenant_id=tenant_id, **body.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.get("/spaces", response_model=list[ParkingSpaceOut])
def list_spaces(
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> list[ParkingSpace]:
    return list(db.query(ParkingSpace).filter(ParkingSpace.tenant_id == tenant_id).all())


@router.post(
    "/assignments",
    response_model=ParkingAssignmentOut,
    status_code=status.HTTP_201_CREATED,
)
def assign_space(
    body: ParkingAssignmentCreate,
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> ParkingAssignment:
    space = db.get(ParkingSpace, body.space_id)
    if not space or space.tenant_id != tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "space not found")
    if body.owner_id is not None:
        owner = db.get(Owner, body.owner_id)
        if not owner or owner.tenant_id != tenant_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "owner not found")
    if body.resident_id is not None:
        resident = db.get(Resident, body.resident_id)
        if not resident or resident.tenant_id != tenant_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "resident not found")

    # Disallow overlapping active assignments on the same space.
    active_exists = (
        db.query(ParkingAssignment)
        .filter(
            ParkingAssignment.space_id == body.space_id,
            ParkingAssignment.end_date.is_(None),
        )
        .first()
    )
    if active_exists:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "space already has an active assignment"
        )

    a = ParkingAssignment(tenant_id=tenant_id, **body.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return a
