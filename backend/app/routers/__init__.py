from app.routers.auth import router as auth_router
from app.routers.projects import router as projects_router
from app.routers.activities import router as activities_router
from app.routers.reports import router as reports_router
from app.routers.match import router as match_router
from app.routers.audit import router as audit_router

__all__ = [
    "auth_router",
    "projects_router",
    "activities_router",
    "reports_router",
    "match_router",
    "audit_router"
]
