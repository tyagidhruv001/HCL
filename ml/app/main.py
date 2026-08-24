from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import health, recommend, agent

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="LearnAI ML & Agent Intelligence Microservice"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router)
app.include_router(recommend.router)
app.include_router(agent.router)

@app.get("/")
def root():
    return {
        "service": settings.app_name,
        "version": settings.version,
        "docs": "/docs",
        "health": "/health"
    }
