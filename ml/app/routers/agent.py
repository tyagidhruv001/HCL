from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from app.models.schemas import AgentChatInput, AgentChatOutput
from app.agent.orchestrator import agent_orchestrator
import logging

router = APIRouter(prefix="/api/agent", tags=["AI Agent"])
logger = logging.getLogger(__name__)

@router.post("/chat", response_model=AgentChatOutput)
async def agent_chat(
    chat_input: AgentChatInput,
    authorization: Optional[str] = Header(None)
):
    """
    Autonomous Agent chat endpoint with multi-turn tool-calling, ReAct loop, and structured responses.
    Spring Boot calls this when delegating agentic reasoning to the Python intelligence service.
    """
    try:
        logger.info(f"Agent processing query: '{chat_input.message}' for user: {chat_input.user_id}")
        context = {
            "user_id": chat_input.user_id,
            "auth_header": authorization
        }
        
        return agent_orchestrator.run_agent_loop(
            user_message=chat_input.message,
            history=chat_input.history,
            context=context,
            api_key=chat_input.api_key
        )
    except Exception as e:
        logger.error(f"Agent chat processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

