from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class LearnerProfileInput(BaseModel):
    name: str = Field(..., description="Learner name")
    goal: str = Field(..., description="Primary learning goal")
    level: str = Field(default="beginner", description="Experience level: beginner, intermediate, advanced")
    interests: List[str] = Field(default_factory=list, description="Target domain interests")
    timeline: Optional[str] = Field(default="3 months", description="Target completion timeline")
    current_skills: Optional[List[str]] = Field(default_factory=list, description="Existing known skills")

class CoursePhaseOutput(BaseModel):
    id: int
    title: str
    theme: str
    duration: str
    milestone: str
    courses: List[Dict[str, Any]] = Field(default_factory=list)

class RecommendationOutput(BaseModel):
    title: str
    description: str
    totalDuration: str
    phases: List[CoursePhaseOutput] = Field(default_factory=list)

class AgentChatInput(BaseModel):
    user_id: Optional[str] = None
    message: str
    history: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    api_key: Optional[str] = None

class AgentChatOutput(BaseModel):
    response: str
    intent: Optional[str] = None
    tools_called: Optional[List[str]] = Field(default_factory=list)
