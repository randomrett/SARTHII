// Central Backend API Client for SAARTHI
import type { Activity, AuditRecord, MatchResult, User, UserRole } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  status: number;
  is401: boolean;
  is403: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.is401 = status === 401;
    this.is403 = status === 403;
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('saarthi_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('saarthi_token');
        localStorage.removeItem('saarthi_user');
        throw new ApiError('Session expired — please log in again', 401);
      }
      if (response.status === 403) {
        throw new ApiError('Access denied: Operation requires higher permissions', 403);
      }
      if (response.status === 429) {
        throw new ApiError('AI service busy / rate limited', 429);
      }
      if (response.status >= 500) {
        throw new ApiError(`Server error (${response.status})`, response.status);
      }
      const errBody = await response.json().catch(() => ({ detail: response.statusText }));
      throw new ApiError(errBody.detail || `Request failed with status ${response.status}`, response.status);
    }
    return response;
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out after 30 seconds', 408);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network error — service unreachable', 0);
  }
}

export async function checkBackendReachability(): Promise<boolean> {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    const healthUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '/health');
    const res = await fetchWithTimeout(healthUrl, { method: 'GET' }, 3000);
    return res.ok;
  } catch {
    return false;
  }
}

/* Authentication API Methods */
export async function apiLogin(email: string, password: string): Promise<{ access_token: string; token_type: string; user: User }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return await res.json();
}

export async function apiRegister(email: string, password: string, full_name?: string, role?: UserRole): Promise<User> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name, role: role || 'field_worker' })
  });
  return await res.json();
}

export async function apiFetchUsers(): Promise<User[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/auth/users`, {
    headers: getAuthHeaders()
  });
  return await res.json();
}

export async function apiUpdateUserRole(userId: string, role: UserRole): Promise<User> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/auth/users/${userId}/role`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ role })
  });
  return await res.json();
}

/* Activity & Schedule Methods */
export async function fetchActivities(): Promise<Activity[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/activities`, { headers: getAuthHeaders() });
  return await res.json();
}

export async function createActivity(activity: Activity): Promise<Activity> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/activities`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(activity)
  });
  return await res.json();
}

export async function updateActivity(activity: Activity): Promise<Activity> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/activities/${activity.id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(activity)
  });
  return await res.json();
}

export async function deleteActivity(id: string): Promise<void> {
  await fetchWithTimeout(`${API_BASE_URL}/activities/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
}

export async function importScheduleActivities(activities: Activity[]): Promise<Activity[]> {
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
  const res = await fetchWithTimeout(`${API_BASE_URL}/match`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      report_text: reportText,
      activities,
      use_gemini: useGemini
    })
  });
  return await res.json();
}

export async function fetchAuditRecords(): Promise<AuditRecord[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/audit`, { headers: getAuthHeaders() });
  return await res.json();
}

export async function fetchPendingAuditRecords(): Promise<AuditRecord[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/audit/pending`, { headers: getAuthHeaders() });
  return await res.json();
}

export async function saveAuditRecord(record: AuditRecord): Promise<AuditRecord> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/audit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(record)
  });
  return await res.json();
}

export async function approveAuditRecordBackend(
  recordId: string,
  options?: { activity_id?: string; new_progress?: number; notes?: string }
): Promise<AuditRecord> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/audit/${recordId}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(options || {})
  });
  return await res.json();
}

export async function rejectAuditRecordBackend(
  recordId: string,
  notes?: string
): Promise<AuditRecord> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/audit/${recordId}/reject`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ notes })
  });
  return await res.json();
}

export async function submitReportToBackend(
  reportText: string,
  idempotencyKey?: string,
  projectId?: string
): Promise<{ report: any; matchResults: MatchResult[] }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      raw_text: reportText,
      project_id: projectId || null,
      idempotency_key: idempotencyKey || null
    })
  });
  const reportData = await res.json();

  let matchResults: MatchResult[] = [];
  try {
    const matchRes = await fetchWithTimeout(`${API_BASE_URL}/reports/${reportData.id}/match`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    matchResults = await matchRes.json();
  } catch (e) {
    console.warn('[API] Could not fetch backend match result for report:', e);
  }
  return { report: reportData, matchResults };
}

export async function apiTranscribeAudio(audioBlob: Blob): Promise<{ text: string; language?: string; engine?: string; status?: string }> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'field_dictation.webm');

  const headers: Record<string, string> = {};
  const token = localStorage.getItem('saarthi_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetchWithTimeout(`${API_BASE_URL}/reports/transcribe`, {
    method: 'POST',
    headers,
    body: formData
  }, 45000); // 45 second timeout for audio processing

  return await res.json();
}

