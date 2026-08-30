from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "LearnPath AI Service"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    LLM_PROVIDER: str = "groq"  # "groq" or "ollama"

    GROQ_API_KEY: str | None = None
    # Groq deprecates/rotates hosted models fairly often — if this 404s or
    # comes back "decommissioned", check https://console.groq.com/docs/models
    # for the current list and update here (and in .env if you overrode it).
    GROQ_MODEL: str = "openai/gpt-oss-20b"

    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:3b"

    YOUTUBE_API_KEY: str | None = None

    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5000"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()
