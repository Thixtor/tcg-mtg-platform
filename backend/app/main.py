# app/main.py
# ---------------------------------------------------------
# PUNTO DE ENTRADA PRINCIPAL: FASTAPI APP
# ---------------------------------------------------------
import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.core.config import settings
from app.core.limiter import limiter
from app.database import SessionLocal
from app.routers import cards, auth, users, collections, decks, wishlist, prices, trade

logger = logging.getLogger("main")

# Desactivar docs interactivas en producción si el entorno está fijado a production
docs_kwargs = {}
if getattr(settings, "ENVIRONMENT", "development").lower() == "production":
    docs_kwargs = {"docs_url": None, "redoc_url": None, "openapi_url": None}

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API REST Full Stack para intercambio de cartas, gestión de inventario, mazos y cotizaciones históricas.",
    version=settings.PROJECT_VERSION,
    **docs_kwargs
)

# ---------------------------------------------------------
# RATE LIMITING Y MANEJO GLOBAL DE EXCEPCIONES
# ---------------------------------------------------------
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(IntegrityError)
async def global_integrity_error_handler(request: Request, exc: IntegrityError):
    """
    Captura violaciones de unicidad y concurrencia SQL devolviendo 409 Conflict.
    Previene caídas 500 por doble submit en la interfaz.
    """
    logger.warning(f"Conflicto de integridad SQL en {request.method} {request.url.path}: {exc.orig}")
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "La operación entra en conflicto con un registro existente o una restricción de integridad."}
    )


# ---------------------------------------------------------
# MIDDLEWARE CORS
# ---------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# REGISTRO DE ROUTERS
# ---------------------------------------------------------
app.include_router(cards.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(collections.router, prefix=settings.API_V1_STR)
app.include_router(decks.router, prefix=settings.API_V1_STR)
app.include_router(wishlist.router, prefix=settings.API_V1_STR)
app.include_router(prices.router, prefix=settings.API_V1_STR)
app.include_router(trade.router, prefix=settings.API_V1_STR)


# ---------------------------------------------------------
# HEALTH CHECKS Y OBSERVABILIDAD
# ---------------------------------------------------------
@app.get("/", tags=["Health Check"])
def health_root():
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION
    }


@app.get("/health/live", tags=["Health Check"], summary="Liveness probe")
def health_liveness():
    """Comprueba que el proceso de la aplicación esté activo."""
    return {"status": "alive"}


@app.get("/health/ready", tags=["Health Check"], summary="Readiness probe")
def health_readiness():
    """
    Comprueba conectividad real con la base de datos PostgreSQL.
    Retorna 200 si la BD responde 'SELECT 1', de lo contrario 503 Service Unavailable.
    """
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"Fallo en la prueba de salud de la base de datos: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "database": "disconnected"}
        )
    finally:
        db.close()