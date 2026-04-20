from __future__ import annotations

from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ParkingSpaceCreate(BaseModel):
    code: str = Field(..., max_length=32)
    zone: str | None = None
    kind: str = "rental"
    monthly_fee: Decimal = Decimal("0")


class ParkingSpaceOut(ParkingSpaceCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tenant_id: int


class ParkingAssignmentCreate(BaseModel):
    space_id: int
    owner_id: int | None = None
    resident_id: int | None = None
    plate_no: str | None = None
    start_date: date
    end_date: date | None = None

    @model_validator(mode="after")
    def _exactly_one_assignee(self) -> "ParkingAssignmentCreate":
        if (self.owner_id is None) == (self.resident_id is None):
            raise ValueError("exactly one of owner_id or resident_id must be set")
        return self


class ParkingAssignmentOut(ParkingAssignmentCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tenant_id: int
