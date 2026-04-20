"""Property-management SaaS FastAPI app."""
from __future__ import annotations

from fastapi import FastAPI

from .db import init_db
from .routers import (
    asset_router,
    finance_router,
    maintenance_router,
    owner_router,
    parking_router,
    property_router,
    resident_router,
    tenant_router,
)

app = FastAPI(title="Property SaaS", version="0.1.0")


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/healthz", tags=["meta"])
def healthz() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(tenant_router.router)
app.include_router(property_router.router)
app.include_router(owner_router.router)
app.include_router(resident_router.router)
app.include_router(parking_router.router)
app.include_router(maintenance_router.router)
app.include_router(asset_router.router)
app.include_router(finance_router.router)
