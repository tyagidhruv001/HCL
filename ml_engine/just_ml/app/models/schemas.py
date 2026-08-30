from pydantic import BaseModel, Field
from typing import List, Optional


# ---------- Learner profile ----------

class Skill(BaseModel):
    name: str
    level: float = Field(ge=0, le=10)


class LearnerProfile(BaseModel):
    user_id: str
    goal: str                      # e.g. "become a backend developer"
    experience_level: str          # "beginner" | "intermediate" | "advanced"
    weekly_hours: float = Field(gt=0)
    skills: List[Skill] = []
    interests: List[str] = []
    completed_courses: List[str] = []


class ProfileExtractRequest(BaseModel):
    """Free-text -> structured profile, used by the conversational intake."""
    user_id: str
    message: str
    existing_profile: Optional[LearnerProfile] = None


# ---------- Courses ----------

class Course(BaseModel):
    id: str
    title: str
    provider: str
    url: str
    difficulty: str
    duration_hours: float
    skills: List[str]
    prerequisites: List[str] = []
    description: str = ""


# ---------- Recommendations ----------

class RecommendationRequest(BaseModel):
    learner: LearnerProfile
    courses: Optional[List[Course]] = None  # None -> use built-in catalog


class Recommendation(BaseModel):
    course_id: str
    title: str
    url: str
    score: float
    matched_skills: List[str]
    reason: str


class RecommendationResponse(BaseModel):
    recommendations: List[Recommendation]


# ---------- Roadmap ----------

class RoadmapRequest(BaseModel):
    learner: LearnerProfile
    available_courses: Optional[List[Course]] = None


class Milestone(BaseModel):
    title: str
    description: str


class RoadmapPhase(BaseModel):
    phase_number: int
    title: str
    duration_weeks: int
    course_ids: List[str]
    milestones: List[Milestone]


class RoadmapResponse(BaseModel):
    title: str
    total_duration_weeks: int
    phases: List[RoadmapPhase]


# ---------- "Ask" (Google-style research answer, NOT a chatbot reply) ----------

class AskRequest(BaseModel):
    query: str
    user_id: Optional[str] = None
    learner: Optional[LearnerProfile] = None  # optional, personalizes the answer


class Source(BaseModel):
    title: str
    url: str
    snippet: str


class VideoResult(BaseModel):
    title: str
    url: str
    channel: str
    thumbnail: str
    duration: Optional[str] = None


class AskResponse(BaseModel):
    query: str
    answer: str                 # full explanation, markdown
    key_points: List[str]
    sources: List[Source]
    videos: List[VideoResult]
    related_questions: List[str] = []


# ---------- Explainability ----------

class ExplainRequest(BaseModel):
    learner: LearnerProfile
    course: Course


class ExplainResponse(BaseModel):
    course_id: str
    explanation: str
    skill_gap_addressed: dict
