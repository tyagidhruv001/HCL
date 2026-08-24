# LearnAI — AI-Powered Personalized Learning Path Recommender

A modular, production-grade learning recommendation system consisting of a decoupled frontend, backend api, and ML services.

## Directory Structure

- `frontend/`: Single Page Application (SPA) built with React 19, Vite, and vanilla CSS modules. Includes onboarding wizard, advisor chat, course catalog, learning path, and student analytics dashboard. Serves on port `8765`.
- `backend/`: Java 21 Spring Boot 3.3 server with Spring Security (JWT), PostgreSQL JPA persistence, and REST endpoints for courses, roadmaps, progress, study sessions, and AI chat proxy. Serves on port `5000`.
- `ml/`: Python 3.10 FastAPI service (`app.main:app`) for AI/ML recommendation logic and agentic tool-calling intelligence. Serves on port `8000`.
- `shared/`: Shared JSON schema specifications and API contracts.
- `docs/`: System architectural diagrams and guides.
- `scripts/`: Monorepo setup scripts and database tools.

## Setup Instructions

### 1. Environment Configuration
Copy `.env.example` to `.env` and fill in any required keys (such as `GEMINI_API_KEY`):
```bash
cp .env.example .env
```

### 2. Development Launch
Launch individual services locally:

- **Frontend**:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
- **Backend (Spring Boot)**:
  ```bash
  cd backend
  ./mvnw spring-boot:run
  ```
- **ML Service (FastAPI)**:
  ```bash
  cd ml
  pip install -r requirements.txt
  uvicorn app.main:app --reload --port 8000
  ```

### 3. Docker Launch
Launch all services simultaneously with Docker Compose:
```bash
docker compose up --build
```
The frontend application will be live at `http://localhost:8765`.

