from fastapi import APIRouter, HTTPException
from app.models.schemas import AskRequest, AskResponse
from app.services.ask_service import ask as ask_service

router = APIRouter(prefix="/ask", tags=["Ask (research answers)"])


@router.post("", response_model=AskResponse)
async def ask_endpoint(request: AskRequest):
    """
    NOT a chatbot turn. Given a natural-language question, this returns a
    full explanatory answer grounded in live web search + YouTube results,
    plus the source links and videos themselves — like a search engine that
    writes the summary for you.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="query must not be empty")
    return await ask_service(request)
