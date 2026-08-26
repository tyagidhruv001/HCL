import os

try:
    from pydantic_settings import BaseSettings
    class Settings(BaseSettings):
        app_name: str = "LearnAI ML Intelligence Service"
        version: str = "1.0.0"
        debug: bool = False
        
        # Microservice Integration
        spring_backend_url: str = os.getenv("BACKEND_URL", "http://localhost:5050")
        
        # Ollama / Local LLM
        ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        ollama_model: str = os.getenv("OLLAMA_MODEL", "qwen2.5:latest")
        
        # Gemini AI Fallback
        gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
        gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

        class Config:
            env_file = ".env"
            extra = "ignore"
except ImportError:
    from pydantic import BaseModel
    class Settings(BaseModel):
        app_name: str = "LearnAI ML Intelligence Service"
        version: str = "1.0.0"
        debug: bool = False
        spring_backend_url: str = os.getenv("BACKEND_URL", "http://localhost:5050")
        ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        ollama_model: str = os.getenv("OLLAMA_MODEL", "qwen2.5:latest")
        gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
        gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

settings = Settings()
