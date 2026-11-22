import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.database import Base, engine
from app.utils.seed import seed_database

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("supportpilot")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure upload dir exists, tables are created, and demo data seeded
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    try:
        await seed_database()
    except Exception as e:
        logger.warning(f"Seed note: {e}")
    logger.info("SupportPilot Backend initialized successfully.")
    yield
    # Shutdown
    logger.info("SupportPilot Backend shutting down.")

app = FastAPI(
    title="SupportPilot AI API",
    description="Multi-tenant AI customer support SaaS platform backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for embeddable widget and local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API V1
app.include_router(api_v1_router, prefix="/api")

# Mount static uploads directory (resolving absolute path)
upload_dir = os.path.abspath(settings.UPLOAD_DIR)
if not os.path.exists(upload_dir):
    alt = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    if os.path.exists(alt):
        upload_dir = alt
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "ai_provider": settings.AI_PROVIDER,
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."},
    )
