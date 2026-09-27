from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

# Importación de dependencias del núcleo
from app.database import get_db
from app.models import CartaScryfall
from app.schemas import CardResponse

router = APIRouter(
    prefix="/cards",
    tags=["Catálogo y Buscador"]
)


# ---------------------------------------------------------
# 1. BÚSQUEDA DE CARTAS EN CATÁLOGO LOCAL (POSTGRESQL)
# ---------------------------------------------------------
@router.get(
    "/search",
    response_model=List[CardResponse],
    summary="Buscar cartas en el catálogo local",
    description="Permite buscar cartas por coincidencia parcial de nombre (ilike), con paginación y límite."
)
def search_cards(
    q: str = Query(..., min_length=2, description="Texto de búsqueda para el nombre de la carta"),
    limit: int = Query(20, ge=1, le=100, description="Límite de resultados a retornar"),
    db: Session = Depends(get_db)
):
    """
    Realiza una búsqueda rápida insensible a mayúsculas/minúsculas sobre
    la columna indexada 'name' en la base de datos local.
    """
    resultados = (
        db.query(CartaScryfall)
        .filter(CartaScryfall.name.ilike(f"%{q}%"))
        .limit(limit)
        .all()
    )
    return resultados


# ---------------------------------------------------------
# 2. DETALLE DE UNA CARTA POR ID
# ---------------------------------------------------------
@router.get(
    "/{card_id}",
    response_model=CardResponse,
    summary="Obtener el detalle completo de una carta",
    description="Retorna la información relacional y el payload JSON original de Scryfall de la carta."
)
def get_card_by_id(
    card_id: str,
    db: Session = Depends(get_db)
):
    """
    Consulta directa por la clave primaria 'id' (Scryfall UUID).
    """
    carta = db.query(CartaScryfall).filter(CartaScryfall.id == card_id).first()
    if not carta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La carta con ID '{card_id}' no fue encontrada en el catálogo."
        )
    return carta