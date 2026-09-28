# SAARTHI — Technical Context & System Documentation

**Smart India Hackathon 2026 · PS ID: SIH26122 · "Intelligent Data Capture & Real-Time Progress Tracking" · Team Hail Mary**

---

## 1. What this project is

SAARTHI is an AI-powered Planning-to-Execution bridge built to eliminate manual, delayed, and fragmented construction site progress reporting (SIH Problem Statement ID SIH26122). Field updates from site supervisors are captured via hands-free voice dictation ("Hey Saarthi" wake word with decibel-based Voice Activity Detection & physical mic teardown privacy control), structured text, site photo OCR & defect detection, site video keyframe analysis, or spreadsheet uploads (Excel/CSV ad-hoc reports and schedule baselines).

Field jargon and spoken location terms are normalized using domain phonetics and matched against master schedule activities via a hybrid matching engine (SBERT sentence embeddings + token overlap + zone/date plausibility). High-confidence matches ($\ge 78\%$) are automatically zero-touch auto-approved to update baseline progress and record immutable audit trail entries. Low-confidence matches (&lt;78%) are routed to the **Human-in-the-Loop Review Queue** on the manager dashboard for manual approval, reassignment, or rejection. SAARTHI is resilient to field connectivity drops via an IndexedDB offline queueing engine with client-generated idempotency keys and automatic background sync flush.

---

## 2. Tech stack

### Frontend (`package.json`)
- **Core Framework**: React 19 (`react` `^19.2.8`, `react-dom` `^19.2.8`)
- **Build Tool & Dev Server**: Vite (`vite` `^8.2.2`, `@vitejs/plugin-react` `^6.1.0`)
- **Language**: TypeScript (`typescript` `~6.0.2`)
- **Routing**: React Router DOM (`react-router-dom` `^7.18.4`)
- **Styling**: Tailwind CSS v4 (`tailwindcss` `^4.3.3`, `@tailwindcss/vite` `^4.3.3`, `tailwind-merge` `^3.6.0`, `clsx` `^2.1.1`)
- **UI Icons & FX**: Lucide React (`lucide-react` `^1.41.0`), Canvas Confetti (`canvas-confetti` `^1.9.4`)
- **Offline Storage**: Browser IndexedDB API (`saarthi_offline_db`)
- **Linter**: Oxlint (`oxlint` `^1.79.0`)

### Backend (`backend/requirements.txt`)
- **Web Framework**: FastAPI (`fastapi` `>=0.109.0`)
- **ASGI Server & Real-time WebSockets**: Uvicorn (`uvicorn[standard]` `>=0.27.0`), WebSockets (`/ws/updates`)
- **Database & ORM**: SQLite (local dev) / PostgreSQL (`psycopg2-binary` `>=2.9.9`), SQLAlchemy (`sqlalchemy` `>=2.0.25`)
- **Database Migrations**: Alembic (`alembic` `>=1.13.1`)
- **Validation & Settings**: Pydantic v2 (`pydantic[email]` `>=2.6.0`, `pydantic-settings` `>=2.1.0`)
- **AI & NLP Services**:
  - Google Gemini API (`google-genai` / `google-generativeai`) for photo OCR, defect analysis, video keyframes, & unstructured text extraction
  - Sentence-Transformers / SBERT (`sentence-transformers/all-MiniLM-L6-v2`, `torch`) for vector embeddings
  - OpenAI Whisper (`openai-whisper`, `python-multipart`) for local audio speech-to-text transcription
- **Spreadsheet Parsers**: OpenPyXL (`openpyxl` `>=3.1.2`), Pandas (`pandas` `>=2.2.0`)
- **Authentication & Security**: PyJWT (`python-jose[cryptography]`), Bcrypt (`bcrypt`)
- **Containerization**: Docker & Docker Compose (`postgres:15-alpine`, Python 3.11-slim)

---

## 3. Project structure

