// Central Backend API Client for SAARTHI
import type { Activity, AuditRecord, MatchResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export async function checkBackendReachability(): Promise<boolean> {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    // Ping root /health or /api/v1/projects
    const healthUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '/health');
    const res = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchActivities(): Promise<Activity[]> {
  const res = await fetch(`${API_BASE_URL}/activities`);
  if (!res.ok) throw new Error(`Failed to fetch activities: ${res.statusText}`);
  return await res.json();
}

export async function createActivity(activity: Activity): Promise<Activity> {
  const res = await fetch(`${API_BASE_URL}/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(activity)
  });
  if (!res.ok) throw new Error(`Failed to create activity: ${res.statusText}`);
  return await res.json();
}

export async function updateActivity(activity: Activity): Promise<Activity> {
  const res = await fetch(`${API_BASE_URL}/activities/${activity.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(activity)
  });
  if (!res.ok) throw new Error(`Failed to update activity: ${res.statusText}`);
  return await res.json();
}

export async function deleteActivity(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/activities/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok && res.status !== 204) throw new Error(`Failed to delete activity: ${res.statusText}`);
}

export async function importScheduleActivities(activities: Activity[]): Promise<Activity[]> {
  // Bulk import schedule activities to backend
  const created: Activity[] = [];
  for (const act of activities) {
    try {
      const saved = await createActivity(act);
      created.push(saved);
    } catch (e) {
      console.warn(`[API] Failed to import activity ${act.name}:`, e);
    }
  }
  return created;
}

export async function matchReportBackend(reportText: string, activities: Activity[], useGemini = false): Promise<MatchResult[]> {
  const res = await fetch(`${API_BASE_URL}/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      report_text: reportText,
      activities,
      use_gemini: useGemini
    })
  });
  if (!res.ok) throw new Error(`Backend matching failed: ${res.statusText}`);
  return await res.json();
}

export async function fetchAuditRecords(): Promise<AuditRecord[]> {
  const res = await fetch(`${API_BASE_URL}/audit`);
  if (!res.ok) throw new Error(`Failed to fetch audit records: ${res.statusText}`);
  return await res.json();
}

export async function fetchPendingAuditRecords(): Promise<AuditRecord[]> {
  const res = await fetch(`${API_BASE_URL}/audit/pending`);
  if (!res.ok) throw new Error(`Failed to fetch pending audit records: ${res.statusText}`);
  return await res.json();
}

export async function saveAuditRecord(record: AuditRecord): Promise<AuditRecord> {
  const res = await fetch(`${API_BASE_URL}/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record)
  });
  if (!res.ok) throw new Error(`Failed to save audit record: ${res.statusText}`);
  return await res.json();
}

export async function approveAuditRecordBackend(
  recordId: string,
  options?: { activity_id?: string; new_progress?: number; notes?: string }
): Promise<AuditRecord> {
  const res = await fetch(`${API_BASE_URL}/audit/${recordId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options || {})
  });
  if (!res.ok) throw new Error(`Failed to approve audit record: ${res.statusText}`);
  return await res.json();
}

export async function rejectAuditRecordBackend(
  recordId: string,
  notes?: string
): Promise<AuditRecord> {
  const res = await fetch(`${API_BASE_URL}/audit/${recordId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes })
  });
  if (!res.ok) throw new Error(`Failed to reject audit record: ${res.statusText}`);
  return await res.json();
}

export async function submitReportToBackend(
  reportText: string,
  idempotencyKey?: string,
  projectId?: string
): Promise<{ report: any; matchResults: MatchResult[] }> {
  const res = await fetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      raw_text: reportText,
      project_id: projectId || null,
      idempotency_key: idempotencyKey || null
    })
  });
  if (!res.ok) throw new Error(`Failed to submit report: ${res.statusText}`);
  const reportData = await res.json();

  // Match the report
  const matchRes = await fetch(`${API_BASE_URL}/reports/${reportData.id}/match`, {
    method: 'POST'
  });
  const matchResults = matchRes.ok ? await matchRes.json() : [];
  return { report: reportData, matchResults };
}
