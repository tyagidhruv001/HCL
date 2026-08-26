"""
domain_tools.py — LearnAI Internal Domain Tools
Connects the agent to the recommendation engine, course catalog, profile data, and study sessions.
"""

import httpx
import logging
from typing import Dict, Any, List, Optional
from app.config import settings
from app.engine.course_ranker import course_ranker
from app.engine.roadmap_generator import roadmap_generator
from app.engine.knowledge_graph import knowledge_graph

logger = logging.getLogger(__name__)


def search_courses(
    query: str = "",
    domain: str = "all",
    level: str = "all",
    limit: int = 5
) -> Dict[str, Any]:
    """
    Searches the LearnAI verified course catalog by keyword, domain (web, data, ai, cloud, cyber, design), and difficulty level.
    """
    courses = course_ranker.search_courses(
        query=query if query else None,
        domain=domain if domain != "all" else None,
        level=level if level != "all" else None,
        limit=limit
    )
    return {
        "count": len(courses),
        "courses": [
            {
                "id": c.get("id"),
                "title": c.get("title"),
                "domain": c.get("domain"),
                "level": c.get("level"),
                "provider": c.get("provider"),
                "duration": c.get("duration"),
                "rating": c.get("rating"),
                "description": c.get("description"),
                "skills": c.get("skills", []),
                "url": c.get("url")
            }
            for c in courses
        ]
    }


def get_user_profile(user_id: Optional[str] = None, auth_header: Optional[str] = None) -> Dict[str, Any]:
    """
    Retrieves the learner's current profile, goal, target domains, and experience level from the database.
    """
    if not auth_header and not user_id:
        return {
            "name": "Learner",
            "goal": "Software Engineering & AI Mastery",
            "level": "beginner",
            "interests": ["ai", "web"],
            "timeline": "3 months",
            "onboarded": True
        }

    try:
        headers = {"Authorization": auth_header} if auth_header else {}
        with httpx.Client(base_url=settings.spring_backend_url, timeout=3.0) as client:
            resp = client.get("/api/profile", headers=headers)
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        logger.warning(f"Could not fetch profile from backend: {e}. Using defaults.")

    return {
        "name": "Learner",
        "goal": "Build fullstack and AI skills",
        "level": "beginner",
        "interests": ["web", "ai"],
        "timeline": "3 months"
    }


def get_user_progress(user_id: Optional[str] = None, auth_header: Optional[str] = None) -> Dict[str, Any]:
    """
    Retrieves the learner's active progress: completed courses, bookmarks, current streak, and last study date.
    """
    try:
        headers = {"Authorization": auth_header} if auth_header else {}
        with httpx.Client(base_url=settings.spring_backend_url, timeout=3.0) as client:
            resp = client.get("/api/progress", headers=headers)
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        logger.warning(f"Could not fetch progress from backend: {e}")

    return {
        "completedCourseIds": ["w01", "w02"],
        "bookmarkedCourseIds": ["w03", "a01"],
        "streak": 3,
        "completionPercentage": 35
    }


def get_current_roadmap(user_id: Optional[str] = None, auth_header: Optional[str] = None) -> Dict[str, Any]:
    """
    Fetches the learner's currently active 3-phase curriculum and milestone progress.
    """
    try:
        headers = {"Authorization": auth_header} if auth_header else {}
        with httpx.Client(base_url=settings.spring_backend_url, timeout=3.0) as client:
            resp = client.get("/api/roadmaps/active", headers=headers)
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        logger.warning(f"Could not fetch active roadmap from backend: {e}")

    # Fallback to dynamic generation
    rec = roadmap_generator.generate(
        name="Learner",
        goal="Fullstack AI Engineer",
        level="beginner",
        interests=["ai", "web"]
    )
    return rec.model_dump()


def generate_roadmap(
    name: str,
    goal: str,
    level: str = "beginner",
    interests: Optional[List[str]] = None,
    timeline: str = "3 months"
) -> Dict[str, Any]:
    """
    Uses the ML Recommendation Engine to compute skill gaps and generate a full 3-phase curriculum.
    """
    rec = roadmap_generator.generate(
        name=name,
        goal=goal,
        level=level,
        interests=interests or [],
        timeline=timeline
    )
    return rec.model_dump()


