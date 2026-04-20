from __future__ import annotations

from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class OwnerCreate(BaseModel):
    name: str = Field(..., max_length=64)
    phone: str | None = None
    id_card: str | None = None
    email: str | None = None


class OwnerOut(OwnerCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tenant_id: int


class OwnerUnitCreate(BaseModel):
    owner_id: int
    unit_id: int
    share_ratio: Decimal = Decimal("1.0000")
    acquired_on: date | None = None


class OwnerUnitOut(OwnerUnitCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tenant_id: int
