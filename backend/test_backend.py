import sys
import os

# Ensure backend directory is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_backend_end_to_end():
    print("\n--- 1. Testing GET /health ---")
    res = client.get("/health")
    assert res.status_code == 200
    print("Health response:", res.json())

    print("\n--- 2. Testing Auth Registration & Login ---")
    user_payload = {
        "email": "supervisor@saarthi.io",
        "password": "SecurePassword123!",
        "full_name": "Field Supervisor",
        "role": "supervisor"
    }
    reg_res = client.post("/api/v1/auth/register", json=user_payload)
    print("Register response code:", reg_res.status_code)
    assert reg_res.status_code in (201, 400) # 201 created or 400 if already exists

    login_res = client.post("/api/v1/auth/login", json={"email": "supervisor@saarthi.io", "password": "SecurePassword123!"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    print("Login successful! Token acquired:", token[:20] + "...")

    print("\n--- 3. Testing Project & Activity CRUD ---")
    proj_res = client.post("/api/v1/projects", json={
        "title": "Delhi Metro Line 8 Extension",
        "description": "Substructure and elevation progress tracking"
    })
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]
    print("Created Project ID:", project_id)

    act_res = client.post("/api/v1/activities", json={
        "project_id": project_id,
        "name": "Raft Foundation Concrete Pour",
        "zone": "Zone A",
        "planned_start": "2026-09-01",
        "planned_end": "2026-09-30",
        "progress": 30.0,
        "status": "in_progress",
        "category": "Concrete"
    })
    assert act_res.status_code == 201
    act_id = act_res.json()["id"]
    print("Created Activity ID:", act_id)

    print("\n--- 4. Testing Ported Matching Algorithm Endpoint ---")
    match_payload = {
        "report_text": "Raft Foundation concrete pour in Zone A reached 85% completion today with 4 transit mixers deployed.",
        "activities": [
            {
                "id": act_id,
                "project_id": project_id,
                "name": "Raft Foundation Concrete Pour",
                "zone": "Zone A",
                "planned_start": "2026-09-01",
                "planned_end": "2026-09-30",
                "progress": 30.0,
                "status": "in_progress",
                "category": "Concrete"
            }
        ]
    }
    match_res = client.post("/api/v1/match", json=match_payload)
    assert match_res.status_code == 200
    matches = match_res.json()
    print("Matched Results Count:", len(matches))
    print("Top Match Confidence Score:", matches[0]["overallConfidence"], "%")
    print("Top Match Reason:", matches[0]["reasoning"])
    assert matches[0]["overallConfidence"] >= 78.0

    print("\n--- 5. Testing Audit Log Endpoint ---")
    audit_res = client.post("/api/v1/audit", json={
        "reportText": match_payload["report_text"],
        "matchedActivityId": act_id,
        "matchedActivityName": "Raft Foundation Concrete Pour",
        "matchedZone": "Zone A",
        "previousProgress": 30.0,
        "newProgress": 85.0,
        "confidenceScore": matches[0]["overallConfidence"],
        "subScores": matches[0]["subScores"],
        "status": "auto_approved",
        "timestamp": "13:30:00"
    })
    assert audit_res.status_code == 201
    print("Audit Log Entry Created ID:", audit_res.json()["id"])

    audit_list = client.get("/api/v1/audit")
    assert audit_list.status_code == 200
    print("Total Audit Records in DB:", len(audit_list.json()))

    print("\nSUCCESS: ALL BACKEND ENDPOINTS PASSED VERIFICATION PERFECTLY!")

if __name__ == "__main__":
    test_backend_end_to_end()
