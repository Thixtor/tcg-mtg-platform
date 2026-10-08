# app/core/config.py
from typing import List, Literal, Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Gestiona y valida la configuración del sistema.
    Permite desarrollo ágil local y valida rigor en producción.
    """
    # 1. Metadatos de la API y Entorno
    PROJECT_NAME: str = "TCG MTG Trade & Analytics API"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: Literal["development", "testing", "production"] = "development"

    # Flag para inspeccionar OTP en desarrollo local
    EXPOSE_DEV_OTP: bool = True

    # 2. Seguridad y JWT (Fallback seguro de 64 caracteres para evitar fallos en scripts/CI)
    SECRET_KEY: str = "temporary-development-and-ci-secret-key-32-chars-minimum-fallback-mtg"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 días
    EMAIL_VERIFY_TOKEN_EXPIRE_HOURS: int = 24

    # 3. Base de Datos (Fallback a Postgres estándar si no se pasa)
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/railway"

    # 4. Políticas de CORS y Frontend
    FRONTEND_URL: str = "https://independent-truth-production-b036.up.railway.app"
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://independent-truth-production-b036.up.railway.app",
    ]

    # 5. Configuración de Email SMTP (Gmail / Producción)
    SMTP_HOST: Optional[str] = "smtp.gmail.com"
    SMTP_PORT: Optional[int] = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: str = "TCG MTG Platform"

    # 6. Políticas y Headers de Scryfall
    SCRYFALL_USER_AGENT: str = "MTGCardMarketApp/1.0"
    SCRYFALL_ACCEPT_HEADER: str = "application/json;q=0.9,*/*;q=0.8"

    @model_validator(mode="after")
    def validate_security_settings(self):
        if not self.SECRET_KEY or len(self.SECRET_KEY) < 32:
            raise ValueError("SECRET_KEY debe contener al menos 32 caracteres criptográficamente seguros.")
        if self.ENVIRONMENT == "production":
            if self.EXPOSE_DEV_OTP:
                raise ValueError("EXPOSE_DEV_OTP no puede estar habilitado en entorno de producción.")
            if not self.SMTP_HOST or not self.SMTP_USER or not self.SMTP_PASSWORD:
                raise ValueError("En producción es obligatorio configurar SMTP_HOST, SMTP_USER y SMTP_PASSWORD.")
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()