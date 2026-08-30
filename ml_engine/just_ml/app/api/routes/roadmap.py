from fastapi import APIRouter
from app.models.schemas import RoadmapRequest, RoadmapResponse
from app.services.roadmap_service import generate_roadmap

router = APIRouter(prefix="/roadmap", tags=["Roadmap"])


@router.post("/generate", response_model=RoadmapResponse)
async def roadmap_endpoint(request: RoadmapRequest):
    return await generate_roadmap(request)
