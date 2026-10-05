from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.session import engine
from sqlalchemy import text

# Import routers
from app.api.routes.auth import router as auth_router
from app.api.routes.customers import router as customers_router
from app.api.routes.work_centers import router as work_centers_router
from app.api.routes.machines import router as machines_router
from app.api.routes.part_types import router as part_types_router
from app.api.routes.products import router as products_router
from app.api.routes.assemblies import router as assemblies_router
from app.api.routes.parts import router as parts_router
from app.api.routes.operations import router as operations_router
from app.api.routes.documents import router as documents_router
from app.api.routes.mhr_particulars import router as mhr_particulars_router
from app.api.routes.machine_mhr import router as machine_mhr_router
from app.api.routes.cost_estimation import router as cost_estimation_router
from app.api.routes.cost_estimation_download import router as cost_estimation_download_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Cost Estimation System API"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(customers_router)
app.include_router(work_centers_router)
app.include_router(machines_router)
app.include_router(part_types_router)
app.include_router(products_router)
app.include_router(assemblies_router)
app.include_router(parts_router)
app.include_router(operations_router)
app.include_router(documents_router)
app.include_router(mhr_particulars_router)
app.include_router(machine_mhr_router)
app.include_router(cost_estimation_router)
app.include_router(cost_estimation_download_router)


@app.get("/")
def root():
    return {
        "message": "CES Backend is running",
        "version": settings.APP_VERSION
    }


@app.get("/api/v1/health")
def health_check():
    """
    Health check endpoint to verify backend and database connectivity.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }, 503