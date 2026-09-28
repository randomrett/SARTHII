# SAARTHI — Production Deployment Guide

**Smart India Hackathon 2026 · PS ID: SIH26122 · "Intelligent Data Capture & Real-Time Progress Tracking" · Team Hail Mary**

---

## 1. Architecture Overview

SAARTHI uses a decoupled architecture:
- **Frontend**: React 19 + Vite single-page app deployed on **Vercel**.
- **Backend Infrastructure**: FastAPI Python server running in a **Docker Container** on a container host (**Google Cloud Run**, **Render**, **Railway**, or **Fly.io**).
- **Database**: Hosted PostgreSQL (**Neon** or **Supabase**).
- **AI Models**: Pre-loaded SBERT (`sentence-transformers/all-MiniLM-L6-v2`) and OpenAI Whisper (`base`) downloaded during Docker image build time; Google Gemini API on the backend for vision OCR & unstructured extraction.

---

## 2. Frontend Deployment (Vercel)

### Step 1: Push Repository & Connect Vercel
1. Push your repository to GitHub / GitLab.
2. In the Vercel Dashboard, click **Add New Project** and select the `SARTHII` repo.
3. Vercel automatically selects the **Vite** framework preset.

### Step 2: Configure Vercel Settings
- **Framework Preset**: Vite
- **Root Directory**: `./` (Repo root)
- **Build Command**: `npm run build` (`tsc -b && vite build`)
- **Output Directory**: `dist`

### Step 3: Set Environment Variables in Vercel
In **Project Settings -> Environment Variables**, add:

| Environment Variable | Value Example | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://saarthi-backend.onrender.com/api/v1` | Production URL of your FastAPI backend |
| `VITE_WS_URL` | `wss://saarthi-backend.onrender.com/ws/updates` | Production Secure WebSocket URL (`wss://`) |
| `VITE_ENABLE_DEMO_LOGINS` | `true` | Set `true` to enable quick 1-click demo logins on `/login` |

> **IMPORTANT**: `GEMINI_API_KEY` must **NEVER** be added to Vercel or any `VITE_` variable. It exists exclusively on the backend container host.

### Step 4: Confirm vercel.json Permissions & Routing
The repository includes `vercel.json` configured with:
- SPA fallback rewrite (`/(.*)` -> `/index.html`) so deep links and page refreshes work cleanly.
- `Permissions-Policy` header allowing `microphone=(self), camera=(self), geolocation=(self)` for HTTPS microphone access.

---

## 3. Backend Deployment (Docker Container Host)

### Recommended Host: Google Cloud Run / Render / Railway / Fly.io

### Step 1: Provision Hosted Database (Neon or Supabase)
1. Create a PostgreSQL database on **Neon** (`neon.tech`) or **Supabase** (`supabase.com`).
2. Copy the connection string:
   `postgresql://username:password@ep-xyz.neon.tech/saarthi_db?sslmode=require`

### Step 2: Configure Container Environment Variables
Set the following environment variables on your backend container host:

| Environment Variable | Example / Description |
| :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres:password@ep-xyz.neon.tech/saarthi_db?sslmode=require` |
| `SECRET_KEY` | Strong random secret key (e.g. `openssl rand -hex 32`) |
| `GEMINI_API_KEY` | Your Google Gemini API Key |
| `GEMINI_MODEL` | `gemini-1.5-flash` |
| `CORS_ORIGINS` | `https://saarthi-frontend.vercel.app` (Comma-separated Vercel URLs) |
| `PORT` | `8000` (Injected automatically by Cloud Run / Render) |

### Step 3: Build & Deploy Container
The provided `backend/Dockerfile` builds a production container:
- Installs `ffmpeg` and system dependencies.
- Downloads `all-MiniLM-L6-v2` SBERT model and OpenAI Whisper `base` model **at image build time** so cold starts are instant without downloading weights.
- Includes `/health` endpoint check.
- Executes `start.sh`, running `alembic upgrade head` on startup before binding to `$PORT`.

#### Deploying with Docker CLI / Cloud Run:
```bash
cd backend
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/saarthi-backend
gcloud run deploy saarthi-backend \
  --image gcr.io/YOUR_PROJECT_ID/saarthi-backend \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="..."
```

---

## 4. Idempotent Data Seeding

On startup, `app.main:startup_event` runs `seed_default_users_if_empty(db)`. If the database is empty:
- **Demo Users Created**:
  1. `worker@saarthi.ai` / `password123` (Role: `field_worker`)
  2. `manager@saarthi.ai` / `password123` (Role: `manager`)
  3. `admin@saarthi.ai` / `password123` (Role: `admin`)
- **Demo Project Created**: `PROJ-001` — Delhi Metro Phase IV.
- **Demo Activities Created**: `ACT-001` through `ACT-005` seeded into `activities` table.

---

## 5. File Uploads & Ephemerality Note

> **Note on Uploaded Files**: Site photo/video attachments uploaded to `/uploads` are stored on local disk in the container. On ephemeral hosts (Cloud Run, Render, Heroku), local container disk files are wiped upon container restart. This is fully acceptable for hackathon demonstration. For long-term production storage, mount an AWS S3 bucket or Google Cloud Storage bucket to `/uploads`.

---

## 6. Post-Deployment Smoke-Test Checklist

Perform these verification steps after deployment to confirm 100% operational readiness:

- [ ] **1. Health Check Endpoint**: Open `https://YOUR-BACKEND.onrender.com/health` in browser. Expect `{"status": "ok", "gemini_configured": true}`.
- [ ] **2. Login as Field Worker**: Go to Vercel URL -> Login page -> Click **Field Worker**. Confirm redirect to Home page.
- [ ] **3. Submit Text Report**: Type *"Raft Foundation concrete pour in Zone A reached 85% completion today"* -> Click **Match & Evaluate**. Confirm loading spinner + *"Evaluating…"*, auto-approval card, and schedule progress update.
- [ ] **4. Submit Voice Report over HTTPS**: Click **Tap to Record** or say *"Hey Saarthi"* -> Dictate audio -> Click **Finish & Transcribe**. Confirm browser grants microphone permission, Whisper transcribes, and report matches.
- [ ] **5. Login as Manager**: Log out -> Click **Manager** demo login -> Navigate to `/dashboard`.
- [ ] **6. Manager Review Queue**: Submit low-confidence report *"60% shuttering done in Zone B, delayed due to material shortage"*. Go to Manager Dashboard -> Review Queue -> Change reassignment dropdown -> Adjust progress slider -> Click **Reassign & Approve**. Confirm status becomes `corrected` in Audit Trail.
- [ ] **7. Live WebSocket Sync Test**: Open dashboard on two separate browser windows. Submit report in Window 1 -> Confirm Window 2 updates live without manual page refresh.
