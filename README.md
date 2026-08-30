# ⚡ Wanderer — Next-Gen AI Learning & Career Evolution Platform

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![React](https://img.shields.io/badge/Frontend-React_19_%7C_Vite_7-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js_Express-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB_Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![AI Powered](https://img.shields.io/badge/AI-Groq_%7C_Gemini_LLMs-FF6F00)](https://groq.com/)
[![Theme](https://img.shields.io/badge/Design-Dual--Theme_Glassmorphism-a855f7)](#-rich-user-interface--dual-theme)

> **Wanderer** is an adaptive, multi-agent AI educational ecosystem engineered to guide developers and students from foundational concepts to industry-ready mastery. Featuring automated curriculum architecting, interactive prerequisite DAG graphs, deep focus tracking, diagnostic quizzes, and AI career matching.

---

## 🌟 Core Features & Modules

### 🗺️ 1. Adaptive "My Path" & Curriculum Architect
* **Multi-Phase Milestone Timeline**: Dynamic curriculum spine breaking complex domains into structured, sequential phases.
* **Interactive Step Navigation**: Inspect modules, estimated hours, difficulty badges, and prerequisite skills.
* **Curriculum Customizer Drawer**: Generate personalized learning pathways based on goal, current skill level, and weekly study budget.
* **Curated Resources & Video Lectures**: In-app curated video modules and documentation search integration.

### 🧠 2. Skill Tree Graph (Interactive DAG)
* **Visual Directed Acyclic Graph**: Canvas-driven skill graph displaying dependencies and node states (*Completed*, *In Progress*, *Locked*).
* **Node Dependency Inspector**: Click any node to view learning outcomes, prerequisites, and child nodes.
* **Real-Time Stage Filtering**: Seamlessly filter between foundational, intermediate, and advanced competency stages.

### 🎓 3. Comprehensive Course Studio
* **Syllabus & Curriculum Inspector**: Deep dive into structured course modules with lecture-by-lecture outlines.
* **On-Demand Diagnostic Quizzes**: Instant multi-question checkpoint evaluations with conceptual explanations.
* **Enrollment & Progress Sync**: Real-time progress updates saved directly to MongoDB.

### 💼 4. AI Career Studio & Recruiter Matchmaker
* **Resume Parsing & Skill Profiler**: Ingest resume content to extract verified competencies, skills, and projects.
* **Automated Company Matching**: Matches candidate profiles against industry tech stacks and hiring criteria.
* **Interview Readiness Index**: Evaluates domain readiness and recommends specific gap-closing projects.

### ⏱️ 5. Focus Studio & Ambient Deep Work
* **Smart Pomodoro Timer**: Custom preset durations (25m Focus, 50m Deep Work, 5m/15m Break).
* **Ambient Sound Generator**: Built-in audio generators (Binaural Beats, Rainstorm, White Noise, Cafe Ambience).
* **Distraction Telemetry**: Tracks tab switching and active engagement to compute a live **Focus Score**.

### 🤖 6. 24/7 AI Advisor & Tutor
* **Conversational AI Tutor**: Context-aware floating chat widget capable of explaining code, mathematical models, and architectural concepts.
* **Adaptive Revision Alerts**: Automatically surfaces weak diagnostic topics and suggests targeted revisions.

### 📊 7. Quantified Analytics & Gamification
* **Weekly Activity Heatmap**: Visual 30-day activity matrix tracking study streaks and completed milestones.
* **Knowledge Accuracy Chart**: SVG-rendered historical progress tracking checkpoint accuracy over time.
* **Profile Management**: Fast client-side canvas avatar downscaling and instant profile updates.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 7, React Router 7, Framer Motion, Lucide Icons, Vanilla CSS Design System |
| **Backend** | Node.js (ES Modules), Express 5, Mongoose 9, Passport.js, JWT, Bcrypt |
| **Database** | MongoDB Atlas / Local MongoDB |
| **AI / LLMs** | Groq API (`qwen/qwen3.8-27b`, `llama-3.3-70b`), Google Gemini API (`gemini-1.5-flash`) |
| **Styling** | Responsive CSS Variables, Glassmorphism, Dual-Theme Engine (`[data-theme="light"]` & dark) |

---

## 🚀 Step-by-Step Setup Guide

Follow these instructions to clone, configure, and run **Wanderer** locally from GitHub.

### 📋 Prerequisites
Ensure you have the following installed on your system:
* **Node.js** (v18.0.0 or higher) $\rightarrow$ [Download Node.js](https://nodejs.org/)
* **npm** (comes with Node.js) or **yarn**
* **Git** $\rightarrow$ [Download Git](https://git-scm.com/)
* **MongoDB**: A running local MongoDB instance or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster URI.

---

### 1️⃣ Clone the Repository

Open your terminal and run:
```bash
git clone https://github.com/tyagidhruv001/HCL.git
cd HCL
```

---

### 2️⃣ Configure & Start the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Create your environment configuration file `.env` in the `backend/` folder:
   ```bash
   # Windows PowerShell
   New-Item .env
   # Linux / macOS
   touch .env
   ```

4. Populate `backend/.env` with your credentials:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/wanderer?retryWrites=true&w=majority
   JWT_SECRET=your_super_secret_jwt_key_here
   SESSION_SECRET=wanderer_session_secret_key
   FRONTEND_URL=http://localhost:5173

   # AI LLM Provider Keys (At least one required for AI features)
   GROQ_API_KEY=gsk_your_groq_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here

   # (Optional) Email Notifications for Password Reset
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_app_password
   ```

5. Start the backend development server:
   ```bash
   npm run dev
   # Or standard start:
   npm start
   ```
   *The server will start on `http://localhost:5000` and connect to MongoDB.*

---

### 3️⃣ Configure & Start the Frontend

1. Open a **new terminal window** and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. (Optional) Create a `.env` file in the `frontend/` folder:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
   *(By default, Vite proxies requests to `http://localhost:5000` if not set).*

4. Start the frontend Vite server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

---

## 📁 Project Architecture & Directory Structure

```text
Wanderer/
├── backend/                        # Node.js Express REST API & AI Pipelines
│   ├── src/
│   │   ├── config/                # MongoDB, Passport & Auth configurations
│   │   ├── controllers/           # Endpoint controllers (User, Career, Roadmap, etc.)
│   │   ├── middleware/            # JWT authentication & route protectors
│   │   ├── models/                # Mongoose Database Schemas
│   │   ├── routes/                # Express Route Declarations
│   │   └── services/              # AI Services (Groq / Gemini AI Advisors & Roadmaps)
│   ├── package.json
│   └── server.js                  # Express Entry Point
│
├── frontend/                       # React 19 + Vite Single Page Application
│   ├── public/                    # Static Assets
│   ├── src/
│   │   ├── assets/                # Logos, Icons, and Media
│   │   ├── components/
│   │   │   ├── AIAdvisor/         # Conversational AI Chat Interface
│   │   │   ├── Careers/           # Career Studio & Job Matcher
│   │   │   ├── Competency/        # Skill Tree DAG Graph
│   │   │   ├── Courses/           # Course Studio & Diagnostic Quizzes
│   │   │   ├── MyPath/            # Curriculum Spine & Video Modals
│   │   │   └── FocusStudio.jsx    # Focus Timer & Ambient Audio
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx  # Main App Dashboard & Profile System
│   │   │   └── LandingPage.jsx    # Marketing & Authentication Page
│   │   ├── services/              # Axios API Client Connectors
│   │   ├── styles/                # CSS Modules & Dual-Theme Tokens
│   │   ├── utils/                 # Focus Tracker & Audio Synthesizers
│   │   ├── App.jsx                # Router & State Provider
│   │   └── index.css              # Global Design Tokens & Themes
│   ├── package.json
│   └── vite.config.js
│
├── README.md                       # Platform Documentation & Setup Guide
└── .gitignore                      # Git Ignore Configurations
```

---

## 🎨 Rich User Interface & Dual-Theme

Wanderer features a bespoke **CSS Variable-based Design System**:
* **🌙 Dark Mode (Default)**: Sleek obsidian backgrounds (`#040810`), neon cyan/emerald accents, glowing timeline beacons, and deep indigo glass panels.
* **☀️ Light Mode (`[data-theme="light"]`)**: High-contrast slate typography (`#0f1f35`), crisp soft white surfaces (`#ffffff`), and subdued jewel-tone borders.

To switch themes, open **Settings** from the user profile dropdown and select **Dark** or **Light**.

---

## 🧪 Production Build & Verification

To test and build the production bundle:

```bash
# In frontend directory:
npm run build

# Preview production build locally:
npm run preview
```

---

## 👤 Author & Maintainer

* **Dhruv Tyagi** ([@tyagidhruv001](https://github.com/tyagidhruv001))
* Repository: [https://github.com/tyagidhruv001/HCL](https://github.com/tyagidhruv001/HCL)

---

## 📄 License
This project is licensed under the **ISC License**. Feel free to use and extend it!
