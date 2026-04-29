from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://workload:workload@localhost:5432/workload_dev"
    )
    DATABASE_URL_SYNC: str = Field(
        default="postgresql+psycopg2://workload:workload@localhost:5432/workload_dev"
    )
    TEST_DATABASE_URL: str = Field(
        default="postgresql+asyncpg://workload:workload@localhost:5432/workload_test"
    )
    TEST_DATABASE_URL_SYNC: str = Field(
        default="postgresql+psycopg2://workload:workload@localhost:5432/workload_test"
    )

    JWT_SECRET: str = Field(default="dev-secret-change-me")
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=480)

    SEED_USERS: bool = Field(default=False)

    CORS_ORIGINS: str = Field(default="http://localhost:4200")

    # Per-IP rate limit on the login endpoint (slowapi syntax, e.g. "10/minute").
    LOGIN_RATE_LIMIT: str = Field(default="10/minute")

    LOG_LEVEL: str = Field(default="INFO")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
