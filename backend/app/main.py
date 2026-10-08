# app/main.py
# ---------------------------------------------------------
# PUNTO DE ENTRADA PRINCIPAL: FASTAPI APP
# ---------------------------------------------------------
"""
Módulo de arranque e inicialización de la aplicación FastAPI.
Configura auto-migraciones de BD al inicio, middlewares CORS adaptativos,
rate limiting distribuido, health checks y manejo estructurado de excepciones.
"""
import os
import logging
from typing import Optional
from contextlib import asynccontextmanager

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
from app.db_migrations import run_auto_migrations
from app.routers import (
    cards,
    auth,
    users,
    collections,
    decks,
    wishlist,
    prices,
    trade,
    notifications,
)

logger = logging.getLogger("main")


# ---------------------------------------------------------
# CICLO DE VIDA (LIFESPAN): AUTO-MIGRACIÓN AL INICIAR
# ---------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ejecuta verificaciones y migraciones de esquema antes de atender tráfico."""
    logger.info("Iniciando verificación de esquema de base de datos...")
    try:
        run_auto_migrations()
    except Exception as e:
        logger.error(f"Fallo durante la auto-migración de arranque: {e}")
    yield
    logger.info("Cerrando recursos de la aplicación...")


# Desactivar docs interactivas en producción si el entorno está fijado a production
docs_kwargs = {}
if getattr(settings, "ENVIRONMENT", "development").lower() == "production":
    docs_kwargs = {"docs_url": None, "redoc_url": None, "openapi_url": None}

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API REST Full Stack para intercambio de cartas, gestión de inventario, mazos y cotizaciones históricas.",
    version=settings.PROJECT_VERSION,
    lifespan=lifespan,
    **docs_kwargs
)

# ---------------------------------------------------------
# RATE LIMITING Y MANEJO GLOBAL DE EXCEPCIONES
# ---------------------------------------------------------
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


def _extract_pgcode(exc: IntegrityError) -> Optional[str]:
    """Extrae el SQLSTATE de PostgreSQL desde el driver subyacente si está disponible."""
    orig = getattr(exc, "orig", None)
    if orig is not None:
        return getattr(orig, "pgcode", None)
    return None


@app.exception_handler(IntegrityError)
async def global_integrity_error_handler(request: Request, exc: IntegrityError):
    pgcode = _extract_pgcode(exc)
    raw_message = str(getattr(exc, "orig", exc)).lower()

    logger.warning(
        f"Violación de integridad de datos en {request.method} {request.url.path} "
        f"[SQLSTATE={pgcode or 'UNKNOWN'}]"
    )

    if pgcode == "23505" or "unique constraint" in raw_message:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": "Uno de los identificadores o valores enviados ya se encuentra registrado."}
        )

    if pgcode == "23503" or "foreign key constraint" in raw_message:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": "Uno de los identificadores referenciados no existe en el sistema."}
        )

    if pgcode == "23502" or "not-null constraint" in raw_message:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": "Uno de los campos obligatorios no ha sido proporcionado."}
        )

    if pgcode == "23514" or "check constraint" in raw_message:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": "Los datos enviados no cumplen con las reglas de validación del sistema."}
        )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Error de consistencia de datos en el servidor."}
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Captura cualquier excepción no manejada para evitar que FastAPI termine
    la conexión abruptamente sin inyectar las cabeceras CORS.
    """
    logger.error(f"Excepción no controlada en {request.method} {request.url.path}: {exc}", exc_info=True)
    origin = request.headers.get("origin")
    headers = {}
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Headers"] = "*"
        headers["Access-Control-Allow-Methods"] = "*"

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Error interno del servidor.", "error_type": type(exc).__name__},
        headers=headers
    )


# ---------------------------------------------------------
# MIDDLEWARE CORS ADAPTATIVO (LOCAL & NUBE / RAILWAY)
# ---------------------------------------------------------
cors_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://independent-truth-production-b036.up.railway.app",
]

env_origins = os.getenv("ALLOWED_ORIGINS", "")
if env_origins:
    for orig in env_origins.split(","):
        cleaned = orig.strip()
        if cleaned and cleaned not in cors_origins:
            cors_origins.append(cleaned)
elif hasattr(settings, "CORS_ORIGINS") and settings.CORS_ORIGINS:
    for orig in settings.CORS_ORIGINS:
        if orig not in cors_origins:
            cors_origins.append(orig)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.up\.railway\.app",
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
app.include_router(notifications.router)


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
    return {"status": "alive"}


@app.get("/health/ready", tags=["Health Check"], summary="Readiness probe")
def health_ready():
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