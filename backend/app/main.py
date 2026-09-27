from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importación de routers modulares
from app.routers import cards, auth, collections, decks, wishlist, prices

app = FastAPI(
    title="MTG Trade & Analytics API",
    description="API REST Full Stack para intercambio de cartas, gestión de inventario, mazos y cotizaciones históricas.",
    version="1.0.0"
)

# ---------------------------------------------------------
# CONFIGURACIÓN DE CORS (Para conexión con React + Vite)
# ---------------------------------------------------------
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# REGISTRO DE ROUTERS MODULARES
# ---------------------------------------------------------
app.include_router(cards.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(collections.router, prefix="/api")
app.include_router(decks.router, prefix="/api")
app.include_router(wishlist.router, prefix="/api")
app.include_router(prices.router, prefix="/api")


# ---------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------
@app.get("/", tags=["Health Check"])
def health_check():
    return {
        "status": "ok",
        "service": "MTG Trade & Analytics API",
        "version": "1.0.0"
    }