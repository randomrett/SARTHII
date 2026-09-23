# SAARTHI — Technical Context & System Documentation

**Smart India Hackathon 2026 · PS ID: SIH26122 · "Intelligent Data Capture & Real-Time Progress Tracking" · Team Hail Mary**

---

## 1. What this project is

SAARTHI is an AI-powered Planning-to-Execution bridge designed to solve the critical infrastructure challenge of manual, delayed, and scattered site progress reporting (SIH Problem Statement ID SIH26122). Field updates from site supervisors are captured via hands-free voice dictation ("Hey Saarthi" wake word with decibel-based Voice Activity Detection) or structured text, normalized using construction domain phonetics, and matched against master schedule activities to update actual progress automatically. Currently, SAARTHI is built as a React 19 + TypeScript multi-page web application featuring client-side heuristic schedule matching, zero-touch autonomous auto-approval, an audit log, a schedule builder, and a companion FastAPI + PostgreSQL backend skeleton with JWT auth, CRUD endpoints, and a ported Python matching algorithm.

---

## 2. Tech stack

### Frontend (`package.json`)
- **Core Framework**: React 19 (`react` `^19.2.8`, `react-dom` `^19.2.8`)
- **Build Tool & Dev Server**: Vite (`vite` `^8.2.2`, `@vitejs/plugin-react` `^6.1.0`)
- **Language**: TypeScript (`typescript` `~6.0.2`)
- **Routing**: React Router DOM (`react-router-dom` `^7.18.4`)
- **Styling**: Tailwind CSS v4 (`tailwindcss` `^4.3.3`, `@tailwindcss/vite` `^4.3.3`, `tailwind-merge` `^3.6.0`, `clsx` `^2.1.1`)
- **UI Components & Icons**: Lucide React (`lucide-react` `^1.41.0`), Canvas Confetti (`canvas-confetti` `^1.9.4`)
- **Linter**: Oxlint (`oxlint` `^1.79.0`)

### Backend (`backend/requirements.txt`)
- **Web Framework**: FastAPI (`fastapi` `>=0.109.0`)
- **ASGI Server**: Uvicorn (`uvicorn[standard]` `>=0.27.0`)
- **Database & ORM**: PostgreSQL (`psycopg2-binary` `>=2.9.9`), SQLAlchemy (`sqlalchemy` `>=2.0.25`), SQLite (local dev fallback)
- **Database Migrations**: Alembic (`alembic` `>=1.13.1`)
- **Validation & Settings**: Pydantic v2 (`pydantic[email]` `>=2.6.0`, `email-validator` `>=2.1.0`, `pydantic-settings` `>=2.1.0`)
- **Authentication & Security**: PyJWT / Python-Jose (`python-jose[cryptography]` `>=3.3.0`), Direct Bcrypt & Passlib (`passlib[bcrypt]` `>=1.7.4`)
- **Containerization**: Docker & Docker Compose (`postgres:15-alpine`, Python 3.11-slim)

---

## 3. Project structure

