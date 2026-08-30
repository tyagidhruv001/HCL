from fastapi import APIRouter
from app.models.schemas import ProfileExtractRequest, LearnerProfile
from app.services.profile_service import extract_profile

router = APIRouter(prefix="/profile", tags=["Learner Profiling"])


@router.post("/extract", response_model=LearnerProfile)
async def extract_profile_endpoint(request: ProfileExtractRequest):
    """Turns a learner's free-text description of their goals into a structured profile."""
    return await extract_profile(request)
