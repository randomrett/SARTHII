# SAARTHI — Roadmap

**Smart India Hackathon 2026 · PS ID: SIH26122 · "Intelligent Data Capture & Real-Time Progress Tracking" · Team Hail Mary**

This tracks what's built vs. what's left, based on the official SIH idea submission deck. Update checkboxes as features land.

---

## ✅ Already built (frontend proof-of-concept)

- [x] Voice/text report intake with wake-word activation ("Hey Saarthi")
- [x] Heuristic (regex/keyword) semantic + location + date matching
- [x] Confidence scoring with high/low threshold split
- [x] Zero-touch auto-approval vs. manual review toggle
- [x] Audit log of matches and updates
- [x] Schedule builder (CRUD on activities) with 3 sample project presets

---

## 🔧 Backend & infrastructure

- [x] FastAPI backend with PostgreSQL, JWT auth, Docker deployment
- [x] Database schema for users, projects, activities, reports, audit trail
- [x] Port matching algorithm to backend, expose as API
- [x] Live WebSocket update server (`/ws/updates`)
- [ ] Deployment pipeline (Docker + AWS/Azure per the deck) — currently ready for Vercel / Cloud run deployment

---

## 📥 Data capture (unifying scattered inputs — the core problem statement)

- [x] Photo/scanned-document upload + OCR extraction (Gemini Vision OCR & defect detection)
- [x] Video upload handling (Gemini Vision keyframes & video analysis)
- [x] Excel file ingestion for ad-hoc reports
- [x] Baseline schedule import from Primavera P6 / MS Project / Excel
- [x] Reworked split voice capture architecture: browser SpeechRecognition wake-word trigger + MediaRecorder raw audio capture
- [x] Server-side voice transcription via Whisper (`POST /api/v1/reports/transcribe`)
- [x] Manual fallback "Tap to Record" button (bypasses wake word for guaranteed reliability)
- [ ] Multilingual voice support (Hindi/Marathi/Tamil phonetics dictionary extensions)

---

## 🧠 AI/NLP upgrade

- [x] Real semantic matching via sentence-transformers/SBERT (wired in backend `app.services.semantic_matcher`)
- [x] LLM-based unstructured text extraction (Task 2 Gemini Hybrid extraction mode)
- [x] Computer vision / vision analysis for site photo analysis (Task 3 Gemini Vision OCR & defect detection)

---

## 👤 Human-in-the-loop workflow

- [x] Proper reviewer/approval queue UI for low-confidence matches (`ReviewQueue.tsx` on Dashboard)
- [x] Manager approval/rejection endpoints tied to AuditRecord status (`/audit/pending`, `/audit/{id}/approve`, `/audit/{id}/reject`)

---

## 📊 Dashboard & reporting

- [x] Planned-vs-actual progress dashboard (`PlannedVsActual.tsx` with date-based expected progress vs actual gap analysis)
- [x] Gantt chart timeline view (Table & Gantt toggle view on Schedule Builder)
- [x] Early delay/deviation highlighting (Red/amber slippage gap badges & highlighted delayed cards)
- [x] Live WebSocket-driven progress updates (Real-time automatic sync without manual page refresh)
- [x] Notifications for delays/anomalies (In-app toast notifications & pending review badges)

---

## 🛡️ Reliability & ops

- [x] Offline-to-online sync (IndexedDB queueing + idempotency key server deduplication)
- [x] Persistence — frontend ScheduleContext fully connected to backend REST CRUD & audit endpoints
- [x] Security: physical mic-teardown toggle, secure context TLS readiness, project data isolation checks

---

## ✨ Polish

- [x] Rebrand remaining "SetuTrack" references to SAARTHI
- [x] Fix dark-on-dark button contrast accessibility bugs across all pages
- [x] Real README replacing Vite boilerplate

---

## Completed in latest session

- [x] **Task 1**: Completely reworked voice capture architecture (SpeechRecognition ONLY for wake-word -> MediaRecorder raw audio -> Whisper server endpoint `POST /reports/transcribe` -> report pipeline). Added prominent manual "Tap to Record" fallback button.
- [x] **Task 2**: Fixed dark-on-dark button contrast accessibility bugs across all pages (+ Add Activity, Process Report, Save, Upload buttons).
- [x] **Task 3**: Built Human-in-the-loop Review Queue on Dashboard with manager approval/rejection backend endpoints (`/audit/pending`, `/approve`, `/reject`).
- [x] **Task 4**: Built Planned-vs-Actual progress dashboard, Gantt timeline view, early delay highlighting, live WebSocket push updates (`/ws/updates`), and in-app delay/anomaly toast notifications.
