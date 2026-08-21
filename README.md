# LearnAI — AI-Powered Personalized Learning Path Recommender

A modular, production-grade learning recommendation system consisting of a decoupled frontend, backend api, and ML services.

## Directory Structure

- `frontend/`: Single Page Application (SPA) built with Vite and vanilla JS modules. Includes onboarding wizard, advisor chat, course catalog, learning path, and student analytics dashboard. Serves on port `8765`.
- `backend/`: Node.js Express server acting as API gateway. Serves on port `5000`.
- `ml/`: Python FastAPI service for AI/ML recommendation logic. Serves on port `8000`.
- `shared/`: Shared JSON schema specifications and API contracts.
- `docs/`: System architectural diagrams and guides.
- `scripts/`: Monorepo setup scripts and database seeding tools.

## Setup Instructions

### 1. Auto Setup
Run the setup script to install all frontend and backend dependencies:
```bash
./scripts/setup.sh
```

### 2. Manual Development Launch
Launch individual services locally:

- **Frontend**:
  ```bash
  cd frontend
  npm run dev
  ```
- **Backend**:
  ```bash
  cd backend
  npm run dev
  ```
- **ML Service**:
  ```bash
  cd ml
  pip install -r requirements.txt
  uvicorn api.main:app --reload --port 8000
  ```

### 3. Docker Launch
Launch all three services simultaneously with Docker Compose:
```bash
docker-compose up --build
```
The frontend application will be live at `http://localhost:8765`.
