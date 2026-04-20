from __future__ import annotations

from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ResidentCreate(BaseModel):
    name: str = Field(..., max_length=64)
    phone: str | None = None
    id_card: str | None = None


class ResidentOut(ResidentCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tenant_id: int


class LeaseCreate(BaseModel):
    unit_id: int
    resident_id: int
    start_date: date
    end_date: date
    monthly_rent: Decimal = Decimal("0")
    deposit: Decimal = Decimal("0")
    status: str = "active"


class LeaseOut(LeaseCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tenant_id: int
