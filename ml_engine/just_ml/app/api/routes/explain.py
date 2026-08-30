from fastapi import APIRouter
from app.models.schemas import ExplainRequest, ExplainResponse
from app.services.explain_service import explain

router = APIRouter(prefix="/explain", tags=["Explainability"])


@router.post("", response_model=ExplainResponse)
async def explain_endpoint(request: ExplainRequest):
    """Why was this specific course recommended to this specific learner?"""
    return await explain(request)
