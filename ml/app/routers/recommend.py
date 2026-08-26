from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any
from app.models.schemas import LearnerProfileInput, RecommendationOutput
from app.engine.roadmap_generator import roadmap_generator
from app.engine.knowledge_graph import knowledge_graph
from app.engine.quiz_generator import quiz_generator
from pydantic import BaseModel
import logging

router = APIRouter(prefix="/api", tags=["Recommendation & Knowledge"])
logger = logging.getLogger(__name__)


class QuizRequest(BaseModel):
    topic: str
    difficulty: Optional[str] = "beginner"
    num_questions: Optional[int] = 3


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


@router.post("/quiz/generate")
def generate_skill_quiz(request: QuizRequest) -> Dict[str, Any]:
    """
    Generates active-recall skill assessment quizzes with multiple choices and instant feedback.
    """
    try:
        return quiz_generator.generate_quiz_for_topic(
            topic=request.topic,
            difficulty=request.difficulty or "beginner",
            num_questions=request.num_questions or 3
        )
    except Exception as e:
        logger.error(f"Quiz generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/skills/graph")
def get_skills_knowledge_graph(domain: Optional[str] = "all") -> Dict[str, Any]:
    """
    Returns the Directed Acyclic Graph (DAG) topology of technical competencies, prerequisites, and dependencies.
    """
    try:
        return knowledge_graph.export_graph()
    except Exception as e:
        logger.error(f"Knowledge graph export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
