from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..deps import get_current_tenant, get_db
from ..models import FixedAsset
from ..schemas import FixedAssetCreate, FixedAssetOut

router = APIRouter(prefix="/assets", tags=["asset"])


@router.post("", response_model=FixedAssetOut, status_code=status.HTTP_201_CREATED)
def create_asset(
    body: FixedAssetCreate,
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> FixedAsset:
    a = FixedAsset(tenant_id=tenant_id, **body.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.get("", response_model=list[FixedAssetOut])
def list_assets(
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> list[FixedAsset]:
    return list(db.query(FixedAsset).filter(FixedAsset.tenant_id == tenant_id).all())


@router.get("/{asset_id}/depreciation")
def straight_line_depreciation(
    asset_id: int,
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> dict:
    """Return a rough straight-line depreciation schedule.

    This is intentionally simple; real accounting needs period-aware booking.
    """
    a = db.get(FixedAsset, asset_id)
    if not a or a.tenant_id != tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "asset not found")
    if not a.useful_life_years or a.useful_life_years <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "useful_life_years not set")

    base = Decimal(a.purchase_price) - Decimal(a.salvage_value)
    annual = (base / Decimal(a.useful_life_years)).quantize(Decimal("0.01"))
    return {
        "asset_id": a.id,
        "annual_depreciation": str(annual),
        "monthly_depreciation": str((annual / Decimal(12)).quantize(Decimal("0.01"))),
        "useful_life_years": a.useful_life_years,
        "salvage_value": str(a.salvage_value),
    }
