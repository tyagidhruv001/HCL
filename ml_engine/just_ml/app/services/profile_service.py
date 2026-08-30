import json
import re

from app.llm.client import generate
from app.models.schemas import ProfileExtractRequest, LearnerProfile, Skill

EXTRACT_SYSTEM_PROMPT = """Extract a structured learner profile from free text.
Return STRICT JSON only, no commentary, matching:
{
  "goal": "string - what the learner wants to achieve",
  "experience_level": "beginner | intermediate | advanced",
  "weekly_hours": 5,
  "skills": [{"name": "string", "level": 0}],
  "interests": ["string"]
}
If a field isn't mentioned, make a reasonable default (weekly_hours: 5,
experience_level: "beginner", skills: [], interests: []). Never leave a field out."""


async def extract_profile(request: ProfileExtractRequest) -> LearnerProfile:
    prompt = f"Learner message: {request.message}"
    raw = await generate(prompt, system=EXTRACT_SYSTEM_PROMPT)
    data = _safe_parse_json(raw) or {}

    base = request.existing_profile.model_dump() if request.existing_profile else {
        "user_id": request.user_id,
        "goal": "",
        "experience_level": "beginner",
        "weekly_hours": 5,
        "skills": [],
        "interests": [],
        "completed_courses": [],
    }

    base["user_id"] = request.user_id
    if data.get("goal"):
        base["goal"] = data["goal"]
    if data.get("experience_level"):
        base["experience_level"] = data["experience_level"]
    if data.get("weekly_hours"):
        base["weekly_hours"] = data["weekly_hours"]
    if data.get("skills"):
        base["skills"] = data["skills"]
    if data.get("interests"):
        base["interests"] = list(set(base.get("interests", []) + data["interests"]))

    return LearnerProfile(**base)


def _safe_parse_json(raw: str) -> dict | None:
    raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return None
    return None
