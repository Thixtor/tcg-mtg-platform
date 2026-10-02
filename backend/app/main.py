# app/main.py
# ---------------------------------------------------------
# PUNTO DE ENTRADA PRINCIPAL: FASTAPI APP
# ---------------------------------------------------------
"""
Módulo de arranque e inicialización de la aplicación FastAPI.
Configura middlewares CORS, rate limiting distribuido, health checks
y el manejo estructurado de excepciones de integridad relacional (PostgreSQL).
"""
import logging
import re
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


def _extract_pgcode(exc: IntegrityError) -> Optional[str]:
    """Extrae el SQLSTATE de PostgreSQL desde el driver subyacente si está disponible."""
    orig = getattr(exc, "orig", None)
    if orig is not None:
        return getattr(orig, "pgcode", None)
    return None


@app.exception_handler(IntegrityError)
async def global_integrity_error_handler(request: Request, exc: IntegrityError):
    """
    Captura y clasifica violaciones de integridad relacional según su SQLSTATE:
      - 23505: unique_violation -> 409 Conflict
      - 23503: foreign_key_violation -> 400 Bad Request
      - 23502: not_null_violation -> 422 Unprocessable Entity
      - Otros / Desconocidos -> 500 Internal Server Error seguro
    """
    pgcode = _extract_pgcode(exc)
    raw_message = str(getattr(exc, "orig", exc))
    logger.warning(
        f"Violación de integridad SQL en {request.method} {request.url.path} "
        f"[SQLSTATE={pgcode}]: {raw_message}"
    )

    # 1. Unicidad duplicada
    if pgcode == "23505" or "unique constraint" in raw_message.lower():
        # Extracción segura de la clave si viene en el formato estándar de postgres
        match = re.search(r"Key \((.*?)\)=\((.*?)\) already exists", raw_message)
        detail_msg = (
            f"El valor para el campo '{match.group(1)}' ya existe."
            if match else
            "El recurso o registro enviado ya se encuentra registrado."
        )
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": detail_msg}
        )

    # 2. Violación de clave foránea (recurso referenciado no existe)
    if pgcode == "23503" or "foreign key constraint" in raw_message.lower():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": "Uno de los identificadores referenciados no existe en el sistema."}
        )

    # 3. Violación de valor nulo no permitido
    if pgcode == "23502" or "not-null constraint" in raw_message.lower():
        match = re.search(r"column \"(.*?)\"", raw_message)
        col_name = match.group(1) if match else "obligatorio"
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": f"El campo '{col_name}' no puede ser nulo."}
        )

    # 4. Cualquier otra restricción no clasificada (ej: CHECK constraint)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Error de consistencia de datos en la base de datos."}
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