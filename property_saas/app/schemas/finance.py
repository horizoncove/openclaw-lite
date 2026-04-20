from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from ..models.finance import FeeType, InvoiceStatus


class FeeItemCreate(BaseModel):
    code: str = Field(..., max_length=32)
    name: str = Field(..., max_length=128)
    fee_type: FeeType
    unit_price: Decimal = Decimal("0")
    unit: str | None = None


class FeeItemOut(FeeItemCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tenant_id: int


class InvoiceLineCreate(BaseModel):
    fee_item_id: int | None = None
    description: str
    quantity: Decimal = Decimal("1")
    unit_price: Decimal = Decimal("0")
    amount: Decimal = Decimal("0")


class InvoiceLineOut(InvoiceLineCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


class InvoiceCreate(BaseModel):
    invoice_no: str = Field(..., max_length=32)
    unit_id: int | None = None
    owner_id: int | None = None
    period_start: date
    period_end: date
    due_date: date | None = None
    lines: list[InvoiceLineCreate] = []


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tenant_id: int
    invoice_no: str
    unit_id: int | None
    owner_id: int | None
    period_start: date
    period_end: date
    due_date: date | None
    total_amount: Decimal
    paid_amount: Decimal
    status: InvoiceStatus
    lines: list[InvoiceLineOut] = []


class PaymentCreate(BaseModel):
    invoice_id: int
    paid_at: datetime
    amount: Decimal
    method: str = "wechat"
    reference: str | None = None


class PaymentOut(PaymentCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tenant_id: int
