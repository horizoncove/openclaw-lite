"""财务费用明细: FeeItem / Invoice / InvoiceLine / Payment."""
from __future__ import annotations

import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base
from .common import TimestampMixin, tenant_fk


class FeeType(str, enum.Enum):
    property_fee = "property_fee"     # 物业费
    parking_fee = "parking_fee"       # 车位费
    utility_water = "utility_water"   # 水费
    utility_power = "utility_power"   # 电费
    utility_gas = "utility_gas"       # 燃气费
    maintenance = "maintenance"       # 维修费
    other = "other"


class InvoiceStatus(str, enum.Enum):
    unpaid = "unpaid"
    partial = "partial"
    paid = "paid"
    void = "void"


class FeeItem(Base, TimestampMixin):
    """A billable fee definition (rate card). Separate from an Invoice."""

    __tablename__ = "fee_items"
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_feeitem_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = tenant_fk()
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    fee_type: Mapped[FeeType] = mapped_column(
        Enum(FeeType, native_enum=False, length=24), nullable=False
    )
    # unit_price meaning depends on fee_type (¥/㎡/月, ¥/度, ¥/月, …)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 4), default=Decimal("0"))
    unit: Mapped[str | None] = mapped_column(String(16))  # e.g. 元/平米/月


class Invoice(Base, TimestampMixin):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = tenant_fk()
    invoice_no: Mapped[str] = mapped_column(String(32), nullable=False)
    unit_id: Mapped[int | None] = mapped_column(ForeignKey("units.id", ondelete="SET NULL"))
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("owners.id", ondelete="SET NULL"))
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, native_enum=False, length=16),
        default=InvoiceStatus.unpaid,
        nullable=False,
    )
    due_date: Mapped[date | None] = mapped_column(Date)

    lines: Mapped[list["InvoiceLine"]] = relationship(
        back_populates="invoice", cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = relationship(
        back_populates="invoice", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("tenant_id", "invoice_no", name="uq_invoice_no"),)


class InvoiceLine(Base, TimestampMixin):
    """One detail row inside an invoice (= 费用明细)."""

    __tablename__ = "invoice_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = tenant_fk()
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    fee_item_id: Mapped[int | None] = mapped_column(ForeignKey("fee_items.id", ondelete="SET NULL"))
    description: Mapped[str] = mapped_column(String(256), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 4), default=Decimal("1"))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 4), default=Decimal("0"))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))

    invoice: Mapped[Invoice] = relationship(back_populates="lines")


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = tenant_fk()
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    paid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    method: Mapped[str] = mapped_column(String(16), default="wechat")  # cash/wechat/alipay/bank
    reference: Mapped[str | None] = mapped_column(String(64))  # txn id

    invoice: Mapped[Invoice] = relationship(back_populates="payments")
