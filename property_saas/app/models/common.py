"""Shared base classes and the multi-tenant (SaaS tenant) model.

Note: in a property-management SaaS we have two overloaded meanings of
"tenant":

* SaaS tenant -> the property-management *company* that bought the system.
  Modeled here as ``Tenant``.
* Resident tenant -> the person renting a unit. Modeled as ``Resident`` in
  ``resident.py`` to avoid the naming clash.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..db import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Tenant(Base, TimestampMixin):
    """A SaaS customer: one property-management company = one tenant."""

    __tablename__ = "saas_tenants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    contact_email: Mapped[str | None] = mapped_column(String(128))


def tenant_fk() -> Mapped[int]:
    """Shortcut for FK to saas_tenants.id on every business table.

    Every row in the system carries ``tenant_id`` so queries can be scoped by
    the current SaaS tenant. This is the standard "shared schema, shared DB"
    multi-tenant pattern.
    """
    return mapped_column(
        ForeignKey("saas_tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
