from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """ResQVision Backend Configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Groq API Configuration (Backend-only, never exposed to client)
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    # CORS Configuration: comma-separated string or list of allowed origins
    CORS_ORIGINS: str = "http://localhost:3000"

    # File Upload limits
    MAX_UPLOAD_MB: int = 8

    # Local storage directory
    DATA_DIR: str = "../data"

    # Application Version & Mode
    VERSION: str = "0.1.0"
    DEBUG: bool = True

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into a list of origins."""
        if not self.CORS_ORIGINS:
            return ["http://localhost:3000"]
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]

    @property
    def max_upload_bytes(self) -> int:
        """Convert MAX_UPLOAD_MB to bytes."""
        return self.MAX_UPLOAD_MB * 1024 * 1024

    @property
    def is_groq_configured(self) -> bool:
        """Check if a non-empty, non-dummy GROQ_API_KEY is present."""
        if not self.GROQ_API_KEY:
            return False
        cleaned = self.GROQ_API_KEY.strip()
        dummy_values = {"", "your_groq_api_key_here", "none", "null"}
        return cleaned.lower() not in dummy_values


settings = Settings()
