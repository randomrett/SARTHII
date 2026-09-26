# SAARTHI — Roadmap

**Smart India Hackathon 2026 · PS ID: SIH26122 · "Intelligent Data Capture & Real-Time Progress Tracking" · Team Hail Mary**

This tracks what's built vs. what's left, based on the official SIH idea submission deck. Update checkboxes as features land.

---

## ✅ Already built (frontend proof-of-concept)

- [x] Voice/text report intake with wake-word activation
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
- [ ] Deployment pipeline (Docker + AWS/Azure per the deck)<-finally currently will be deployed via vercel

## 📥 Data capture (unifying scattered inputs — the core problem statement)

- [x] Photo/scanned-document upload + OCR extraction (Gemini Vision OCR & defect detection)
- [x] Video upload handling (Gemini Vision keyframes & video analysis)
- [x] Excel file ingestion for ad-hoc reports
- [x] Baseline schedule import from Primavera P6 / MS Project / Excel
- [ ] Server-side voice transcription via Whisper (currently only browser SpeechRecognition, English-only)
- [ ] Multilingual voice support (deck promises this for field adoption)

## 🧠 AI/NLP upgrade

- [ ] Real semantic matching via sentence-transformers/SBERT (currently token-overlap + synonym dictionary + Levenshtein, no real embeddings)
- [ ] LLM-based unstructured text extraction (deck references Gemini/GPT for this — note the frontend already has an unwired "Use Live Gemini API" toggle stub)
- [ ] Computer vision for site photo analysis (deck references YOLO)

## 👤 Human-in-the-loop workflow

- [ ] Proper reviewer/approval queue UI for low-confidence matches (beyond the current single-activity picker)
- [ ] Manager approval/rejection endpoints tied to AuditRecord status

## 📊 Dashboard & reporting

- [ ] Planned-vs-actual progress dashboard
- [ ] Gantt chart view
- [ ] Early delay/deviation highlighting
- [ ] Live WebSocket-driven progress updates (no more manual refresh)
- [ ] Notifications for delays/anomalies

## 🛡️ Reliability & ops

- [ ] Offline-to-online sync (deck lists poor site connectivity as a named risk)
- [ ] Persistence — right now everything resets on page reload except wake-phrase training data
- [ ] Security: physical mic-teardown toggle (exists partially), TLS, data isolation (deck's stated security-feasibility claims — worth actually implementing, not just claiming)

## ✨ Polish

- [ ] Rebrand remaining "SetuTrack" references (package name, header title, localStorage keys) to SAARTHI
- [ ] Real README replacing the untouched Vite boilerplate

---

## Completed in latest session

- [x] Fix voice wake-word activation ("Hey Saarthi" — renamed from "Hey Setu")
- [x] Instrument & root-cause voice wake-word state machine & stateless regex fix
- [x] Restructure into multi-page app with `react-router-dom` (5 routes: `/`, `/dashboard`, `/schedule`, `/audit`, `/settings`)
- [x] Centralize shared application state in `ScheduleContext`
- [x] Scaffold backend (FastAPI + PostgreSQL, auth, CRUD, ported matching algorithm)
