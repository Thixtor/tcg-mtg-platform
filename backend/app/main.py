# ---------------------------------------------------------
# PUNTO DE ENTRADA PRINCIPAL: FASTAPI APP
# ---------------------------------------------------------
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

# Importación de configuración, limitador y routers
from app.core.config import settings
from app.core.limiter import limiter
from app.routers import cards, auth, users, collections, decks, wishlist, prices, trade

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API REST Full Stack para intercambio de cartas, gestión de inventario, mazos y cotizaciones históricas.",
    version=settings.PROJECT_VERSION
)

# Configuración de Rate Limiting global
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro de routers
app.include_router(cards.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(collections.router, prefix=settings.API_V1_STR)
app.include_router(decks.router, prefix=settings.API_V1_STR)
app.include_router(wishlist.router, prefix=settings.API_V1_STR)
app.include_router(prices.router, prefix=settings.API_V1_STR)
app.include_router(trade.router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health Check"])
def health_check():
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION
    }