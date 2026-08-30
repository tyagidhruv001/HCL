"""
safety_precheck.py
-------------------
Runs BEFORE asyncio.gather(web_search, youtube_search) in ask_service.py.

Purpose: catch queries about real people involved in criminal/legal/tragic
real-world matters (trafficking, abuse, terrorism, mass violence, active
criminal cases, etc.) and short-circuit the pipeline with a calm, factual,
non-sensationalized answer instead of running full web+video retrieval.
"""

import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class SafetyVerdict:
    blocked: bool
    category: Optional[str] = None
    reason: Optional[str] = None
    safe_answer: Optional[str] = None


# --- Category definitions -------------------------------------------------
SENSITIVE_ENTITY_TERMS = [
    # names/aliases associated with high-profile criminal/trafficking cases
    "epstein", "epstien", "epsteins", "maxwell trial", "ghislaine maxwell",
]

SENSITIVE_TOPIC_TERMS = [
    "child trafficking", "sex trafficking", "csam", "grooming ring",
    "mass shooting", "school shooter", "terrorist attack plan",
    "how to make a bomb", "how to make a weapon",
]

# Terms that, combined with an entity above, strongly indicate the user
# wants sensational/tabloid content rather than neutral factual info
SENSATIONALIZING_MODIFIERS = [
    "island", "client list", "leaked", "secret tapes", "who went to",
    "celebrities who", "cover up", "conspiracy",
]


def _contains_any(text: str, terms: list[str]) -> Optional[str]:
    text_l = text.lower()
    for term in terms:
        if re.search(rf"\b{re.escape(term)}\b", text_l):
            return term
    return None


def check_query_safety(query: str, learner_context: Optional[dict] = None) -> SafetyVerdict:
    """
    Returns a SafetyVerdict. If blocked=True, the caller should skip
    web_search/youtube_search entirely and return `safe_answer`.
    """
    entity_hit = _contains_any(query, SENSITIVE_ENTITY_TERMS)
    topic_hit = _contains_any(query, SENSITIVE_TOPIC_TERMS)
    sensational_hit = _contains_any(query, SENSATIONALIZING_MODIFIERS)

    if topic_hit:
        return SafetyVerdict(
            blocked=True,
            category="sensitive_topic",
            reason=f"matched sensitive topic term: '{topic_hit}'",
            safe_answer=(
                "This touches on a sensitive real-world topic that's outside "
                "what this learning assistant is built to research or surface "
                "media about. If you're looking for factual background on a "
                "news event, a general search engine or established news outlet "
                "is a better fit than this tool."
            ),
        )

    if entity_hit:
        return SafetyVerdict(
            blocked=True,
            category="real_person_criminal_case",
            reason=f"matched sensitive entity term: '{entity_hit}'"
            + (f", with sensationalizing modifier '{sensational_hit}'" if sensational_hit else ""),
            safe_answer=(
                "That name is associated with a real criminal case, not a "
                "computer science, math, or general-knowledge topic this "
                "research tool is designed to surface web articles and videos "
                "about. I can give a brief, neutral factual summary if that's "
                "genuinely what you're after, but I won't pull in web articles "
                "or video results for a query like this -- that's how "
                "sensationalized content ended up in results before."
            ),
        )

    return SafetyVerdict(blocked=False)