```
SARTHII/
├── CONTEXT.md                    # Single-file comprehensive technical documentation (this file)
├── Roadmap.md                    # Official SIH problem statement roadmap and feature tracker
├── README.md                     # Quickstart, project summary, and run instructions
├── package.json                  # Frontend dependencies and npm scripts (name: "saarthi")
├── vite.config.ts                # Vite configuration with React & Tailwind plugins
├── index.html                    # Single-page app HTML entry point
├── saarthi.db                    # Local dev SQLite database
│
├── src/                          # Frontend Source Code (React 19 + TypeScript)
│   ├── main.tsx                  # React DOM root entry point
│   ├── App.tsx                   # Top-level router wrapper with ScheduleProvider & Navbar
│   ├── index.css                 # Blueprint design aesthetic styles & scrollbar utilities
│   ├── types/
│   │   └── index.ts              # Domain interfaces (Activity, MatchResult, AuditRecord)
│   ├── context/
│   │   └── ScheduleContext.tsx   # React Context providing persistent backend state, WebSocket sync, & review queue
│   ├── components/
│   │   ├── Navbar.tsx            # Navigation bar with active route highlighting, pending badges, & live toasts
│   │   ├── ReportIntake.tsx      # Split voice intake (SpeechRecognition wake-word + MediaRecorder Whisper STT + Tap to Record)
│   │   ├── ReviewQueue.tsx       # Human-in-the-Loop review queue for low-confidence match approvals/reassignments
│   │   ├── PlannedVsActual.tsx   # Planned-vs-actual progress comparison dashboard & slippage gap detection
│   │   ├── MatchingEngine.tsx    # Candidate match breakdown & sub-score visualizers
│   │   ├── ScheduleBuilder.tsx   # Activity CRUD list builder, Gantt timeline view, & spreadsheet importer
│   │   ├── AuditLog.tsx          # Audit trail history table of auto-approved, corrected, & rejected reports
│   │   └── ui/                   # Modular UI badges (ConfidenceBadge, ZoneTag, StatCard)
│   ├── pages/
│   │   ├── HomePage.tsx          # Route '/' — Field Intake, inline match confirmation, & offline queued card
│   │   ├── DashboardPage.tsx     # Route '/dashboard' — Stat metrics, ReviewQueue, PlannedVsActual, & MatchingEngine
│   │   ├── SchedulePage.tsx      # Route '/schedule' — Activity schedule builder with Gantt timeline
│   │   ├── AuditPage.tsx         # Route '/audit' — Timestamped audit log table
│   │   └── SettingsPage.tsx      # Route '/settings' — Zero-Touch toggle & AI config
│   └── utils/
│       ├── api.ts                # Frontend HTTP client wrapper for FastAPI backend endpoints
│       ├── offlineStore.ts       # IndexedDB offline report queue manager with idempotency keys
│       ├── constructionPhonetics.ts # Spoken text normalization & construction jargon dictionary
│       ├── matchingAlgorithm.ts # Client-side heuristic matching engine (fallback)
│       └── presets.ts            # Baseline schedule presets (Metro, Highway, Tower)
│
└── backend/                      # FastAPI Python Backend Infrastructure
    ├── Dockerfile                # Python 3.11 container definition
    ├── docker-compose.yml        # Orchestrates API service + PostgreSQL container
    ├── requirements.txt          # Python dependencies
    ├── test_tasks_1_to_4.py      # End-to-end automated test suite for ingestion & vision pipelines
    ├── test_session_tasks.py     # Session integration test suite for audio transcription, review queue & WebSocket
    └── app/
        ├── main.py               # FastAPI entrypoint, CORS configuration, & static uploads mount
        ├── config.py             # Pydantic Settings (DB URL, Gemini API key, JWT keys)
        ├── database.py           # SQLAlchemy engine & session factory
        ├── security.py           # Password hashing, JWT token creation, & project authorization
        ├── models/               # SQLAlchemy DB models (User, Project, Activity, Report, AuditRecord)
        ├── schemas/              # Pydantic request/response schemas
        ├── routers/              # API Endpoints (/auth, /projects, /activities, /reports, /match, /audit, /transcribe, /ingest, /ws)
        ├── services/             # Semantic matcher (SBERT) & heuristic match wrappers
        └── utils/                # Vision analysis (Gemini), document parser, excel parser, & phonetics
```

