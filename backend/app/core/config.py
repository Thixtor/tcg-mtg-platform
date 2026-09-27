from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


# ---------------------------------------------------------
# CONFIGURACIÓN GLOBAL TIPADA DE LA PLATAFORMA (DOCKER / LOCAL)
# ---------------------------------------------------------
class Settings(BaseSettings):
    """
    Gestiona y valida todas las variables de entorno de la aplicación.
    Toma automáticamente la variable DATABASE_URL inyectada por Docker Compose.
    """
    # 1. Metadatos de la API
    PROJECT_NAME: str = "MTG Trade & Analytics API"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # 2. Conexión a Base de Datos (PostgreSQL)
    # Por defecto usa las credenciales reales de tu docker-compose.yml
    DATABASE_URL: str = "postgresql://admin:secretpassword@db:5432/mtg_market"

    # 3. Políticas de CORS (Frontend en React / Vite)
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # 4. Políticas y Headers de Scryfall (Fan Content Policy)
    SCRYFALL_USER_AGENT: str = "MTGCardMarketApp/1.0"
    SCRYFALL_ACCEPT_HEADER: str = "application/json;q=0.9,*/*;q=0.8"

    # Configuración de Pydantic Settings V2
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


# Instancia única (Singleton) para consumo global en la aplicación
settings = Settings()