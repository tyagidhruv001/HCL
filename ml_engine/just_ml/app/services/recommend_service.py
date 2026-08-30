import json
from pathlib import Path

from app.models.schemas import (
    RecommendationRequest,
    RecommendationResponse,
    Recommendation,
    Course,
)
from app.ml.skill_gap import calculate_skill_gap, infer_required_skills_from_goal
from app.ml.course_ranker import rank_courses

CATALOG_PATH = Path(__file__).resolve().parent.parent / "data" / "courses.json"


def _load_default_catalog() -> list[Course]:
    with open(CATALOG_PATH) as f:
        raw = json.load(f)
    return [Course(**c) for c in raw]


def recommend(request: RecommendationRequest) -> RecommendationResponse:
    courses = request.courses or _load_default_catalog()
    required_skills = infer_required_skills_from_goal(request.learner.goal)
    gaps = calculate_skill_gap(request.learner.skills, required_skills)

    # exclude already-completed courses
    remaining = [c for c in courses if c.id not in request.learner.completed_courses]

    ranked = rank_courses(remaining, gaps, request.learner.goal)

    recommendations = []
    for course, score, matched_skills in ranked[:6]:
        top_gap = max(
            (s for s in course.skills if s.lower() in gaps),
            key=lambda s: gaps.get(s.lower(), 0),
            default=None,
        )
        reason = (
            f"Closes your biggest gap in '{top_gap}' toward your goal of "
            f"'{request.learner.goal}'."
            if top_gap
            else f"Semantically relevant to your goal of '{request.learner.goal}'."
        )
        recommendations.append(
            Recommendation(
                course_id=course.id,
                title=course.title,
                url=course.url,
                score=score,
                matched_skills=matched_skills,
                reason=reason,
            )
        )

    return RecommendationResponse(recommendations=recommendations)
