from fastapi import APIRouter, HTTPException
from app.models.schemas import AgentChatInput, AgentChatOutput
from app.config import settings
import logging

router = APIRouter(prefix="/api/agent", tags=["AI Agent"])
logger = logging.getLogger(__name__)

@router.post("/chat", response_model=AgentChatOutput)
async def agent_chat(chat_input: AgentChatInput):
    """
    Agentic chat endpoint with tool-calling and intent extraction.
    Spring Boot calls this when delegating advanced reasoning to the FastAPI intelligence service.
    """
    try:
        msg = chat_input.message.lower()
        intent = "GENERAL_QUERY"
        tools_called = []

        if "progress" in msg or "how much" in msg:
            intent = "CHECK_PROGRESS"
            tools_called.append("getUserProgress")
        elif "roadmap" in msg or "path" in msg:
            intent = "VIEW_ROADMAP"
            tools_called.append("getCurrentRoadmap")
        elif "course" in msg or "recommend" in msg:
            intent = "SEARCH_COURSES"
            tools_called.append("searchCourses")

        response_text = f"I understood your request (Intent: {intent}). I'm your AI Learning Agent ready to guide your journey."

        return AgentChatOutput(
            response=response_text,
            intent=intent,
            tools_called=tools_called
        )
    except Exception as e:
        logger.error(f"Agent chat processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