```
SARTHII/
├── CONTEXT.md                    # Single-file comprehensive context document (this file)
├── Roadmap.md                    # Implementation roadmap and feature tracker
├── package.json                  # Frontend dependencies and Vite scripts (name: "setutrack")
├── vite.config.ts                # Vite build configuration with React & Tailwind plugins
├── index.html                    # Single-page app HTML entry point
│
├── src/                          # Frontend Source Code
│   ├── main.tsx                  # React DOM root entry point
│   ├── App.tsx                   # Top-level router wrapper with ScheduleProvider & Navbar
│   ├── index.css                 # Global blueprint aesthetic styles & custom scrollbars
│   ├── types/
│   │   └── index.ts              # Domain model interfaces (Activity, MatchResult, AuditRecord)
│   ├── context/
│   │   └── ScheduleContext.tsx   # React Context providing global schedule, match, and audit state
│   ├── components/
│   │   ├── Navbar.tsx            # Persistent top navigation bar with active route highlighting
│   │   ├── ReportIntake.tsx      # Voice intake ("Hey Saarthi"), decibel VAD, and text input
│   │   ├── MatchingEngine.tsx    # Detailed candidate match breakdown & sub-score metrics
│   │   ├── ScheduleBuilder.tsx   # CRUD activity list builder with schedule preset switcher
│   │   ├── AuditLog.tsx          # Audit trail history table of auto-approved & modified reports
│   │   └── BlueprintHeaderFooter.tsx # Blueprint engineering title block & stamp footer
│   ├── pages/
│   │   ├── HomePage.tsx          # Route '/' — Field Intake & lightweight inline match summary
│   │   ├── DashboardPage.tsx     # Route '/dashboard' — At-a-glance metrics & MatchingEngine
│   │   ├── SchedulePage.tsx      # Route '/schedule' — Activity schedule builder
│   │   ├── AuditPage.tsx         # Route '/audit' — Timestamped audit log table
│   │   └── SettingsPage.tsx      # Route '/settings' — Zero-Touch toggle & AI config
│   └── utils/
│       ├── constructionPhonetics.ts # Domain spoken text normalization & jargon dictionary
│       ├── matchingAlgorithm.ts # Client-side heuristic matching (semantic, zone, date scores)
│       └── presets.ts            # Baseline schedule presets (Metro, Highway, Tower)
│
└── backend/                      # FastAPI Python Backend Infrastructure
    ├── Dockerfile                # Python 3.11 container definition
    ├── docker-compose.yml        # Orchestrates API service + PostgreSQL container
    ├── requirements.txt          # Python dependencies
    ├── alembic.ini & alembic/    # Database schema migration configuration
    ├── test_backend.py           # Automated test suite validating all API endpoints
    └── app/
        ├── main.py               # FastAPI entrypoint, CORS configuration, & /health route
        ├── config.py             # Pydantic BaseSettings (DB URL, JWT secret keys)
        ├── database.py           # SQLAlchemy engine & session factory (Postgres/SQLite)
        ├── security.py           # Password hashing (bcrypt) & JWT token utilities
        ├── models/               # SQLAlchemy DB models (User, Project, Activity, Report, AuditRecord)
        ├── schemas/              # Pydantic request/response schemas
        ├── routers/              # API Endpoints (/auth, /projects, /activities, /reports, /match, /audit)
        └── utils/
            ├── phonetics.py      # Python port of spoken text normalizer
            └── matching.py       # Python port of heuristic matching engine
```

---

## 4. How the app actually works right now

### User Flow
1. **Report Intake (`/`)**:
   - The user opens the home page and can type a field report or enable the microphone.
   - Saying **"Hey Saarthi"** out loud (or manually toggling dictation) transitions `ReportIntake` from `wake_listen` to `dictating` mode.
   - As the user speaks, browser Web Speech API transcribes audio into interim text, which is continuously sanitized using `constructionPhonetics.ts` (e.g. converting "jon a" to "Zone A", "eighty five percent" to "85%").
   - A real-time AudioContext decibel analyzer tracks RMS voice volume. When speech drops below 12% decibels for >1.4 seconds, the VAD automatically submits the report.
2. **Matching Engine & Evaluation**:
   - `matchReportToSchedule()` evaluates the sanitized text against all active activities.
   - It calculates four weighted sub-scores:
     - **Semantic Match (50%)**: Word token overlap + domain synonym dictionary + Levenshtein distance.
     - **Location Match (35%)**: Extracted zone keyword vs activity zone.
     - **Date Plausibility (15%)**: Active vs completed activity status plausibility.
     - **Progress Confidence**: Extracted explicit `%` or keyword completion level.
3. **Zero-Touch Autonomous Execution**:
   - If `autoApproveMode` is ON (default), top matches with confidence $\ge 50\%$ automatically update the baseline activity's progress and status (`not_started` $\rightarrow$ `in_progress` $\rightarrow$ `completed`) in `ScheduleContext`.
   - An entry is logged automatically in `auditRecords`, a celebration confetti animation triggers, and an inline summary banner appears on the Home page (`Matched to Raft Foundation — Zone A (85% confidence)`).
4. **Multi-Page Navigation**:
   - **`/` (Home)**: Focuses strictly on report intake and lightweight confirmation.
   - **`/dashboard`**: Displays progress metric cards and the full `MatchingEngine` candidate breakdown & sub-score bars.
   - **`/schedule`**: Allows adding, editing, and deleting schedule line items.
   - **`/audit`**: Displays immutable timestamped log of all report actions.
   - **`/settings`**: Houses Zero-Touch mode toggle, Gemini API toggle, key input, and preset baseline selector.

