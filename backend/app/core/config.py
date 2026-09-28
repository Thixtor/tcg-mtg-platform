from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


# ---------------------------------------------------------
# CONFIGURACIÓN GLOBAL TIPADA DE LA PLATAFORMA (DOCKER / LOCAL)
# ---------------------------------------------------------
class Settings(BaseSettings):
    """
    Gestiona y valida todas las variables de entorno de la plataforma.
    """
    # 1. Metadatos de la API y Entorno
    PROJECT_NAME: str = "TCG MTG Trade & Analytics API"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"  # "development" | "production" | "testing"

    # 2. Seguridad y JWT
    SECRET_KEY: str = "cambia_esta_clave_secreta_en_produccion_por_favor_min_32_chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 días

    # 3. Conexión a Base de Datos (PostgreSQL)
    DATABASE_URL: str = "postgresql://admin:secretpassword@db:5432/mtg_market"

    # 4. Políticas de CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # 5. Políticas y Headers de Scryfall
    SCRYFALL_USER_AGENT: str = "MTGCardMarketApp/1.0"
    SCRYFALL_ACCEPT_HEADER: str = "application/json;q=0.9,*/*;q=0.8"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()