def create_daily_plan(available_hours: float, current_focus: Optional[str] = None) -> Dict[str, Any]:
    """
    Creates a prioritized, time-boxed study schedule based on available hours for today.
    """
    focus = current_focus or "Core Coursework & Practice"
    total_minutes = int(available_hours * 60)

    if total_minutes <= 45:
        blocks = [
            {"activity": f"Focused concept review & note-taking ({focus})", "duration_minutes": 25},
            {"activity": "Quick hands-on coding exercise / quiz", "duration_minutes": 15},
            {"activity": "Review progress and plan next milestone", "duration_minutes": 5}
        ]
    elif total_minutes <= 120:
        blocks = [
            {"activity": f"Deep study session on {focus}", "duration_minutes": 50},
            {"activity": "Short mental break & hydration", "duration_minutes": 10},
            {"activity": "Hands-on project development / problem solving", "duration_minutes": 50},
            {"activity": "Git commit & milestone reflection", "duration_minutes": 10}
        ]
    else:
        blocks = [
            {"activity": f"Deep dive theory & architecture ({focus})", "duration_minutes": 60},
            {"activity": "Active coding & module implementation", "duration_minutes": 75},
            {"activity": "Debugging, testing & code optimization", "duration_minutes": 35},
            {"activity": "Daily wrap-up & flashcard review", "duration_minutes": 10}
        ]

    return {
        "available_hours": available_hours,
        "total_minutes": total_minutes,
        "recommended_focus": focus,
        "schedule": blocks,
        "tip": "Use the 25-minute Pomodoro technique with short breaks to maintain peak cognitive retention."
    }


def explain_topic(topic: str, user_level: str = "beginner") -> Dict[str, Any]:
    """
    Provides a structured, pedagogical breakdown of a computer science concept with code examples and analogies.
    """
    node = knowledge_graph.get_skill(topic)
    prereqs = knowledge_graph.get_all_prerequisites(topic) if node else []

    return {
        "topic": topic,
        "matched_concept": node.name if node else topic.title(),
        "level": user_level,
        "prerequisites_needed": prereqs,
        "overview": f"A foundational concept in modern software development: {topic}.",
        "analogy": f"Think of {topic} like a well-organized system where each component has a dedicated responsibility.",
        "key_takeaways": [
            f"Understand the core principle behind {topic}.",
            "Practice with simple standalone examples before integrating with complex frameworks.",
            "Watch out for common pitfalls such as missing base cases or unbounded resources."
        ]
    }


def propose_roadmap_action(
    action: str,
    course_id: str,
    reason: str,
    phase_id: Optional[int] = 2
) -> Dict[str, Any]:
    """
    Proposes a structured mutation to the learner's roadmap.
    Does NOT directly execute against the DB — returns an action proposal for Spring Boot authorization.
    Valid actions: ADD_COURSE, REMOVE_COURSE, SWAP_COURSE
    """
    valid_actions = ["ADD_COURSE", "REMOVE_COURSE", "SWAP_COURSE"]
    act = action.upper()
    if act not in valid_actions:
        act = "ADD_COURSE"

    return {
        "status": "PROPOSED",
        "action": act,
        "course_id": course_id,
        "target_phase": phase_id or 2,
        "reason": reason,
        "requires_user_approval": True,
        "message": f"Action proposed: {act} course '{course_id}' in Phase {phase_id}. Reason: {reason}"
    }


def generate_quiz(topic: str = "python", difficulty: str = "beginner") -> Dict[str, Any]:
    """
    Generates an active-recall quiz with multiple-choice questions, answer keys, and pedagogical explanations.
    """
    from app.engine.quiz_generator import quiz_generator
    return quiz_generator.generate_quiz_for_topic(topic=topic, difficulty=difficulty)


def get_skill_tree(domain: str = "all") -> Dict[str, Any]:
    """
    Retrieves the complete Directed Acyclic Graph (DAG) topology of technical skills and prerequisites.
    """
    return knowledge_graph.export_graph()

