from . import property as property_router
from . import owner as owner_router
from . import resident as resident_router
from . import parking as parking_router
from . import maintenance as maintenance_router
from . import asset as asset_router
from . import finance as finance_router
from . import tenant as tenant_router

__all__ = [
    "property_router",
    "owner_router",
    "resident_router",
    "parking_router",
    "maintenance_router",
    "asset_router",
    "finance_router",
    "tenant_router",
]
