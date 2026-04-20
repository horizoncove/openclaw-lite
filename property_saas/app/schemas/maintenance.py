from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from ..models.maintenance import MaintenanceStatus


class MaintenanceCreate(BaseModel):
    unit_id: int | None = None
    reporter_name: str = Field(..., max_length=64)
    reporter_phone: str | None = None
    title: str = Field(..., max_length=128)
    description: str | None = None
    priority: str = "normal"


class MaintenanceUpdate(BaseModel):
    status: MaintenanceStatus | None = None
    assignee: str | None = None
    assigned_at: datetime | None = None
    completed_at: datetime | None = None
    cost: Decimal | None = None


class MaintenanceOut(MaintenanceCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tenant_id: int
    status: MaintenanceStatus
    assignee: str | None = None
    assigned_at: datetime | None = None
    completed_at: datetime | None = None
    cost: Decimal = Decimal("0")
