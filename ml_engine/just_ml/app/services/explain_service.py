from app.llm.client import generate
from app.llm.prompts import EXPLAIN_SYSTEM_PROMPT, build_explain_prompt
from app.ml.skill_gap import calculate_skill_gap, infer_required_skills_from_goal
from app.models.schemas import ExplainRequest, ExplainResponse


async def explain(request: ExplainRequest) -> ExplainResponse:
    required = infer_required_skills_from_goal(request.learner.goal)
    gaps = calculate_skill_gap(request.learner.skills, required)
    relevant_gaps = {s: g for s, g in gaps.items() if s in [x.lower() for x in request.course.skills]}

    prompt = build_explain_prompt(
        learner_json=request.learner.model_dump_json(),
        course_json=request.course.model_dump_json(),
        gap_json=str(relevant_gaps),
    )
    text = await generate(prompt, system=EXPLAIN_SYSTEM_PROMPT)

    return ExplainResponse(
        course_id=request.course.id,
        explanation=text.strip(),
        skill_gap_addressed=relevant_gaps,
    )
