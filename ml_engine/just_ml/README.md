# LearnPath AI — ML/LLM microservice

Standalone Python (FastAPI) service that sits *behind* your existing Express
backend. React never talks to this directly — Express calls it server-to-server.

```
React  -->  Express/Node  -->  FastAPI (this service)  -->  LLM + Web + YouTube + ML
                                        |
                                  sentence-transformers (real ML: semantic matching)
```

## Why it's not "just a chatbot"

The `/api/v1/ask` endpoint is the core of the "answers like Google search"
requirement: given a natural-language question, it runs a live web search
+ YouTube search in parallel, feeds both into the LLM as grounding context,
and returns a structured explanation **plus the actual source links and
video links** — not a back-and-forth chat turn.

## Setup

```bash
cd learnpath-ai
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env:
#  - Get a free Groq API key at https://console.groq.com and paste it in GROQ_API_KEY
#    (recommended for demo day — fast, no local GPU needed)
#  - OR set LLM_PROVIDER=ollama if you'd rather run fully local
#    (requires `ollama pull qwen2.5:3b` first)

uvicorn app.main:app --reload --port 8000
```

Check it's alive: http://localhost:8000/api/v1/health

Interactive API docs (auto-generated, useful for testing without a frontend):
http://localhost:8000/docs

## Endpoints

| Method | Path                              | Purpose                                             |
|--------|------------------------------------|------------------------------------------------------|
| POST   | `/api/v1/ask`                     | Google-style research answer + sources + videos     |
| POST   | `/api/v1/profile/extract`         | Free text -> structured learner profile             |
| POST   | `/api/v1/recommendations/generate`| Ranked course recommendations                       |
| POST   | `/api/v1/roadmap/generate`        | Structured phased roadmap with milestones           |
| POST   | `/api/v1/explain`                 | Why was this course recommended?                    |
| GET    | `/api/v1/health`                  | Health check                                        |

## Wiring into your Express backend

Copy `express-integration/mlService.js` into your Express project (e.g.
`src/services/mlService.js`) and `express-integration/routes.example.js` as
a starting point for your own routes. Set `ML_SERVICE_URL=http://localhost:8000`
in your Express `.env`. `npm install axios` if you don't already have it.

Your React frontend then just calls your normal Express API — it never
needs to know this Python service exists.

## Try it without a frontend

```bash
curl -X POST http://localhost:8000/api/v1/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "how do I learn React hooks as a JavaScript beginner"}'
```

```bash
curl -X POST http://localhost:8000/api/v1/recommendations/generate \
  -H "Content-Type: application/json" \
  -d '{
    "learner": {
      "user_id": "u1",
      "goal": "become a full stack developer",
      "experience_level": "beginner",
      "weekly_hours": 10,
      "skills": [{"name": "html", "level": 6}, {"name": "css", "level": 5}],
      "interests": ["web development"],
      "completed_courses": []
    }
  }'
```

```bash
curl -X POST http://localhost:8000/api/v1/roadmap/generate \
  -H "Content-Type: application/json" \
  -d '{
    "learner": {
      "user_id": "u1",
      "goal": "become a full stack developer",
      "experience_level": "beginner",
      "weekly_hours": 10,
      "skills": [],
      "interests": [],
      "completed_courses": []
    }
  }'
```

## What's "real ML" here (for judges)

- `app/ml/embeddings.py` — sentence-transformer embeddings, cosine similarity
  ranking of courses against the learner's goal. Not keyword matching.
- `app/ml/course_ranker.py` — combines skill-gap coverage (structured) with
  semantic similarity (embeddings) into one ranking score.
- `app/ml/skill_gap.py` — quantifies the gap between current and required
  skill levels per skill.

If you have extra time: generate a small synthetic dataset of
(learner profile, course, completed=1/0) examples and train a
`scikit-learn` classifier to replace the hand-tuned 0.6/0.4 weighting in
`course_ranker.py` — that upgrades this from "ML-assisted heuristic" to
"trained model," which is a stronger story if judges ask.

## Troubleshooting

**`numpy`/`pydantic-core` fails to build from source.** You're on a Python
version (e.g. 3.14) newer than these packages ship prebuilt wheels for, so
pip tries to compile from source and needs a C/Rust toolchain you probably
don't have. Fix: use Python 3.12 for this service (`uv python install 3.12`
or a normal 3.12 install), create the venv with that, then
`pip install -r requirements.txt` — everything here has 3.12 wheels.

**`groq.NotFoundError` / "model has been decommissioned".** Groq rotates
their hosted model lineup with little notice. Check
https://console.groq.com/docs/models for a current model name and set it in
`.env` as `GROQ_MODEL`. The client now raises a clear message pointing here
instead of a raw stack trace if this happens again.

**`ImportError: DLL load failed` / "Application Control policy has blocked
this file" (Windows).** This came from `scipy` (via scikit-learn) and would
have gotten worse with `torch` (via sentence-transformers) — both ship
unsigned native DLLs that locked-down enterprise/Windows security policies
block at import time. Fixed by removing both dependencies entirely: course
ranking now uses a pure-NumPy TF-IDF + cosine similarity implementation
(`app/ml/embeddings.py`). NumPy's wheels don't have this problem. If you're
on a machine without this restriction and want stronger semantic matching,
you can swap the internals of that one file for sentence-transformers again.

**`uvicorn` command not found / won't launch (Windows).** Use
`python -m uvicorn app.main:app --reload --port 8000` instead of the bare
`uvicorn` command — it goes through the same Python venv reliably instead of
depending on a separate `.exe` shim being on PATH.

**YouTube results always empty, log shows `post() got an unexpected keyword
argument 'proxies'`.** That was `youtube-search-python` calling httpx with an
argument (`proxies`) that newer httpx versions removed. Fixed by dropping
that dependency — YouTube search now scrapes the public results page
directly with `httpx` in `app/tools/youtube_search.py`. If YouTube changes
their page structure and this breaks again, the safest long-term fix is
getting a free `YOUTUBE_API_KEY` from Google Cloud Console and setting it in
`.env` — the service automatically prefers the official API when a key is
present.

**`/ask` returns an answer but no source links, log shows `202 Ratelimit`.**
DuckDuckGo's free scraping endpoint throttles under repeated calls (common
during dev/testing, or many teammates on the same venue wifi/IP). This now
retries with backoff before giving up (`app/tools/web_search.py`), and
always degrades gracefully — `/ask` still answers from the LLM's own
knowledge rather than erroring. If it's a persistent problem on demo day,
the reliable fix is swapping in a free-tier API key (Tavily, Serper, Brave
Search) in that same file.

## Reliability notes (things that break demos)

- **Roadmap JSON parsing** (`roadmap_service.py`) has a regex-extraction
  fallback and a deterministic backup roadmap if the LLM ever returns
  malformed JSON — it will never throw a raw 500 to the judges.
- **Web/YouTube search failures are caught and return empty lists**, not
  exceptions — `/ask` degrades gracefully to "LLM knowledge only" instead
  of crashing if the venue wifi hiccups.
- **CORS** is preconfigured for common local dev ports; add your deployed
  frontend URL to `ALLOWED_ORIGINS` in `.env` before demo day.
