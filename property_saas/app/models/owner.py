"""业主管理: Owner + OwnerUnit (many-to-many with share ratio)."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base
from .common import TimestampMixin, tenant_fk


class Owner(Base, TimestampMixin):
    __tablename__ = "owners"
    __table_args__ = (UniqueConstraint("tenant_id", "id_card", name="uq_owner_idcard"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = tenant_fk()
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32))
    id_card: Mapped[str | None] = mapped_column(String(32))
    email: Mapped[str | None] = mapped_column(String(128))

    units: Mapped[list["OwnerUnit"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class OwnerUnit(Base, TimestampMixin):
    """Ownership link; a unit may have multiple co-owners with share ratios."""

    __tablename__ = "owner_units"
    __table_args__ = (
        UniqueConstraint("owner_id", "unit_id", name="uq_owner_unit"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = tenant_fk()
    owner_id: Mapped[int] = mapped_column(ForeignKey("owners.id", ondelete="CASCADE"), index=True)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id", ondelete="CASCADE"), index=True)
    share_ratio: Mapped[Decimal] = mapped_column(Numeric(5, 4), default=Decimal("1.0000"))
    acquired_on: Mapped[date | None] = mapped_column(Date)

    owner: Mapped[Owner] = relationship(back_populates="units")
