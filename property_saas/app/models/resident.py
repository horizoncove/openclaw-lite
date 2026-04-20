"""租户管理: Resident (住户) + Lease (租约)."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base
from .common import TimestampMixin, tenant_fk


class Resident(Base, TimestampMixin):
    """A physical person living in a unit (as renter or family member)."""

    __tablename__ = "residents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = tenant_fk()
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32))
    id_card: Mapped[str | None] = mapped_column(String(32), index=True)

    leases: Mapped[list["Lease"]] = relationship(back_populates="resident")


class Lease(Base, TimestampMixin):
    """Rental contract binding a Resident to a Unit for a date range."""

    __tablename__ = "leases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = tenant_fk()
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id", ondelete="CASCADE"), index=True)
    resident_id: Mapped[int] = mapped_column(ForeignKey("residents.id", ondelete="CASCADE"), index=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    monthly_rent: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    deposit: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    status: Mapped[str] = mapped_column(String(16), default="active")  # active/ended/terminated

    resident: Mapped[Resident] = relationship(back_populates="leases")
