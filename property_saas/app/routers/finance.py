from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from ..deps import get_current_tenant, get_db
from ..models import FeeItem, Invoice, InvoiceLine, InvoiceStatus, Payment
from ..schemas import (
    FeeItemCreate,
    FeeItemOut,
    InvoiceCreate,
    InvoiceOut,
    PaymentCreate,
    PaymentOut,
)

router = APIRouter(prefix="/finance", tags=["finance"])


# --- Fee catalog -----------------------------------------------------------


@router.post("/fee-items", response_model=FeeItemOut, status_code=status.HTTP_201_CREATED)
def create_fee_item(
    body: FeeItemCreate,
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> FeeItem:
    fi = FeeItem(tenant_id=tenant_id, **body.model_dump())
    db.add(fi)
    db.commit()
    db.refresh(fi)
    return fi


@router.get("/fee-items", response_model=list[FeeItemOut])
def list_fee_items(
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> list[FeeItem]:
    return list(db.query(FeeItem).filter(FeeItem.tenant_id == tenant_id).all())


# --- Invoices --------------------------------------------------------------


def _recompute_invoice_totals(invoice: Invoice) -> None:
    total = sum((Decimal(line.amount) for line in invoice.lines), Decimal("0"))
    paid = sum((Decimal(p.amount) for p in invoice.payments), Decimal("0"))
    invoice.total_amount = total
    invoice.paid_amount = paid
    if paid <= 0:
        invoice.status = InvoiceStatus.unpaid
    elif paid < total:
        invoice.status = InvoiceStatus.partial
    else:
        invoice.status = InvoiceStatus.paid


@router.post("/invoices", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_invoice(
    body: InvoiceCreate,
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> Invoice:
    if body.period_end < body.period_start:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "period_end must be >= period_start"
        )

    inv = Invoice(
        tenant_id=tenant_id,
        invoice_no=body.invoice_no,
        unit_id=body.unit_id,
        owner_id=body.owner_id,
        period_start=body.period_start,
        period_end=body.period_end,
        due_date=body.due_date,
    )
    for line in body.lines:
        amount = line.amount if line.amount else (line.quantity * line.unit_price)
        inv.lines.append(
            InvoiceLine(
                tenant_id=tenant_id,
                fee_item_id=line.fee_item_id,
                description=line.description,
                quantity=line.quantity,
                unit_price=line.unit_price,
                amount=amount,
            )
        )
    _recompute_invoice_totals(inv)
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


@router.get("/invoices", response_model=list[InvoiceOut])
def list_invoices(
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
    unit_id: int | None = None,
    status_filter: InvoiceStatus | None = None,
) -> list[Invoice]:
    q = (
        db.query(Invoice)
        .options(selectinload(Invoice.lines))
        .filter(Invoice.tenant_id == tenant_id)
    )
    if unit_id:
        q = q.filter(Invoice.unit_id == unit_id)
    if status_filter:
        q = q.filter(Invoice.status == status_filter)
    return list(q.all())


@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: int,
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> Invoice:
    inv = (
        db.query(Invoice)
        .options(selectinload(Invoice.lines))
        .filter(Invoice.id == invoice_id, Invoice.tenant_id == tenant_id)
        .first()
    )
    if not inv:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "invoice not found")
    return inv


# --- Payments --------------------------------------------------------------


@router.post("/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def record_payment(
    body: PaymentCreate,
    tenant_id: int = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> Payment:
    inv = db.get(Invoice, body.invoice_id)
    if not inv or inv.tenant_id != tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "invoice not found")
    if inv.status == InvoiceStatus.void:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "invoice is void")
    if body.amount <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "amount must be positive")

    p = Payment(tenant_id=tenant_id, **body.model_dump())
    inv.payments.append(p)
    _recompute_invoice_totals(inv)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p
