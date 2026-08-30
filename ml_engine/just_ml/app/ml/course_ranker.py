from app.models.schemas import Course
from app.ml.embeddings import rank_by_semantic_similarity


def rank_courses(
    courses: list[Course],
    skill_gaps: dict[str, float],
    goal: str,
) -> list[tuple[Course, float, list[str]]]:
    """
    Score = 0.6 * skill-gap coverage + 0.4 * semantic similarity to the goal.
    Skill-gap coverage rewards courses that close the learner's biggest gaps.
    Semantic similarity catches relevant courses whose skill tags don't
    exactly match your gap vocabulary (e.g. goal "become an ML engineer" vs
    a course tagged "deep learning").
    """
    if not courses:
        return []

    course_texts = [f"{c.title}. {c.description} Skills: {', '.join(c.skills)}" for c in courses]
    similarities = rank_by_semantic_similarity(goal, course_texts)

    max_gap_score = sum(skill_gaps.values()) or 1.0

    ranked = []
    for course, sim in zip(courses, similarities):
        matched = [s for s in course.skills if skill_gaps.get(s.lower(), 0) > 0]
        gap_score = sum(skill_gaps.get(s.lower(), 0) for s in course.skills) / max_gap_score
        final_score = 0.6 * gap_score + 0.4 * sim
        ranked.append((course, round(final_score, 4), matched))

    ranked.sort(key=lambda x: x[1], reverse=True)
    return ranked
