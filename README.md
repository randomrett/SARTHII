# SAARTHI — AI-Powered Construction Planning to Execution Bridge

**Smart India Hackathon 2026 · Problem Statement ID: SIH26122**  
*Team Hail Mary*

---

## 📌 Overview

**SAARTHI** is an AI-powered Planning-to-Execution bridge designed to solve the critical infrastructure challenge of manual, delayed, and scattered site progress reporting. Field updates from site supervisors are captured via hands-free voice dictation ("Hey Saarthi" wake word with decibel-based Voice Activity Detection), structured text, site photos, videos, or spreadsheet uploads. SAARTHI normalizes field jargon, matches reports against master schedule activities, calculates confidence scores, and updates planned vs. actual progress automatically.

Key highlights:
- **Zero-Touch Autonomous Execution**: Auto-approves high-confidence updates ($\ge 78\%$) and updates project baselines instantly.
- **Hands-Free Voice Dictation**: Voice Activity Detection (VAD) with decibel-level monitoring and physical microphone teardown privacy security.
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

### 1. Backend Setup (FastAPI API Server)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Run Uvicorn development server
uvicorn app.main:app --reload --port 8000
```

The backend server will run at `http://localhost:8000` (Interactive API docs at `http://localhost:8000/docs`).

*Optional Environment File (`.env` in repo root):*
```env
GEMINI_API_KEY=your-gemini-api-key-here
SECRET_KEY=your-jwt-secret-key
DATABASE_URL=sqlite:///./saarthi.db
```

---

### 2. Frontend Setup (React + Vite Web App)

```bash
# In the root repository directory
npm install

# Start Vite development server
npm run dev
```

The frontend app will run at `http://localhost:5173`.

---

### 3. Docker Compose Setup (Backend + PostgreSQL)

```bash
cd backend
docker compose up --build
```

---

## 🗺️ Project Roadmap & Status

For detailed feature breakdown, current status, and upcoming enhancements, please refer to:
- 📄 [ROADMAP.md](Roadmap.md) — Feature status tracker
- 📄 [CONTEXT.md](CONTEXT.md) — Comprehensive technical architecture & system documentation
