from app.models.schemas import Skill


def calculate_skill_gap(
    current_skills: list[Skill],
    required_skills: dict[str, float],
) -> dict[str, float]:
    """required_skills e.g. {'python': 8, 'sql': 6} -> gap per skill, floor 0."""
    current = {s.name.lower(): s.level for s in current_skills}
    return {
        skill: max(0.0, required_level - current.get(skill.lower(), 0.0))
        for skill, required_level in required_skills.items()
    }


def infer_required_skills_from_goal(goal: str) -> dict[str, float]:
    """
    Very small heuristic mapping until you wire this to something smarter
    (e.g. ask the LLM to extract required skills from the goal, or build a
    goal -> skill-tree lookup). Kept simple and explicit on purpose so it's
    easy to extend during the hackathon.
    """
    goal_lower = goal.lower()
    mapping = {
        "backend": {"python": 7, "sql": 7, "system design": 6, "apis": 7},
        "frontend": {"javascript": 7, "react": 7, "css": 6, "html": 6},
        "data scien": {"python": 8, "statistics": 7, "machine learning": 7, "sql": 6},
        "machine learning": {"python": 8, "statistics": 7, "machine learning": 8},
        "full stack": {"javascript": 6, "react": 6, "node": 6, "sql": 6},
        "devops": {"linux": 7, "docker": 7, "ci/cd": 6, "cloud": 6},
    }
    for key, skills in mapping.items():
        if key in goal_lower:
            return skills
    # generic fallback
    return {"problem solving": 6, "python": 5}
