from fastapi import APIRouter, HTTPException
from app.models.schemas import LearnerProfileInput, RecommendationOutput, CoursePhaseOutput
import logging

router = APIRouter(prefix="/api", tags=["Recommendation"])
logger = logging.getLogger(__name__)

@router.post("/recommend", response_model=RecommendationOutput)
def recommend_learning_path(profile: LearnerProfileInput):
    """
    Generates structured AI learning path recommendations based on learner profile.
    Can be backed by scikit-learn / XGBoost model or rule-based scoring engine.
    """
    try:
        title = f"AI Path for {profile.name}"
        desc = f"Targeted path to help you achieve: {profile.goal}"
        duration = profile.timeline or "3 months"
        
        # Structure default 3-phase curriculum
        phases = [
            CoursePhaseOutput(
                id=1,
                title="Foundation & Principles",
                theme=f"Build fundamental skills in {', '.join(profile.interests) if profile.interests else 'core software'}",
                duration="4 weeks",
                milestone="Understand core concepts and setup dev environment",
                courses=[]
            ),
            CoursePhaseOutput(
                id=2,
                title="Core Practical Applications",
                theme="Apply concepts with hands-on exercises and real projects",
                duration="6 weeks",
                milestone="Build standalone projects demonstrating intermediate proficiency",
                courses=[]
            ),
            CoursePhaseOutput(
                id=3,
                title="Advanced Capstone",
                theme="Specialized industry-grade patterns and portfolio building",
                duration="6 weeks",
                milestone="Deploy capstone project and prepare for job readiness",
                courses=[]
            )
        ]
        
        return RecommendationOutput(
            title=title,
            description=desc,
            totalDuration=duration,
            phases=phases
        )
    except Exception as e:
        logger.error(f"Recommendation generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
