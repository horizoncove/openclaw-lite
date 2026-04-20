from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..deps import get_current_tenant, get_db
from ..models import MaintenanceRequest, MaintenanceStatus
from ..schemas import MaintenanceCreate, MaintenanceOut, MaintenanceUpdate

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


# Allowed transitions for the request state machine.
_TRANSITIONS: dict[MaintenanceStatus, set[MaintenanceStatus]] = {
    MaintenanceStatus.submitted: {MaintenanceStatus.assigned, MaintenanceStatus.cancelled},
    MaintenanceStatus.assigned: {MaintenanceStatus.in_progress, MaintenanceStatus.cancelled},
    MaintenanceStatus.in_progress: {MaintenanceStatus.completed, MaintenanceStatus.cancelled},
    MaintenanceStatus.completed: set(),
    MaintenanceStatus.cancelled: set(),
}


@router.post("", response_model=MaintenanceOut, status_code=status.HTTP_201_CREATED)
def create_request(
    body: MaintenanceCreate,
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> MaintenanceRequest:
    r = MaintenanceRequest(tenant_id=tenant_id, **body.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.get("", response_model=list[MaintenanceOut])
def list_requests(
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
    status_filter: MaintenanceStatus | None = None,
) -> list[MaintenanceRequest]:
    q = db.query(MaintenanceRequest).filter(MaintenanceRequest.tenant_id == tenant_id)
    if status_filter:
        q = q.filter(MaintenanceRequest.status == status_filter)
    return list(q.all())


@router.patch("/{request_id}", response_model=MaintenanceOut)
def update_request(
    request_id: int,
    body: MaintenanceUpdate,
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> MaintenanceRequest:
    r = db.get(MaintenanceRequest, request_id)
    if not r or r.tenant_id != tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "request not found")

    if body.status is not None and body.status != r.status:
        if body.status not in _TRANSITIONS[r.status]:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"illegal transition {r.status.value} -> {body.status.value}",
            )
        r.status = body.status
        if body.status == MaintenanceStatus.assigned and not r.assigned_at:
            r.assigned_at = datetime.now(timezone.utc)
        if body.status == MaintenanceStatus.completed and not r.completed_at:
            r.completed_at = datetime.now(timezone.utc)

    if body.assignee is not None:
        r.assignee = body.assignee
    if body.assigned_at is not None:
        r.assigned_at = body.assigned_at
    if body.completed_at is not None:
        r.completed_at = body.completed_at
    if body.cost is not None:
        r.cost = body.cost

    db.commit()
    db.refresh(r)
    return r
