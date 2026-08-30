from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes.health import router as health_router
from app.api.routes.ask import router as ask_router
from app.api.routes.profile import router as profile_router
from app.api.routes.recommend import router as recommend_router
from app.api.routes.roadmap import router as roadmap_router
from app.api.routes.explain import router as explain_router
from app.api.routes.resume_parser import router as resume_parser_router

app = FastAPI(title=settings.APP_NAME, version="1.0.0")

# Allow your React dev server / Express backend to call this service directly
# during development. In production, only Express should call this (server-to-
# server), so you can tighten this later.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in [health_router, ask_router, profile_router, recommend_router, roadmap_router, explain_router, resume_parser_router]:
    app.include_router(r, prefix="/api/v1")
