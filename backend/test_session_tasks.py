import sys
import os
import io
import wave
import struct
import math
import uuid
from pathlib import Path
from fastapi.testclient import TestClient

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.main import app

client = TestClient(app)

def create_sample_wav_audio() -> bytes:
    """Generate a clean 2-second mono PCM WAV audio sample for testing transcription endpoint."""
    buf = io.BytesIO()
    sample_rate = 16000
    duration = 2.0
    frequency = 440.0

    n_samples = int(sample_rate * duration)
    with wave.open(buf, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        data = bytearray()
        for i in range(n_samples):
            val = int(16000 * math.sin(2 * math.pi * frequency * i / sample_rate))
            data.extend(struct.pack('<h', val))

        wav_file.writeframes(data)

    return buf.getvalue()

def run_session_tests():
    print("\n=======================================================")
    print("  SAARTHI SESSION VERIFICATION TEST SUITE (TASKS 1 - 4)")
    print("=======================================================\n")

    # 1. Health check
    h = client.get("/health")
    assert h.status_code == 200
    print("[PASS] Health Check:", h.json())

    # 2. TASK 1: Voice Capture Transcription Endpoint Test
    print("\n[TEST TASK 1] Audio Transcription Endpoint POST /api/v1/reports/transcribe...")
    wav_bytes = create_sample_wav_audio()
    res_t1 = client.post(
        "/api/v1/reports/transcribe",
        files={"file": ("speech_sample.wav", wav_bytes, "audio/wav")}
    )
    assert res_t1.status_code == 200, f"Task 1 transcribe endpoint failed: {res_t1.text}"
    t1_data = res_t1.json()
    print("[PASS] Task 1 Audio Transcription Success!")
    print(f"  - Endpoint Status: {t1_data.get('status')}")
    print(f"  - Detected Language: {t1_data.get('language')}")
    print(f"  - Transcribed Text: '{t1_data.get('text')}'")

    # 3. TASK 3: Human-in-the-Loop Review Queue Endpoints Test
    print("\n[TEST TASK 3] Review Queue Endpoints (/audit/pending, /approve, /reject)...")
    
    unique_audit_id = f"AUD-PENDING-{uuid.uuid4().hex[:6]}"
    audit_payload = {
        "id": unique_audit_id,
        "reportText": "60% shuttering done in Zone B, delayed due to material shortage at site.",
        "matchedActivityId": "ACT-102",
        "matchedActivityName": "Zone B Shuttering & Rebar",
        "matchedZone": "Zone B",
        "previousProgress": 40.0,
        "newProgress": 60.0,
        "confidenceScore": 65.0,
        "subScores": {"semanticMatch": 60, "locationMatch": 70, "datePlausibility": 65, "progressConfidence": 65},
        "status": "pending_review",
        "timestamp": "02:30:00"
    }

    create_res = client.post("/api/v1/audit", json=audit_payload)
    assert create_res.status_code == 201, f"Create audit record failed: {create_res.text}"
    print(f"[PASS] Created test pending audit record '{unique_audit_id}'")

    # Fetch pending reviews
    pending_res = client.get("/api/v1/audit/pending")
    assert pending_res.status_code == 200
    pending_items = pending_res.json()
    assert any(i["id"] == unique_audit_id for i in pending_items), f"Pending audit item '{unique_audit_id}' should be returned in /audit/pending"
    print(f"[PASS] Fetched {len(pending_items)} pending review item(s) from /audit/pending!")

    # Manager Approve endpoint test
    approve_res = client.post(f"/api/v1/audit/{unique_audit_id}/approve", json={
        "new_progress": 65.0,
        "notes": "Manager approved with +5% bump"
    })
    assert approve_res.status_code == 200, f"Approve failed: {approve_res.text}"
    app_data = approve_res.json()
    assert app_data["status"] in ("manually_approved", "corrected")
    assert app_data["newProgress"] == 65.0
    print(f"[PASS] Manager Approval Endpoint Success! Status: {app_data['status']}, Approved Progress: {app_data['newProgress']}%")

    # Manager Reject endpoint test
    unique_reject_id = f"AUD-REJECT-{uuid.uuid4().hex[:6]}"
    reject_payload = {**audit_payload, "id": unique_reject_id}
    client.post("/api/v1/audit", json=reject_payload)
    reject_res = client.post(f"/api/v1/audit/{unique_reject_id}/reject", json={"notes": "Incorrect zone mentioned"})
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "rejected"
    print(f"[PASS] Manager Rejection Endpoint Success! Status: rejected")

    # 4. TASK 4: Planned-vs-Actual Progress & Delayed Activities Test
    print("\n[TEST TASK 4] Checking Activities and Progress Data for Dashboard...")
    act_res = client.get("/api/v1/activities")
    assert act_res.status_code == 200
    acts = act_res.json()
    print(f"[PASS] Task 4 Activities API returned {len(acts)} activities for planned-vs-actual tracking!")

    print("\n=======================================================")
    print("  ALL SESSION INTEGRATION TESTS PASSED CLEANLY!  ")
    print("=======================================================\n")

if __name__ == "__main__":
    run_session_tests()
