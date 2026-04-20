"""Aggregate model imports so metadata sees every table."""
from .common import Tenant  # SaaS tenant (company), not resident tenant
from .property import Building, Unit
from .owner import Owner, OwnerUnit
from .resident import Resident, Lease
from .parking import ParkingSpace, ParkingAssignment
from .maintenance import MaintenanceRequest, MaintenanceStatus
from .asset import FixedAsset, AssetStatus
from .finance import FeeItem, Invoice, InvoiceLine, Payment, InvoiceStatus, FeeType

__all__ = [
    "Tenant",
    "Building",
    "Unit",
    "Owner",
    "OwnerUnit",
    "Resident",
    "Lease",
    "ParkingSpace",
    "ParkingAssignment",
    "MaintenanceRequest",
    "MaintenanceStatus",
    "FixedAsset",
    "AssetStatus",
    "FeeItem",
    "Invoice",
    "InvoiceLine",
    "Payment",
    "InvoiceStatus",
    "FeeType",
]
