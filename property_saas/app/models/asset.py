"""固定资产清单: FixedAsset."""
from __future__ import annotations

import enum
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, Enum, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..db import Base
from .common import TimestampMixin, tenant_fk


class AssetStatus(str, enum.Enum):
    in_use = "in_use"
    idle = "idle"
    repairing = "repairing"
    scrapped = "scrapped"


class FixedAsset(Base, TimestampMixin):
    __tablename__ = "fixed_assets"
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_asset_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = tenant_fk()
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    category: Mapped[str | None] = mapped_column(String(64))  # e.g. 消防/电梯/绿化
    location: Mapped[str | None] = mapped_column(String(128))
    purchase_date: Mapped[date | None] = mapped_column(Date)
    purchase_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    useful_life_years: Mapped[int | None] = mapped_column(Integer)
    salvage_value: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    status: Mapped[AssetStatus] = mapped_column(
        Enum(AssetStatus, native_enum=False, length=16),
        default=AssetStatus.in_use,
        nullable=False,
    )
    note: Mapped[str | None] = mapped_column(Text)
