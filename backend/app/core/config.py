import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    APP_NAME: str = "SupportPilot"
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    PUBLIC_BASE_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ALLOWED_ORIGINS: Union[List[str], str] = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://localhost:5173"

    SECRET_KEY: str = "dev-secret-jwt-key-change-in-production-supportpilot-2026-auth"
    ENCRYPTION_KEY: str = "dGhpc2lzYTMydGVzdGtleTEyMzQ1Njc4OTAxMjM0NTY="
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    DATABASE_URL: str = "sqlite:///./supportpilot.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    AI_PROVIDER: str = "mock"
    GEMINI_API_KEY: str = ""
    GEMINI_CHAT_MODEL: str = "gemini-1.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"
    EMBEDDING_DIMENSIONS: int = 768

    WHATSAPP_APP_SECRET: str = ""
    WHATSAPP_VERIFY_TOKEN: str = "supportpilot_demo_verify_token"
    WHATSAPP_API_VERSION: str = "v20.0"

    SMTP_HOST: str = "smtp.example.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "support@supportpilot.ai"

    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 25

    BILLING_PROVIDER: str = "mock"
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    @field_validator("CORS_ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, tuple)):
            return [str(i).strip() for i in v]
        return ["*"]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
