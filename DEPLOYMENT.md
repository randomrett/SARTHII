# SAARTHI — Production Deployment Guide & Architecture Reference

**Smart India Hackathon 2026 · PS ID: SIH26122 · "Intelligent Data Capture & Real-Time Progress Tracking" · Team Hail Mary**

---

## 1. Architecture Split

SAARTHI uses a decoupled multi-cloud architecture optimized for high-performance AI inference, persistent state, and serverless scalability:

- **Frontend SPA**: React 19 + TypeScript + Tailwind CSS v4 deployed on **Vercel**.
- **Backend API & AI Engine**: FastAPI Python backend running as a Docker Web Service on **Render**.
- **Database**: PostgreSQL hosted on **Supabase** (connected via Supabase Connection Pooler).
- **File Storage**: **Supabase Storage** (`report-media` PUBLIC bucket) for uploaded site photos and videos.

```
                          ┌───────────────────────────┐
                          │   Vercel (Frontend SPA)   │
                          │   React 19 / Vite / TS    │
                          └─────────────┬─────────────┘
                                        │ HTTPS / WSS
                                        ▼
                          ┌───────────────────────────┐
                          │ Render (FastAPI Container)│
                          │  Docker / SBERT / Whisper │
                          └──────┬──────────────┬─────┘
                                 │              │
                    SQL (Pooler) │              │ REST API
                                 ▼              ▼
                    ┌──────────────────────────────┐
                    │ Supabase (Postgres & Storage)│
                    │   DB Tables + report-media   │
                    └──────────────────────────────┘
```

---

## 2. Task 1 — Frontend Deployment on Vercel

### Step-by-Step Vercel Setup

