# SAARTHI — AI-Powered Construction Planning to Execution Bridge

**Smart India Hackathon 2026 · Problem Statement ID: SIH26122**  
*Team Hail Mary*

---

## 📌 Overview

**SAARTHI** is an AI-powered Planning-to-Execution bridge designed to solve the critical infrastructure challenge of manual, delayed, and scattered site progress reporting. Field updates from site supervisors are captured via tap-to-record voice dictation (MediaRecorder API with decibel-based Voice Activity Detection), structured text, site photos, videos, or spreadsheet uploads. SAARTHI normalizes field jargon, matches reports against master schedule activities, calculates confidence scores, and updates planned vs. actual progress automatically.

Key highlights:
- **Zero-Touch Autonomous Execution**: Auto-approves high-confidence updates ($\ge 78\%$) and updates project baselines instantly.
- **Tap-to-Record Voice Dictation**: MediaRecorder API with Voice Activity Detection (VAD) decibel monitoring and physical microphone teardown privacy security.
- **Offline-to-Online Sync**: Field connectivity drop resilience with IndexedDB queueing and idempotency-based server deduplication.
- **Multi-Modal Data Capture**: Support for voice, text, site photo OCR & defect detection (Gemini Vision), video keyframes, and Excel/CSV ad-hoc report and schedule imports.
- **Persistent Backend Integration**: FastAPI + SQLite/PostgreSQL database backend with full CRUD, audit trail, and project authorization checks.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 (`react`, `react-dom`)
- **Build Tool**: Vite (`vite`)
- **Language**: TypeScript
- **Routing**: React Router DOM (`react-router-dom` v7)
- **Styling**: Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`)
- **Icons & UI**: Lucide React (`lucide-react`), Canvas Confetti
- **Offline Storage**: IndexedDB (`saarthi_offline_db`)

### Backend
- **Framework**: FastAPI (`fastapi`, `uvicorn`)
- **Database & ORM**: PostgreSQL / SQLite (`sqlalchemy`, `alembic`, `psycopg2-binary`)
- **AI & ML**: Google Gemini Vision (`google-genai`), Sentence-Transformers (SBERT), OpenAI Whisper (`openai-whisper`)
- **Security & Auth**: PyJWT (`python-jose`), Bcrypt (`bcrypt`)
- **Spreadsheet Parsers**: OpenPyXL (`openpyxl`), Pandas (`pandas`)

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js v18+ and `npm`
- Python 3.10+ and `pip` (or Docker & Docker Compose)

---

## 2. Project structure

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
│   │   ├── ReportIntake.tsx      # Tap-to-record voice intake (MediaRecorder Whisper STT + Decibel VAD auto-finish)
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

## 🗺️ Project Roadmap & Status

For detailed feature breakdown, current status, and upcoming enhancements, please refer to:
- 📄 [ROADMAP.md](Roadmap.md) — Feature status tracker
- 📄 [CONTEXT.md](CONTEXT.md) — Comprehensive technical architecture & system documentation
