from __future__ import annotations

from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from ..models.asset import AssetStatus


class FixedAssetCreate(BaseModel):
    code: str = Field(..., max_length=32)
    name: str = Field(..., max_length=128)
    category: str | None = None
    location: str | None = None
    purchase_date: date | None = None
    purchase_price: Decimal = Decimal("0")
    useful_life_years: int | None = None
    salvage_value: Decimal = Decimal("0")
    status: AssetStatus = AssetStatus.in_use
    note: str | None = None


class FixedAssetOut(FixedAssetCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tenant_id: int
