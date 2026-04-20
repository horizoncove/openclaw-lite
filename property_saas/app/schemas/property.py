from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class BuildingCreate(BaseModel):
    code: str = Field(..., max_length=32)
    name: str = Field(..., max_length=128)
    address: str | None = None
    total_floors: int | None = None


class BuildingOut(BuildingCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tenant_id: int


class UnitCreate(BaseModel):
    building_id: int
    unit_no: str = Field(..., max_length=32)
    floor: int | None = None
    area_sqm: Decimal | None = None
    status: str = "vacant"


class UnitOut(UnitCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tenant_id: int
