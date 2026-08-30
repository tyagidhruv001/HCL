"""
Pluggable LLM client.

Why Groq as the default: it's a free, hosted, OpenAI-compatible API that runs
open models (Llama 3.3 etc.) at very high speed. For a hackathon demo this
matters a lot more than people think — a laptop running Ollama alongside
React + Express + this service can choke live on stage. Groq just needs
internet and an API key (free at console.groq.com).

Ollama is kept as a drop-in fallback for offline development or if you'd
rather not depend on venue wifi. Switch providers with one env var:
LLM_PROVIDER=groq | ollama
"""

from app.core.config import settings


async def generate(prompt: str, system: str | None = None) -> str:
    if settings.LLM_PROVIDER == "ollama":
        return await _generate_ollama(prompt, system)
    return await _generate_groq(prompt, system)


async def _generate_groq(prompt: str, system: str | None) -> str:
    import httpx

    if not settings.GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Get a free key at https://console.groq.com "
            "or set LLM_PROVIDER=ollama in .env to run fully local."
        )

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY.strip()}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.GROQ_MODEL,
                    "messages": messages,
                    "temperature": 0.4,
                    "max_tokens": 2048,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        msg = str(e).lower()
        if "does not exist" in msg or "decommissioned" in msg or "not_found" in msg:
            raise RuntimeError(
                f"Groq model '{settings.GROQ_MODEL}' is unavailable (renamed/decommissioned). "
                "Check https://console.groq.com/docs/models for a current model name and "
                "update GROQ_MODEL in .env."
            ) from e
        raise


async def _generate_ollama(prompt: str, system: str | None) -> str:
    from ollama import AsyncClient

    client = AsyncClient(host=settings.OLLAMA_HOST)
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    response = await client.chat(model=settings.OLLAMA_MODEL, messages=messages)
    return response["message"]["content"]
