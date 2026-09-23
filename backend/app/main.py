import os
import psycopg2
from typing import List, Optional
from fastapi import FastAPI, Depends, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

# Herramientas internas
from app.database import get_db
from app.models import CartaScryfall  # Importamos la clase real
from app.schemas import CardResponse

# Instancia principal de FastAPI
app = FastAPI(
    title="TCG Card Market API",
    description="Backend para búsqueda y gestión de cartas MTG",
    version="1.0.0"
)

# Configuración de CORS
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

DATABASE_URL = os.getenv("DATABASE_URL")


# --- Rutas de Diagnóstico ---

@app.get("/", tags=["Diagnóstico"])
def read_root():
    """Comprueba que el backend responde."""
    return {"status": "online", "mensaje": "Servidor backend de TCG funcionando"}


@app.get("/db-test", tags=["Diagnóstico"])
def test_db_connection():
    """Prueba rápida de conexión cruda a PostgreSQL."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("SELECT version();")
        db_version = cur.fetchone()
        cur.close()
        conn.close()
        return {"status": "success", "version": db_version[0]}
    except Exception as error:
        return {"status": "error", "detalle": str(error)}


# --- Rutas de Catálogo de Cartas ---

@app.get("/api/cards/search", response_model=List[CardResponse], tags=["Cartas"])
def search_cards(
    q: str = Query(..., min_length=2, description="Texto o nombre de la carta a buscar"),
    set_code: Optional[str] = Query(None, description="Código de la edición (ej. mh3)"),
    limit: int = Query(20, ge=1, le=100, description="Límite de resultados"),
    offset: int = Query(0, ge=0, description="Paginación"),
    db: Session = Depends(get_db)
):
    """
    Busca cartas en el catálogo local por nombre o edición (insensible a mayúsculas).
    """
    query = db.query(CartaScryfall).filter(CartaScryfall.name.ilike(f"%{q}%"))
    
    if set_code:
        query = query.filter(func.lower(CartaScryfall.set) == set_code.lower())
        
    return query.offset(offset).limit(limit).all()


@app.get("/api/cards/{card_id}", response_model=CardResponse, tags=["Cartas"])
def get_card_by_id(card_id: str, db: Session = Depends(get_db)):
    """
    Obtiene los datos completos de una carta por su UUID.
    """
    card = db.query(CartaScryfall).filter(CartaScryfall.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Carta no encontrada")
    return card