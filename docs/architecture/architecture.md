# System Architecture

This project is organized as a monorepo with three core tiers:

1. **Frontend (Client)**:
   - Modern ESM-based Single Page Application (SPA).
   - Built with Vite.
   - Self-contained views for Dashboard, AI Chat Advisor, Course Explorer, and Learning Path.
   - Communicates with the backend REST API.

2. **Backend (API Layer)**:
   - Node.js Express server.
   - Manages routing, middleware (authentication, validation, error handler), database connection templates, and delegates recommendations to the ML Python microservice.

3. **ML Service (Inference Layer)**:
   - Python FastAPI server.
   - Exposes inference endpoints for course mapping and path recommendation.
   - Built to run in a Docker container.
