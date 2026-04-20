"""Reusable dependencies: DB session and current SaaS tenant.

The tenant is resolved from the ``X-Tenant-ID`` header for simplicity.
In production you'd derive it from an authenticated JWT instead.
"""
from __future__ import annotations

from fastapi import Header, HTTPException, status
from sqlalchemy.orm import Session

from .db import get_db  # re-export
from .models import Tenant

__all__ = ["get_db", "get_current_tenant"]


def get_current_tenant(
    x_tenant_id: int = Header(..., alias="X-Tenant-ID"),
) -> int:
    if x_tenant_id <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid X-Tenant-ID")
    return x_tenant_id
