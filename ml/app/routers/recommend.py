from fastapi import APIRouter, HTTPException
from app.models.schemas import LearnerProfileInput, RecommendationOutput
from app.engine.roadmap_generator import roadmap_generator
import logging

router = APIRouter(prefix="/api", tags=["Recommendation"])
logger = logging.getLogger(__name__)

@router.post("/recommend", response_model=RecommendationOutput)
def recommend_learning_path(profile: LearnerProfileInput):
    """
    Generates structured AI learning path recommendations based on learner profile
    using Knowledge Graph dependency resolution, Skill-Gap analysis, and Multi-Factor Course Ranking.
    """
    try:
        logger.info(f"Generating personalized roadmap for learner: {profile.name} (Goal: {profile.goal})")
        return roadmap_generator.generate(
            name=profile.name,
            goal=profile.goal,
            level=profile.level,
            interests=profile.interests,
            timeline=profile.timeline,
            current_skills=profile.current_skills
        )
    except Exception as e:
        logger.error(f"Recommendation generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

