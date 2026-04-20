"""房产管理: Building -> Unit."""
from __future__ import annotations

from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base
from .common import TimestampMixin, tenant_fk


class Building(Base, TimestampMixin):
    __tablename__ = "buildings"
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_building_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = tenant_fk()
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    address: Mapped[str | None] = mapped_column(String(256))
    total_floors: Mapped[int | None] = mapped_column(Integer)

    units: Mapped[list["Unit"]] = relationship(back_populates="building", cascade="all, delete-orphan")


class Unit(Base, TimestampMixin):
    """A single sellable/rentable room or apartment."""

    __tablename__ = "units"
    __table_args__ = (
        UniqueConstraint("tenant_id", "building_id", "unit_no", name="uq_unit_no"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = tenant_fk()
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id", ondelete="CASCADE"), index=True)
    unit_no: Mapped[str] = mapped_column(String(32), nullable=False)
    floor: Mapped[int | None] = mapped_column(Integer)
    area_sqm: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    status: Mapped[str] = mapped_column(String(16), default="vacant")  # vacant/occupied/rented

    building: Mapped[Building] = relationship(back_populates="units")
