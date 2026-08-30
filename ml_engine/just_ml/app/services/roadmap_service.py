import json
import re

from app.llm.client import generate
from app.llm.prompts import ROADMAP_SYSTEM_PROMPT, build_roadmap_prompt
from app.models.schemas import RoadmapRequest, RoadmapResponse
from app.services.recommend_service import _load_default_catalog


async def generate_roadmap(request: RoadmapRequest) -> RoadmapResponse:
    courses = request.available_courses or _load_default_catalog()

    prompt = build_roadmap_prompt(
        learner_json=request.learner.model_dump_json(),
        courses_json=json.dumps([c.model_dump() for c in courses]),
    )

    raw = await generate(prompt, system=ROADMAP_SYSTEM_PROMPT)
    data = _safe_parse_json(raw)

    if data is None:
        # Deterministic fallback so the demo NEVER shows a raw 500 error.
        data = _fallback_roadmap(courses)

    return RoadmapResponse(**data)


def _safe_parse_json(raw: str) -> dict | None:
    """
    Small local/cloud models occasionally wrap JSON in prose or code fences.
    Try straight parsing first, then extract the first {...} block before
    giving up — this is what the original naive json.loads(result) was
    missing, and it's the #1 place a hackathon demo silently breaks.
    """
    raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return None


def _fallback_roadmap(courses) -> dict:
    """Simple deterministic roadmap (prerequisite order) if the LLM output is unusable."""
    ordered = sorted(courses, key=lambda c: len(c.prerequisites))
    third = max(1, len(ordered) // 3)
    phases = []
    for i in range(3):
        chunk = ordered[i * third: (i + 1) * third] if i < 2 else ordered[2 * third:]
        if not chunk:
            continue
        phases.append(
            {
                "phase_number": i + 1,
                "title": f"Phase {i + 1}",
                "duration_weeks": max(2, len(chunk) * 2),
                "course_ids": [c.id for c in chunk],
                "milestones": [
                    {
                        "title": f"Complete {chunk[-1].title}",
                        "description": "Finish the final course in this phase and review core concepts.",
                    }
                ],
            }
        )
    return {
        "title": "Your Learning Roadmap",
        "total_duration_weeks": sum(p["duration_weeks"] for p in phases),
        "phases": phases,
    }
