from fastapi import APIRouter
from app.models.schemas import RecommendationRequest, RecommendationResponse
from app.services.recommend_service import recommend

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.post("/generate", response_model=RecommendationResponse)
async def generate_recommendations(request: RecommendationRequest):
    return recommend(request)
