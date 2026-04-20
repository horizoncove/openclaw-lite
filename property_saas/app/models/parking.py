"""车位管理: ParkingSpace + ParkingAssignment."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base
from .common import TimestampMixin, tenant_fk


class ParkingSpace(Base, TimestampMixin):
    __tablename__ = "parking_spaces"
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_parking_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = tenant_fk()
    code: Mapped[str] = mapped_column(String(32), nullable=False)  # e.g. B1-042
    zone: Mapped[str | None] = mapped_column(String(32))
    # owned = sold to someone, rental = rentable, visitor = guest pool
    kind: Mapped[str] = mapped_column(String(16), default="rental")
    monthly_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0"))

    assignments: Mapped[list["ParkingAssignment"]] = relationship(back_populates="space")


class ParkingAssignment(Base, TimestampMixin):
    """Active or historical assignment of a space to an owner or resident."""

    __tablename__ = "parking_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = tenant_fk()
    space_id: Mapped[int] = mapped_column(ForeignKey("parking_spaces.id", ondelete="CASCADE"), index=True)
    # exactly one of owner_id / resident_id should be non-null (app-level rule)
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("owners.id", ondelete="SET NULL"))
    resident_id: Mapped[int | None] = mapped_column(ForeignKey("residents.id", ondelete="SET NULL"))
    plate_no: Mapped[str | None] = mapped_column(String(16))
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date)

    space: Mapped[ParkingSpace] = relationship(back_populates="assignments")