1. **Import Repository**:
   - Push your code to GitHub.
   - Go to [Vercel Dashboard](https://vercel.com/dashboard) -> **Add New** -> **Project**.
   - Select the `SARTHII` repository.

2. **Framework & Build Settings**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build` (`tsc -b && vite build`)
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
   - **Node.js Version**: 18.x or 20.x (pinned in `package.json` `engines`: `>=18.0.0`)

3. **Vercel SPA Rewrites & Permissions-Policy (`vercel.json`)**:
   Ensure `vercel.json` exists at the repository root to handle client-side routing and browser microphone access:
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ],
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           {
             "key": "Permissions-Policy",
             "value": "microphone=(self), camera=(self), geolocation=(self)"
           }
         ]
       }
     ]
   }
   ```

4. **Vercel Environment Variables**:
   Set the following variables in Vercel Project Settings -> **Environment Variables**:

   | Variable Name | Value / Description | Example |
   |---|---|---|
   | `VITE_API_BASE_URL` | Render FastAPI Backend REST API base URL | `https://saarthi-backend.onrender.com/api/v1` |
   | `VITE_WS_URL` | Render FastAPI WebSocket endpoint | `wss://saarthi-backend.onrender.com/ws/updates` |
   | `VITE_ENABLE_DEMO_LOGINS` | Display quick role switcher on login page | `true` |

5. **Secrets & Security Isolation Verification**:
   - `GEMINI_API_KEY`, `JWT_SECRET` (`SECRET_KEY`), and `SUPABASE_SERVICE_ROLE_KEY` MUST exist ONLY on Render backend — NEVER in Vercel environment variables or frontend code bundles.
   - Frontend Gemini API Key browser-pasting input fields have been completely removed.

6. **WebSocket Resilience & Fallback Polling**:
   - If the WebSocket connection to Render fails or drops (e.g., during Render cold start), `ScheduleContext` automatically degrades gracefully to HTTP polling of `/activities` and `/audit` endpoints every 12 seconds.

---

## 3. Task 2 — Backend Deployment on Render

### Step-by-Step Render Docker Setup

1. **Deploying via `render.yaml` Blueprint**:
   - Create a Web Service on Render using the repository root `render.yaml`:
   ```yaml
   services:
     - type: web
       name: saarthi-backend
       runtime: docker
       dockerfilePath: ./backend/Dockerfile
       dockerContext: ./backend
       plan: free
       healthCheckPath: /health
       envVars:
         - key: PORT
           value: 8000
         - key: DATABASE_URL
           sync: false
         - key: JWT_SECRET
           sync: false
         - key: GEMINI_API_KEY
           sync: false
         - key: SUPABASE_URL
           sync: false
         - key: SUPABASE_SERVICE_ROLE_KEY
           sync: false
         - key: CORS_ORIGINS
           sync: false
   ```

2. **Docker Model Pre-Downloading**:
   - The `Dockerfile` bakes the SBERT (`all-MiniLM-L6-v2`) and Whisper (`base`) models into the image layer at build time:
     ```dockerfile
     RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2'); import whisper; whisper.load_model('base')"
     ```
   - This eliminates model download delays during container cold starts.

3. **Render Environment Variables**:
   Configure these in Render Dashboard -> Web Service -> **Environment**:

   | Variable Name | Source / Description |
   |---|---|
   | `DATABASE_URL` | Supabase Transaction Connection Pooler URI (e.g. `postgresql://postgres.ref:password@aws-0-region.pooler.supabase.com:6543/postgres`) |
   | `SECRET_KEY` | Strong random string for JWT signing |
   | `GEMINI_API_KEY` | Google Gemini API key from AI Studio |
   | `SUPABASE_URL` | Supabase Project URL (`https://<project-ref>.supabase.co`) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase Secret Service Role Key (bypasses RLS for storage uploads) |
   | `CORS_ORIGINS` | `https://saarthi-frontend.vercel.app,https://.*\.vercel\.app,http://localhost:5173` |
   | `WHISPER_MODEL_NAME` | `base` (or `tiny` for lower RAM environments) |

4. **Memory Footprint & Tier Recommendation**:
   - **Empirical Measured RSS Memory Usage**:
     - Python Runtime Base RSS: 17.7 MB
     - PyTorch + SBERT (`all-MiniLM-L6-v2`): 582.0 MB (+564.3 MB)
     - OpenAI Whisper (`base`): 1004.5 MB (+422.5 MB)
     - **Total Measured Process RSS Footprint**: **1004.5 MB (~1 GB)**
   - **Free Tier (512 MB RAM) vs. Starter Tier**:
     - Render's **Free Tier** provides 512 MB RAM. Loading unquantized PyTorch + SBERT + Whisper `base` simultaneously exceeds 512 MB and will trigger an OOM kill.
     - Setting `WHISPER_MODEL_NAME=tiny` reduces memory footprint to ~650 MB, which is still above 512 MB.
     - **Recommendation**: Render's **$7/mo Starter Tier** (up to 2 GB RAM) is **MANDATORY** for live production/demo day to avoid OOM container kills and eliminate 15-minute idle sleep cold starts.

5. **Operational Cold Start Notice**:
   - Render Free web services spin down after 15 minutes of inactivity. The initial wake request can take ~45–60 seconds.
   - **Demo Tip**: Send a request to `GET /health` 2 minutes prior to live presentations to ensure the container is warm.

---

## 4. Task 3 — Database & File Storage on Supabase

### Database Connection Setup

1. **Create Supabase Project**:
   - Sign in to [Supabase](https://supabase.com/).
   - Click **New Project**, choose a region, and set a strong database password.

2. **Connection Pooler URL**:
   - Navigate to **Project Settings** -> **Database** -> **Connection Pooling**.
   - Mode: **Transaction** (Port `6543` or `5432`).
   - Copy the Connection Pooler URI and set it as `DATABASE_URL` on Render.
   - `database.py` automatically sets `pool_pre_ping=True` and `pool_recycle=300` to prevent stale connection drops.

3. **Alembic Migrations**:
   - `start.sh` automatically runs database migrations on container launch:
     ```bash
     alembic upgrade head
     ```

4. **Supabase Inactivity Notice**:
   - Supabase Free-tier databases pause after 7 days of inactivity. Data is preserved. A single click on **Restore Project** in the Supabase dashboard brings it back instantly.

### File Storage Setup (Uploaded Site Media)

1. **Create Storage Bucket**:
   - Go to **Storage** in Supabase Dashboard.
   - Click **New Bucket**.
   - Name: `report-media`
   - Toggle **Public Bucket**: `ON` (PUBLIC bucket option used so frontend can render images in standard `<img>` / `<video>` elements without managing signed URL token refreshes).

2. **Storage Upload Logic**:
   - Endpoint `POST /api/v1/reports/upload-image` and `POST /api/v1/reports/upload-video` stream image bytes directly to Gemini Vision, upload the file bytes to `report-media/images/...` or `report-media/videos/...` on Supabase Storage, and store the resulting public URL on the report audit record.
   - If Supabase environment variables are not configured, media storage seamlessly falls back to `/uploads/...` on local disk.

---

## 5. Post-Deploy Smoke-Test Checklist

Use this checklist to verify production health after deployment:

- [ ] **1. Health Check Endpoint**:
  - Request: `GET https://saarthi-backend.onrender.com/health`
  - Expected: `{"status":"ok","gemini_configured":true,"gemini_model":"gemini-1.5-flash"}`
- [ ] **2. Role-Based Authentication**:
  - Log in as Field Worker (`worker@saarthi.gov.in` / `worker123`).
  - Log in as Manager (`manager@saarthi.gov.in` / `manager123`).
  - Log in as Admin (`admin@saarthi.gov.in` / `admin123`).
- [ ] **3. Text Report Round-Trip**:
  - Submit: *"Casting raft foundation slab concrete in Zone 1 today 60% done"*.
  - Confirm: High-confidence match ($\ge 78\%$) auto-approves and updates progress to 60%.
- [ ] **4. Voice Dictation over HTTPS**:
  - Open Vercel production URL on smartphone / desktop over HTTPS.
  - Grant mic permission and tap to record.
  - Confirm Whisper STT transcribes speech into report text and matches activity.
- [ ] **5. Image Report & Supabase Storage**:
  - Upload a site photo on `/` or `/dashboard`.
  - Confirm Gemini Vision extracts progress/defects.
  - Inspect returned `media_url` — it should point to `https://<ref>.supabase.co/storage/v1/object/public/report-media/images/...`.
- [ ] **6. Manager Review Queue Display**:
  - Submit a low-confidence report to trigger the pending review queue.
  - Open `/dashboard` as Manager and verify image thumbnail renders cleanly from Supabase Storage.
- [ ] **7. Live WebSocket Sync & Fallback**:
  - Open two browser tabs side-by-side.
  - Approve a report in Tab 1; confirm Tab 2 updates instantly via WebSockets (or fallback polling).
- [ ] **8. Ephemeral Disk Persistence Regression Test**:
  - Restart the Render web service container.
  - Refresh the frontend app.
  - Confirm previously uploaded site photos still load cleanly from Supabase Storage.
