import asyncio
import httpx
from app.models.schemas import Source

_MAX_ATTEMPTS = 2

async def search_web(query: str, max_results: int = 5) -> list[Source]:
    sources = []
    
    # 1. Wikipedia Summary / Open Knowledge Search
    try:
        wiki_url = "https://en.wikipedia.org/w/api.php"
        params = {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "format": "json",
            "srlimit": max_results,
        }
        async with httpx.AsyncClient(timeout=6) as client:
            resp = await client.get(wiki_url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("query", {}).get("search", []):
                    title = item.get("title", "")
                    clean_snippet = item.get("snippet", "").replace('<span class="searchmatch">', '').replace('</span>', '')
                    sources.append(
                        Source(
                            title=title,
                            url=f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}",
                            snippet=clean_snippet,
                        )
                    )
    except Exception as e:
        print(f"[web_search] wiki fetch error: {e}")

    return sources

def format_sources_for_prompt(sources: list[Source]) -> str:
    if not sources:
        return ""
    lines = []
    for i, s in enumerate(sources, 1):
        lines.append(f"[{i}] {s.title}\n{s.snippet}\nURL: {s.url}")
    return "\n\n".join(lines)
