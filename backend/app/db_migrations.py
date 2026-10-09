# backend/app/db_migrations.py
# ============================================================================
# MIGRACIONES AUTOMÁTICAS E IDEMPOTENTES DEL ESQUEMA RELACIONAL (POSTGRESQL)
# ============================================================================
import logging
from sqlalchemy import text
from app.database import engine, Base

# Importación obligatoria de todos los modelos de la aplicación
# para que queden registrados en el objeto Base.metadata antes de create_all
import app.models.card
import app.models.price
try:
    import app.models.user
except ImportError:
    pass

try:
    import app.models.collection
except ImportError:
    pass

try:
    import app.models.deck
except ImportError:
    pass

try:
    import app.models.wishlist
except ImportError:
    pass

try:
    import app.models.trade
except ImportError:
    pass

try:
    import app.models.notification
except ImportError:
    pass

logger = logging.getLogger("migrations")


def run_auto_migrations():
    """
    Garantiza que todas las tablas de la aplicación, columnas e índices críticos
    existan en la base de datos antes de que la API empiece a responder tráfico HTTP.
    Es 100% seguro de ejecutar múltiples veces (IF NOT EXISTS / checkfirst=True).
    """
    logger.info("[Migrations] Comprobando y creando tablas del dominio en la base de datos...")
    try:
        # 1. Habilitar extensión trigramas si aún no está activa
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm;"))

        # 2. Crea de forma segura todas las tablas registradas en Base que no existan
        Base.metadata.create_all(bind=engine, checkfirst=True)
        logger.info("[Migrations] Tablas relacionales verificadas con éxito.")
    except Exception as e:
        logger.error(f"[Migrations] Error al sincronizar las tablas de Base: {e}", exc_info=True)

    # 3. Sentencias idempotentes de soporte sobre tablas existentes
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
        logger.info("[Migrations] Verificación de esquema e índices completada exitosamente.")
    except Exception as e:
        logger.error(f"[Migrations] Error crítico durante la migración automática: {e}", exc_info=True)