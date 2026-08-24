from fastapi import APIRouter
import time

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "learnai-ml-service",
        "version": "1.0.0",
        "timestamp": time.time()
    }