### Real vs. Stubbed Features (Ground Truth)
- **REAL & WORKING**: Browser speech recognition wake-word dictation, decibel VAD auto-submit, client-side heuristic matching engine, zero-touch auto-approval, React Context state management, React Router multi-page navigation, FastAPI backend endpoints & automated test suite.
- **STUBBED / UNWIRED**:
  - **Live Gemini API**: Toggle and password input exist in `/settings`, but `matchingAlgorithm.ts` currently executes pure client-side heuristic matching without making LLM network calls.
  - **Photo/Document Attachment**: The file input button on `/` captures the filename in component state, but photo OCR (Tesseract) / computer vision (YOLO) extraction is not yet wired up.
  - **Frontend-Backend Sync**: The FastAPI backend is scaffolded, tested, and fully functional, but the frontend React app currently reads/writes state in `ScheduleContext.tsx` rather than fetching from the backend endpoints over HTTP.

---

## 5. Key architectural decisions and why

1. **React Context (`ScheduleContext`) over Redux/Zustand**:
   - Kept state lightweight and dependency-free. React Context effectively provides global state across all routed pages without extra boilerplate or third-party state manager overhead.
2. **Client-Side First Heuristic Matching Engine**:
   - Designed for zero-latency execution and offline site capability. Field supervisors often work in low-connectivity construction zones; local execution ensures the app functions without cloud server dependence.
3. **Direct `bcrypt` in Python Security**:
   - Replaced legacy `passlib` bcrypt wrapper in `backend/app/security.py` with direct `bcrypt` module calls to eliminate Python 3.11+ version incompatibility bugs while maintaining standard password hashing security.
4. **Stateless RegExp Matcher (`isRegexWakeMatch`)**:
   - Avoided stateful JavaScript `RegExp.prototype.test()` bugs caused by global `/g` flag `lastIndex` mutation, ensuring reliable wake-word detection across continuous speech calls.
5. **Decibel RMS Voice Activity Detection (VAD)**:
   - Used Web Audio API `AnalyserNode` frequency spectrum sampling rather than relying solely on browser speech recognition end events, enabling hands-free auto-submission when volume drops below human speech thresholds.

---

## 6. Known issues / things mid-fix

1. **Web Speech API Cloud Dependency & Network Drops**:
   - Chrome's `webkitSpeechRecognition` relies on Google cloud speech servers. If internet drops or Chrome rate-limits recognition, Web Speech API fires `event.error === 'network'`.
   - *Status*: Mitigated by adding `consecutiveErrorsRef` with 1500ms backoff and auto-restart cap (4 errors max) in `ReportIntake.tsx` alongside manual activation buttons, but offline speech requires future local Whisper integration.
2. **Frontend Persistence**:
   - `ScheduleContext` state resets on browser page refresh (except custom trained wake phrases stored in `localStorage`). Connecting `ScheduleContext` to the scaffolded FastAPI backend endpoints will provide persistent database storage.
3. **Frontend Package Name**:
   - `package.json` package name is still `"setutrack"`. Rebranding to `"saarthi"` is queued as part of overall branding polish.

---

## 7. How to run it locally

### 1. Frontend Web App (React + Vite)
```bash
# Install dependencies (if not already installed)
npm install

# Start Vite development server
npx vite
```
App runs at: **`http://localhost:5173`**

### 2. Backend API Server (FastAPI + Python)

#### Method A: Direct Python (SQLite local dev)
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate venv (Windows PowerShell)
.\venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Run Uvicorn dev server
uvicorn app.main:app --reload --port 8000
```
API runs at: **`http://localhost:8000`** (Swagger docs: `http://localhost:8000/docs`)

#### Method B: Docker Compose (FastAPI + PostgreSQL)
```bash
cd backend
docker compose up --build
```

---

## 8. Roadmap / not yet started

See [Roadmap.md](file:///c:/Users/umang/OneDrive/Documents/GitHub/SARTHII/Roadmap.md) for full project tracking.

### Top 3 Priorities Next:
1. **Frontend-to-Backend HTTP Integration**: Point `ScheduleContext.tsx` to the FastAPI backend API endpoints (`/projects`, `/activities`, `/reports`, `/match`, `/audit`) for persistent storage and auth login.
2. **Data Capture Ingestion (OCR & Whisper)**: Integrate Tesseract OCR for site photo/receipt scanning and server-side Whisper for robust offline/multilingual voice transcription.
3. **AI/NLP Upgrade (SBERT / Sentence-Transformers)**: Replace keyword token overlap in `backend/app/utils/matching.py` with vector embeddings (`sentence-transformers/all-MiniLM-L6-v2`) for deep semantic matching.
