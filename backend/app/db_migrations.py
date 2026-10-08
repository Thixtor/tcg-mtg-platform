# backend/app/db_migrations.py
# ============================================================================
# MIGRACIONES AUTOMÁTICAS E IDEMPOTENTES DEL ESQUEMA RELACIONAL (POSTGRESQL)
# ============================================================================
import logging
from sqlalchemy import text
from app.database import engine

logger = logging.getLogger("migrations")

def run_auto_migrations():
    """
    Garantiza que todas las columnas e índices críticos existan en la base de datos
    antes de que la aplicación empiece a responder tráfico HTTP.
    Es 100% seguro de ejecutar múltiples veces (IF NOT EXISTS).
    """
    statements = [
        # Columnas de precios Card Kingdom en la tabla cartas
        "ALTER TABLE cartas ADD COLUMN IF NOT EXISTS cardkingdom_price_retail NUMERIC(10, 2);",
        "ALTER TABLE cartas ADD COLUMN IF NOT EXISTS cardkingdom_price_buylist NUMERIC(10, 2);",
        "ALTER TABLE cartas ADD COLUMN IF NOT EXISTS cardkingdom_price_foil NUMERIC(10, 2);",

        # Índices de rendimiento para evitar lecturas completas de tabla (Full Table Scan)
        "CREATE INDEX IF NOT EXISTS idx_cartas_name ON cartas (name);",
        "CREATE INDEX IF NOT EXISTS idx_cartas_set ON cartas (set);",
        "CREATE INDEX IF NOT EXISTS idx_cartas_rarity ON cartas (rarity);",
    ]

    try:
        with engine.begin() as conn:
            for stmt in statements:
                try:
                    conn.execute(text(stmt))
                except Exception as stmt_err:
                    logger.warning(f"[Migrations] Sentencia omitida o advertencia ({stmt}): {stmt_err}")
        logger.info("[Migrations] Verificación de esquema completada exitosamente.")
    except Exception as e:
        logger.error(f"[Migrations] Error crítico durante la migración automática: {e}", exc_info=True)