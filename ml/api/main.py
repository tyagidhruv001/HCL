from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import time

app = FastAPI(title="LearnAI ML Service", version="1.0.0")

class LearnerProfile(BaseModel):
    name: str
    goal: str
    level: str
    interests: List[str]
    timeline: Optional[str] = "3 months"

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "ml",
        "timestamp": time.time()
    }

@app.post("/api/recommend")
def recommend_path(profile: LearnerProfile):
    try:
        # In the future: load model.pkl, extract features, and return recommendation path
        return {
            "title": f"AI Path for {profile.name}",
            "description": f"Targeted path to help you achieve: {profile.goal}",
            "totalDuration": profile.timeline,
            "phases": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
