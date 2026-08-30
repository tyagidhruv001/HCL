"""
YouTube search tool.

Two modes:
- No YOUTUBE_API_KEY set -> scrapes YouTube's public search results page
  directly with httpx (no key/quota needed — good enough for a hackathon
  demo). We do this ourselves instead of using `youtube-search-python`:
  that library calls httpx.post(..., proxies=...) internally, and `proxies`
  was removed from httpx's API in 0.28+, so the whole library throws on
  every call with newer httpx. Rather than pin httpx backwards (which the
  rest of the app doesn't need), we just don't depend on that library.
- YOUTUBE_API_KEY set -> uses the official YouTube Data API v3 (more
  reliable, has a daily quota). Prefer this for anything beyond a demo.
"""

import json
import re
import httpx
from app.core.config import settings
from app.models.schemas import VideoResult

_HEADERS = {
    # A browser-like UA avoids YouTube serving a stripped-down response
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


VIDEO_KEYWORDS = [
    "youtube", "video", "videos", "watch", "tutorial", "tutorials",
    "lecture", "lectures", "playlist", "clip", "stream", "channel",
    "video lecture", "video tutorial"
]


def wants_videos(query: str) -> bool:
    """Check if the user is explicitly requesting video recommendations or links."""
    if not query:
        return False
    q = query.lower()
    return any(re.search(rf"\b{re.escape(k)}\b", q) for k in VIDEO_KEYWORDS)


async def search_youtube(query: str, max_results: int = 4) -> list[VideoResult]:
    if settings.YOUTUBE_API_KEY:
        return await _search_official_api(query, max_results)
    return await _search_keyless(query, max_results)


async def _search_official_api(query: str, max_results: int) -> list[VideoResult]:
    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "snippet",
        "q": f"{query} tutorial",
        "type": "video",
        "maxResults": max_results,
        "key": settings.YOUTUBE_API_KEY,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        print(f"[youtube_search] official API failed: {e}")
        return []

    results = []
    for item in data.get("items", []):
        vid = item["id"].get("videoId")
        if not vid:
            continue
        snippet = item["snippet"]
        results.append(
            VideoResult(
                title=snippet.get("title", ""),
                url=f"https://www.youtube.com/watch?v={vid}",
                channel=snippet.get("channelTitle", ""),
                thumbnail=snippet.get("thumbnails", {}).get("medium", {}).get("url", ""),
            )
        )
    return results


_YT_INITIAL_DATA_RE = re.compile(r"var ytInitialData\s*=\s*({.*?});", re.DOTALL)


async def _search_keyless(query: str, max_results: int) -> list[VideoResult]:
    url = "https://www.youtube.com/results"
    params = {"search_query": f"{query} tutorial"}

    try:
        async with httpx.AsyncClient(timeout=10, headers=_HEADERS) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            html = resp.text
    except Exception as e:
        print(f"[youtube_search] page fetch failed: {e}")
        return []

    match = _YT_INITIAL_DATA_RE.search(html)
    if not match:
        print("[youtube_search] could not locate ytInitialData in page")
        return []

    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError as e:
        print(f"[youtube_search] failed to parse ytInitialData: {e}")
        return []

    video_renderers = _extract_video_renderers(data)
    results = []
    for renderer in video_renderers:
        result = _parse_video_renderer(renderer)
        if result:
            results.append(result)
        if len(results) >= max_results:
            break
    return results


def _extract_video_renderers(data: dict) -> list[dict]:
    """Walk the known path to search result items; YouTube's layout can
    shift, so this degrades to an empty list rather than raising if the
    structure has changed since this was written."""
    try:
        contents = (
            data["contents"]["twoColumnSearchResultsRenderer"]["primaryContents"]
            ["sectionListRenderer"]["contents"]
        )
        renderers = []
        for section in contents:
            items = section.get("itemSectionRenderer", {}).get("contents", [])
            for item in items:
                if "videoRenderer" in item:
                    renderers.append(item["videoRenderer"])
        return renderers
    except (KeyError, TypeError) as e:
        print(f"[youtube_search] unexpected page structure: {e}")
        return []


def _parse_video_renderer(renderer: dict) -> VideoResult | None:
    try:
        video_id = renderer["videoId"]
        title = renderer["title"]["runs"][0]["text"]
        channel = renderer.get("ownerText", {}).get("runs", [{}])[0].get("text", "")
        thumbnails = renderer.get("thumbnail", {}).get("thumbnails", [])
        thumbnail = thumbnails[-1]["url"] if thumbnails else ""
        duration = renderer.get("lengthText", {}).get("simpleText")
        return VideoResult(
            title=title,
            url=f"https://www.youtube.com/watch?v={video_id}",
            channel=channel,
            thumbnail=thumbnail,
            duration=duration,
        )
    except (KeyError, IndexError, TypeError):
        return None
