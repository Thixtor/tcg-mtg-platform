# app/main.py
# ---------------------------------------------------------
# PUNTO DE ENTRADA PRINCIPAL: FASTAPI APP
# ---------------------------------------------------------
"""
Módulo de arranque e inicialización de la aplicación FastAPI.
Configura middlewares CORS, rate limiting distribuido, health checks
y el manejo estructurado y seguro de excepciones de integridad relacional (PostgreSQL).
"""
import os
import logging
from typing import Optional
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


def _extract_pgcode(exc: IntegrityError) -> Optional[str]:
    """Extrae el SQLSTATE de PostgreSQL desde el driver subyacente si está disponible."""
    orig = getattr(exc, "orig", None)
    if orig is not None:
        return getattr(orig, "pgcode", None)
    return None


@app.exception_handler(IntegrityError)
async def global_integrity_error_handler(request: Request, exc: IntegrityError):
    """
    Captura y clasifica violaciones de integridad relacional sanitizando
    cualquier fuga de PII en logs y respuestas HTTP:
      - 23505: unique_violation -> 409 Conflict (Mensaje genérico anti-enumeración)
      - 23503: foreign_key_violation -> 400 Bad Request
      - 23502: not_null_violation -> 422 Unprocessable Entity
      - 23514: check_violation -> 400 Bad Request
      - Otros / Desconocidos -> 500 Internal Server Error seguro
    """
    pgcode = _extract_pgcode(exc)
    raw_message = str(getattr(exc, "orig", exc)).lower()

    # Log seguro: Registra la ruta y el código SQLSTATE sin incluir valores sensibles (PII)
    logger.warning(
        f"Violación de integridad de datos en {request.method} {request.url.path} "
        f"[SQLSTATE={pgcode or 'UNKNOWN'}]"
    )

    # 1. Unicidad duplicada (Mitigación de enumeración de cuentas / teléfonos)
    if pgcode == "23505" or "unique constraint" in raw_message:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": "Uno de los identificadores o valores enviados ya se encuentra registrado."}
        )

    # 2. Violación de clave foránea (Recurso padre o foráneo inexistente)
    if pgcode == "23503" or "foreign key constraint" in raw_message:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": "Uno de los identificadores referenciados no existe en el sistema."}
        )

    # 3. Violación de campo no nulo
    if pgcode == "23502" or "not-null constraint" in raw_message:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": "Uno de los campos obligatorios no ha sido proporcionado."}
        )

    # 4. Violación de restricción CHECK (ej: valores negativos o estados inválidos)
    if pgcode == "23514" or "check constraint" in raw_message:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": "Los datos enviados no cumplen con las reglas de validación del sistema."}
        )

    # 5. Restricción no clasificada
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Error de consistencia de datos en el servidor."}
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
    allow_origin_regex=r"https://.*\.up\.railway\.app",  # Permite cualquier dominio generado por Railway
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
    """Comprueba que el proceso de la aplicación esté activo."""
    return {"status": "alive"}


@app.get("/health/ready", tags=["Health Check"], summary="Readiness probe")
def health_ready():
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