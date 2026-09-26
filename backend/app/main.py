import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import engine, Base
import app.models # Ensures all models are registered with Base

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SAARTHI Backend API — Intelligent Data Capture & Real-Time Progress Tracking (SIH 2026)"
)

# Static file serving for uploaded images/videos
UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    # Validate GEMINI_API_KEY presence at startup without crashing if dev testing locally
    key = settings.get_gemini_api_key(enforce=False)
    if not key:
        print(
            "\n"
            "========================================================================\n"
            "NOTICE: GEMINI_API_KEY is not set in your environment or .env file.\n"
            "To enable Gemini Vision (Tasks 3 & 4), create a '.env' file in the root\n"
            "directory with your API key:\n"
            "  GEMINI_API_KEY=your-actual-gemini-key-here\n"
            "========================================================================\n"
        )
    else:
        print(f"[SAARTHI STARTUP] GEMINI_API_KEY loaded successfully. Active Model: {settings.GEMINI_MODEL}")

    # Refresh Semantic Matcher schedule cache on startup
    try:
        from app.database import SessionLocal
        from app.models.activity import Activity
        from app.services.semantic_matcher import refresh_schedule

        db = SessionLocal()
        db_acts = db.query(Activity).all()
        acts_data = [
            {
                "id": a.id, "name": a.name, "zone": a.zone,
                "category": a.category, "status": a.status, "progress": a.progress
            }
            for a in db_acts
        ]
        refresh_schedule(acts_data)
        db.close()
    except Exception as e:
        print(f"[SAARTHI STARTUP WARN] Could not pre-cache schedule embeddings: {e}")

# Root Health Check
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "gemini_configured": bool(settings.get_gemini_api_key(enforce=False)),
        "gemini_model": settings.GEMINI_MODEL
    }

# Mount Routers
from app.routers import (
    auth_router,
    projects_router,
    activities_router,
    reports_router,
    match_router,
    audit_router,
    transcribe_router,
    ingest_router
)

app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(projects_router, prefix=settings.API_V1_STR)
app.include_router(activities_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(match_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(transcribe_router, prefix=settings.API_V1_STR)
app.include_router(ingest_router, prefix=settings.API_V1_STR)
