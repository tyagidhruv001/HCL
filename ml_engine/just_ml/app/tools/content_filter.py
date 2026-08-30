"""
content_filter.py
------------------
Filters retrieved web_results / video_results AFTER asyncio.gather()
but BEFORE prompts.build_ask_prompt() assembles the context blocks.
"""

import re
from typing import Any


CLICKBAIT_PATTERNS = [
    r"\bwent to\b.*\bisland\b",
    r"\bleaked\b",
    r"\bsecret tapes?\b",
    r"\bcover[\s\-]?up\b",
    r"\bsneaking (on|in)to\b",
    r"educational purposes\s*⚠️",
    r"you won'?t believe",
    r"\bexposed\b",
    r"\bconspiracy\b",
]

SENSITIVE_SUBJECT_TERMS = [
    "epstein", "epstien", "trafficking", "csam", "child abuse",
    "grooming", "mass shooting", "school shooter",
]

MAX_TITLE_LEN_FOR_SNIPPET_CHECK = 300


def _is_clickbait_or_sensitive(title: str, description: str = "") -> bool:
    combined = f"{title} {description}".lower()

    for pattern in CLICKBAIT_PATTERNS:
        if re.search(pattern, combined, re.IGNORECASE):
            return True

    for term in SENSITIVE_SUBJECT_TERMS:
        if re.search(rf"\b{re.escape(term)}\b", combined):
            return True

    return False


def _get_field(item: Any, field_name: str) -> str:
    if isinstance(item, dict):
        return str(item.get(field_name, "") or "")
    return str(getattr(item, field_name, "") or "")


def filter_web_results(results: list[Any]) -> list[Any]:
    """
    Filters a list of Source objects or dicts, removing clickbait/sensitive entries.
    """
    cleaned = []
    for r in results or []:
        title = _get_field(r, "title")
        snippet = _get_field(r, "snippet")
        if _is_clickbait_or_sensitive(title, snippet):
            continue
        cleaned.append(r)
    return cleaned


def filter_video_results(results: list[Any]) -> list[Any]:
    """
    Filters a list of VideoResult objects or dicts, removing clickbait/sensitive entries.
    """
    cleaned = []
    for r in results or []:
        title = _get_field(r, "title")
        channel = _get_field(r, "channel")
        if _is_clickbait_or_sensitive(title, channel):
            continue
        cleaned.append(r)
    return cleaned


def filtering_removed_everything(original_count: int, filtered_count: int) -> bool:
    """
    Helper: returns True if filtering stripped ALL results when some originally existed.
    """
    return original_count > 0 and filtered_count == 0