---

## 4. How the app actually works right now

### End-to-End User Flow
1. **Reworked Split Voice Capture & Manual Fallback (`/`)**:
   - The user opens the home page and can dictate a report or click **"Tap to Record"**.
   - SpeechRecognition runs ONLY to detect the wake phrase **"Hey Saarthi"**.
   - As soon as the wake word is detected (or when "Tap to Record" is clicked), SpeechRecognition stops completely, and the browser's **MediaRecorder API** records raw audio chunks.
   - When recording ends (via decibel VAD 1.4s silence or clicking "Done Recording"), the audio blob is uploaded to backend `POST /api/v1/reports/transcribe`.
   - The backend runs local OpenAI Whisper model transcription and returns text, which feeds into the standard report matching pipeline (`onSubmitReport`).

2. **Human-in-the-Loop Review Queue (`/dashboard`)**:
   - Reports matching with confidence score &lt; 78% (or when Zero-Touch auto-approve mode is OFF) are routed into the **Pending Review Queue**.
   - Managers review raw report text, timestamp, and candidate match scores.
   - Manager actions: **Approve Match**, **Reassign & Approve** (choose different target activity & adjust progress %), or **Reject Report**.
   - Endpoints `POST /api/v1/audit/{id}/approve` and `POST /api/v1/audit/{id}/reject` update the AuditRecord status (`manually_approved`, `corrected`, `rejected`), sync baseline activity progress, and broadcast WebSocket updates.

3. **Planned vs. Actual Progress & Slippage Highlighting**:
   - Calculates target progress-by-now for every activity based on `plannedStart`, `plannedEnd`, and today's date.
   - Visual comparison bars display Planned Progress vs Actual Progress.
   - Activities falling &gt;5% behind schedule or marked `delayed` are highlighted with red/amber accent badges and trigger live toast notifications.

4. **Live WebSocket Push Synchronization**:
   - Backend exposes `@app.websocket("/ws/updates")`.
   - All connected browser dashboards automatically receive instant push events when reports are submitted, approved, or modified, eliminating manual page refreshes.

5. **Mic Teardown Privacy Security**:
   - Toggling microphone OFF in `ReportIntake.tsx` explicitly aborts `SpeechRecognition`, stops all `MediaStreamTrack` audio tracks (`track.stop()`), closes `AudioContext`, and terminates any `MediaRecorder` instance.

---

## 5. How to run it locally

### 1. Frontend Web App (React 19 + Vite)
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```
App runs at: **`http://localhost:5173`**

### 2. Backend API Server (FastAPI + Python)
```bash
cd backend

# Create & activate virtual environment (Windows PowerShell)
python -m venv venv
.\venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Run Uvicorn dev server
uvicorn app.main:app --reload --port 8000
```
API runs at: **`http://localhost:8000`** (Swagger docs: `http://localhost:8000/docs`)

### 3. Automated Backend Test Suites
```bash
# Session integration tests for audio STT, review queue & WebSockets
.\backend\venv\Scripts\python.exe backend/test_session_tasks.py

# Vision & document ingestion pipeline tests
.\backend\venv\Scripts\python.exe backend/test_tasks_1_to_4.py
```

---

## 6. Vercel & Container Production Deployment
- **Frontend SPA**: Deployed on Vercel with `vercel.json` SPA rewrites & HTTPS `Permissions-Policy` microphone header.
- **Backend Container**: Dockerized FastAPI container with pre-downloaded SBERT & Whisper models, healthcheck endpoint (`/health`), and dynamic CORS configuration.
- **Database**: Hosted PostgreSQL (Neon / Supabase).
- **Deployment Documentation**: Complete step-by-step instructions available in [`DEPLOYMENT.md`](file:///c:/Users/umang/OneDrive/Documents/GitHub/SARTHII/DEPLOYMENT.md).

