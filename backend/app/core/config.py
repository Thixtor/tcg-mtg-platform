from typing import List, Literal
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Gestiona y valida la configuración del sistema.
    Falla en el arranque si las variables críticas no están configuradas apropiadamente.
    """
    # 1. Metadatos de la API y Entorno
    PROJECT_NAME: str = "TCG MTG Trade & Analytics API"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: Literal["development", "testing", "production"] = "production"

    # Flag explícito para desarrollo: nunca implícito por el entorno
    EXPOSE_DEV_OTP: bool = False

    # 2. Seguridad y JWT (Sin defaults inseguros en producción)
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 días

    # 3. Base de Datos
    DATABASE_URL: str

    # 4. Políticas de CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # 5. Políticas y Headers de Scryfall (Conforme a directrices de Scryfall)
    SCRYFALL_USER_AGENT: str = "MTGCardMarketApp/1.0"
    SCRYFALL_ACCEPT_HEADER: str = "application/json;q=0.9,*/*;q=0.8"

    @model_validator(mode="after")
    def validate_security_settings(self):
        if len(self.SECRET_KEY) < 32:
            raise ValueError("SECRET_KEY debe contener al menos 32 caracteres criptográficamente seguros.")
        if self.ENVIRONMENT == "production" and self.EXPOSE_DEV_OTP:
            raise ValueError("EXPOSE_DEV_OTP no puede estar habilitado en entorno de producción.")
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()