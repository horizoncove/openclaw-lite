from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..deps import get_current_tenant, get_db
from ..models import Building, Unit
from ..schemas import BuildingCreate, BuildingOut, UnitCreate, UnitOut

router = APIRouter(prefix="/properties", tags=["property"])


@router.post("/buildings", response_model=BuildingOut, status_code=status.HTTP_201_CREATED)
def create_building(
    body: BuildingCreate,
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> Building:
    b = Building(tenant_id=tenant_id, **body.model_dump())
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


@router.get("/buildings", response_model=list[BuildingOut])
def list_buildings(
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> list[Building]:
    return list(db.query(Building).filter(Building.tenant_id == tenant_id).all())


@router.post("/units", response_model=UnitOut, status_code=status.HTTP_201_CREATED)
def create_unit(
    body: UnitCreate,
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> Unit:
    building = db.get(Building, body.building_id)
    if not building or building.tenant_id != tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "building not found")
    u = Unit(tenant_id=tenant_id, **body.model_dump())
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@router.get("/units", response_model=list[UnitOut])
def list_units(
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
    building_id: int | None = None,
) -> list[Unit]:
    q = db.query(Unit).filter(Unit.tenant_id == tenant_id)
    if building_id:
        q = q.filter(Unit.building_id == building_id)
    return list(q.all())
