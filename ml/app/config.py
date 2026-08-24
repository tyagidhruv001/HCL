import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "LearnAI ML Intelligence Service"
    version: str = "1.0.0"
    debug: bool = False
    
    # Microservice Integration
    spring_backend_url: str = os.getenv("BACKEND_URL", "http://localhost:5000")
    
    # Gemini AI
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
