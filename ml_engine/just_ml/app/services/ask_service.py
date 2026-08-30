import asyncio
import json

from app.llm.client import generate
from app.llm.prompts import (
    ASK_SYSTEM_PROMPT,
    SAFE_REDIRECT_SYSTEM_PROMPT,
    build_ask_prompt,
    build_safe_redirect_prompt,
)
from app.tools.safety_precheck import check_query_safety
from app.tools.content_filter import (
    filter_web_results,
    filter_video_results,
    filtering_removed_everything,
)
from app.tools.web_search import search_web, format_sources_for_prompt
from app.tools.youtube_search import search_youtube, wants_videos
from app.models.schemas import AskRequest, AskResponse


async def ask(request: AskRequest) -> AskResponse:
    # 1. Safety precheck: Catch sensitive/criminal cases before retrieval to avoid surfacing clickbait
    verdict = check_query_safety(request.query)
    if verdict.blocked:
        safe_answer = verdict.safe_answer
        if not safe_answer:
            redirect_prompt = build_safe_redirect_prompt(request.query, verdict.reason or "sensitive query")
            safe_answer = await generate(redirect_prompt, system=SAFE_REDIRECT_SYSTEM_PROMPT)

        return AskResponse(
            query=request.query,
            answer=safe_answer,
            key_points=[],
            sources=[],
            videos=[],
            related_questions=[],
        )

    is_video_requested = wants_videos(request.query)

    # 2. Run web search, and YouTube search ONLY when the user asks for videos
    if is_video_requested:
        raw_sources, raw_videos = await asyncio.gather(
            search_web(request.query, max_results=5),
            search_youtube(request.query, max_results=4),
        )
        videos = filter_video_results(raw_videos)
    else:
        raw_sources = await search_web(request.query, max_results=5)
        videos = []
        raw_videos = []

    # 3. Filter retrieved web sources for clickbait and sensitive terms
    sources = filter_web_results(raw_sources)

    # If filtering removed everything, fall back to pure knowledge generation without corrupted context
    all_removed = filtering_removed_everything(
        len(raw_sources) + len(raw_videos), len(sources) + len(videos)
    )

    web_context_str = "" if all_removed else format_sources_for_prompt(sources)
    video_context_str = "" if (all_removed or not is_video_requested) else "\n".join(f"- {v.title} ({v.channel}): {v.url}" for v in videos)

    # 4. Build learner context (strictly for tone/depth calibration)
    learner_context = ""
    if request.learner:
        learner_context = (
            f"Target Goal: {request.learner.goal}\n"
            f"Experience Level: {request.learner.experience_level}"
        )

    prompt = build_ask_prompt(
        query=request.query,
        web_context=web_context_str,
        video_context=video_context_str,
        learner_context=learner_context,
    )

    # 5. High-speed LLM generation
    answer_text = await generate(prompt, system=ASK_SYSTEM_PROMPT)
    key_points = await _extract_key_points(answer_text)

    return AskResponse(
        query=request.query,
        answer=answer_text,
        key_points=key_points,
        sources=sources,
        videos=videos,
        related_questions=[],
    )


async def _extract_key_points(answer_text: str, max_points: int = 4) -> list[str]:
    """
    Cheap key-point extraction without a second LLM call: take the first
    sentence of each paragraph/bullet.
    """
    lines = [l.strip("-* ").strip() for l in answer_text.split("\n") if l.strip()]
    points = []
    for line in lines:
        if len(line) > 20 and not line.endswith(":"):
            points.append(line.split(". ")[0].rstrip(".") + ".")
        if len(points) >= max_points:
            break
    return points

