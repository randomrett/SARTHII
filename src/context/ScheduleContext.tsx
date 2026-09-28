import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Activity, AuditRecord, MatchResult, SchedulePreset } from '../types';
import { SCHEDULE_PRESETS } from '../utils/presets';
import { matchReportToSchedule } from '../utils/matchingAlgorithm';
import confetti from 'canvas-confetti';
import {
  fetchActivities as apiFetchActivities,
  createActivity as apiCreateActivity,
  updateActivity as apiUpdateActivity,
  deleteActivity as apiDeleteActivity,
  importScheduleActivities as apiImportSchedule,
  fetchAuditRecords as apiFetchAuditRecords,
  saveAuditRecord as apiSaveAuditRecord,
  approveAuditRecordBackend as apiApproveAuditRecord,
  rejectAuditRecordBackend as apiRejectAuditRecord,
  submitReportToBackend as apiSubmitReport,
  checkBackendReachability
} from '../utils/api';
import {
  enqueueReport,
  getQueuedReports,
  removeQueuedReport,
  getQueueCount
} from '../utils/offlineStore';

export interface LatestMatchSummary {
  activityName: string;
  zone: string;
  confidence: number;
  isAutoApproved: boolean;
  newProgress: number;
  reportText: string;
  isQueuedOffline?: boolean;
  idempotencyKey?: string;
}

export interface InAppNotification {
  id: string;
  type: 'delay' | 'pending_review' | 'auto_approved';
  title: string;
  message: string;
  timestamp: string;
}

interface ScheduleContextType {
  currentPreset: SchedulePreset;
  activities: Activity[];
  matchResults: MatchResult[] | null;
  isProcessing: boolean;
  auditRecords: AuditRecord[];
  pendingAuditRecords: AuditRecord[];
  autoApproveMode: boolean;
  useGeminiApi: boolean;
  apiKey: string;
  isBackendOnline: boolean;
  offlineQueueCount: number;
  lastAutoUpdateNotification: {
    activityName: string;
    zone: string;
    oldProgress: number;
    newProgress: number;
    score: number;
  } | null;
  latestMatchSummary: LatestMatchSummary | null;
  notifications: InAppNotification[];
  handleSelectPreset: (preset: SchedulePreset) => void;
  handleAddActivity: (newAct: Activity) => Promise<void>;
  handleUpdateActivity: (updatedAct: Activity) => Promise<void>;
  handleDeleteActivity: (id: string) => Promise<void>;
  handleImportSchedule: (newActivities: Activity[]) => Promise<void>;
  handleSubmitReport: (reportText: string) => Promise<void>;
  handleApproveReview: (recordId: string, options?: { activity_id?: string; new_progress?: number; notes?: string }) => Promise<void>;
  handleRejectReview: (recordId: string, notes?: string) => Promise<void>;
  handleClearAudit: () => void;
  flushOfflineQueue: () => Promise<void>;
  setAutoApproveMode: React.Dispatch<React.SetStateAction<boolean>>;
  setUseGeminiApi: React.Dispatch<React.SetStateAction<boolean>>;
  setApiKey: React.Dispatch<React.SetStateAction<string>>;
  dismissNotification: () => void;
  dismissToastNotification: (id: string) => void;
  clearLatestMatchSummary: () => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPreset, setCurrentPreset] = useState<SchedulePreset>(SCHEDULE_PRESETS[0]);
  const [activities, setActivities] = useState<Activity[]>(SCHEDULE_PRESETS[0].activities);
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  // Zero-Touch Autonomous Mode (Default: true)
  const [autoApproveMode, setAutoApproveMode] = useState<boolean>(true);
  const [lastAutoUpdateNotification, setLastAutoUpdateNotification] = useState<{
    activityName: string;
    zone: string;
    oldProgress: number;
    newProgress: number;
    score: number;
  } | null>(null);

  const [latestMatchSummary, setLatestMatchSummary] = useState<LatestMatchSummary | null>(null);

  // AI Config & Connectivity State
  const [useGeminiApi, setUseGeminiApi] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);

  const addToastNotification = useCallback((type: 'delay' | 'pending_review' | 'auto_approved', title: string, message: string) => {
    const notif: InAppNotification = {
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      title,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setNotifications(prev => [notif, ...prev.slice(0, 9)]);
  }, []);

  const dismissToastNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Sync state with backend database on load
  const loadBackendData = useCallback(async () => {
    const reachable = await checkBackendReachability();
    setIsBackendOnline(reachable);

    const count = await getQueueCount();
    setOfflineQueueCount(count);

    if (reachable) {
      try {
        const backendActs = await apiFetchActivities();
        if (backendActs && backendActs.length > 0) {
          setActivities(backendActs);
        } else {
          await apiImportSchedule(currentPreset.activities);
          setActivities(currentPreset.activities);
        }
      } catch (err) {
        console.warn('[SAARTHI CONTEXT] Could not load activities from backend:', err);
      }

      try {
        const backendAudits = await apiFetchAuditRecords();
        setAuditRecords(backendAudits);
      } catch (err) {
        console.warn('[SAARTHI CONTEXT] Could not load audit records from backend:', err);
      }
    }
  }, [currentPreset.activities]);

  useEffect(() => {
    loadBackendData();
  }, [loadBackendData]);

  // TASK 4 ITEM 4: LIVE WEBSOCKET-DRIVEN REAL-TIME UPDATES WITH POLLING FALLBACK
  useEffect(() => {
    if (!isBackendOnline) return;

    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let pollInterval: any = null;

    const startPollingFallback = () => {
      if (pollInterval) return;
      console.log('⚡ [SAARTHI FALLBACK POLLING] WebSocket inactive — polling endpoints every 12s...');
      pollInterval = setInterval(async () => {
        try {
          const freshActs = await apiFetchActivities();
          setActivities(freshActs);
          const freshAudits = await apiFetchAuditRecords();
          setAuditRecords(freshAudits);
        } catch (e) {
          console.warn('[SAARTHI POLLING ERR]:', e);
        }
      }, 12000);
    };

    const stopPollingFallback = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const connectWebSocket = () => {
      try {
        const envWsUrl = import.meta.env.VITE_WS_URL;
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
        const defaultWsUrl = apiBaseUrl.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '') + '/ws/updates';
        const wsUrl = envWsUrl || defaultWsUrl;

        console.log(`[SAARTHI WS CLIENT] Connecting to WebSocket at ${wsUrl}...`);
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          stopPollingFallback();
          console.log('[SAARTHI WS CLIENT] WebSocket connection established successfully.');
        };

        socket.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('⚡ [SAARTHI WS EVENT RECV]:', data);

            const freshActs = await apiFetchActivities();
            setActivities(freshActs);

            const freshAudits = await apiFetchAuditRecords();
            setAuditRecords(freshAudits);

            if (data.type === 'AUDIT_RECORD_CREATED') {
              if (data.status === 'pending_review') {
                addToastNotification(
                  'pending_review',
                  'Low-Confidence Report Queued',
                  `Report for '${data.activity_name}' requires manager review.`
                );
              }
            } else if (data.type === 'REVIEW_APPROVED') {
              addToastNotification(
                'auto_approved',
                'Report Approved & Synchronized',
                `Activity '${data.activity_name}' progress updated to ${data.new_progress}%.`
              );
            }
          } catch (err) {
            console.warn('[SAARTHI WS PARSE ERROR]:', err);
          }
        };

        socket.onclose = () => {
          console.warn('[SAARTHI WS CLIENT] WebSocket closed. Starting fallback polling...');
          startPollingFallback();
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };

        socket.onerror = (err) => {
          console.warn('[SAARTHI WS CLIENT ERROR]:', err);
          socket?.close();
        };
      } catch (e) {
        console.warn('[SAARTHI WS INIT ERR]:', e);
        startPollingFallback();
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) socket.close();
      stopPollingFallback();
    };
  }, [isBackendOnline, addToastNotification]);

  // Flush offline queue when connectivity returns
  const flushOfflineQueue = useCallback(async () => {
    const reachable = await checkBackendReachability();
    setIsBackendOnline(reachable);
    if (!reachable) return;

    const queued = await getQueuedReports();
    if (queued.length === 0) {
      setOfflineQueueCount(0);
      return;
    }

    console.log(`⚡ [SAARTHI OFFLINE SYNC] Flushing ${queued.length} queued reports to backend...`);

    for (const item of queued) {
      try {
        await apiSubmitReport(item.reportText, item.idempotencyKey);
        await removeQueuedReport(item.idempotencyKey);
      } catch (err) {
        console.warn(`[SAARTHI OFFLINE SYNC] Failed to sync report '${item.idempotencyKey}':`, err);
      }
    }

    const remainingCount = await getQueueCount();
    setOfflineQueueCount(remainingCount);

    const freshActs = await apiFetchActivities();
    setActivities(freshActs);

    const freshAudits = await apiFetchAuditRecords();
    setAuditRecords(freshAudits);
  }, []);

  const handleSelectPreset = async (preset: SchedulePreset) => {
    setCurrentPreset(preset);
    setActivities(preset.activities);
    setMatchResults(null);
    setLastAutoUpdateNotification(null);
    setLatestMatchSummary(null);

    if (isBackendOnline) {
      try {
        await apiImportSchedule(preset.activities);
        const fresh = await apiFetchActivities();
        setActivities(fresh);
      } catch (e) {
        console.warn('[SAARTHI] Failed to persist preset to backend:', e);
      }
    }
  };

  const handleAddActivity = async (newAct: Activity) => {
    setActivities(prev => [...prev, newAct]);
    if (isBackendOnline) {
      try {
        const saved = await apiCreateActivity(newAct);
        setActivities(prev => prev.map(a => a.id === newAct.id ? saved : a));
      } catch (e) {
        console.warn('[SAARTHI] Failed to create activity on backend:', e);
      }
    }
  };

  const handleUpdateActivity = async (updatedAct: Activity) => {
    setActivities(prev => prev.map(a => a.id === updatedAct.id ? updatedAct : a));
    if (isBackendOnline) {
      try {
        await apiUpdateActivity(updatedAct);
      } catch (e) {
        console.warn('[SAARTHI] Failed to update activity on backend:', e);
      }
    }
  };

  const handleDeleteActivity = async (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
    if (isBackendOnline) {
      try {
        await apiDeleteActivity(id);
      } catch (e) {
        console.warn('[SAARTHI] Failed to delete activity on backend:', e);
      }
    }
  };

  const handleImportSchedule = async (newActivities: Activity[]) => {
    setActivities(newActivities);
    setMatchResults(null);
    setLastAutoUpdateNotification(null);
    setLatestMatchSummary(null);

    if (isBackendOnline) {
      try {
        await apiImportSchedule(newActivities);
        const fresh = await apiFetchActivities();
        setActivities(fresh);
      } catch (e) {
        console.warn('[SAARTHI] Failed to import schedule to backend:', e);
      }
    }
  };

  const handleSubmitReport = async (reportText: string) => {
    if (!reportText || !reportText.trim() || isProcessing) {
      console.warn('[SAARTHI] Report submit ignored: empty text or request already in flight.');
      return;
    }

    setIsProcessing(true);
    setLastAutoUpdateNotification(null);

    try {
      const reachable = await checkBackendReachability();
      setIsBackendOnline(reachable);

      // OFFLINE QUEUE PATH
      if (!reachable) {
        const queuedItem = await enqueueReport(reportText);
        const count = await getQueueCount();
        setOfflineQueueCount(count);

        setLatestMatchSummary({
          activityName: 'Queued for Sync',
          zone: 'Offline Queue',
          confidence: 100,
          isAutoApproved: false,
          newProgress: 0,
          reportText,
          isQueuedOffline: true,
          idempotencyKey: queuedItem.idempotencyKey
        });

        addToastNotification(
          'pending_review',
          'Backend Unreachable — Report Queued',
          'Saved locally. Will auto-sync to baseline schedule when connectivity is restored.'
        );
        return;
      }

      // ONLINE PATH
      const results = matchReportToSchedule(reportText, activities);
      setMatchResults(results);

      if (results && results.length > 0) {
        const topMatch = results[0];
        const targetActivity = topMatch.activity;
        const previousProgress = targetActivity.progress;
        const newProgress = topMatch.extractedProgress;
        const isHighConfidence = topMatch.overallConfidence >= 78;
        const willAutoApprove = autoApproveMode && isHighConfidence;

        setLatestMatchSummary({
          activityName: targetActivity.name,
          zone: targetActivity.zone,
          confidence: topMatch.overallConfidence,
          isAutoApproved: willAutoApprove,
          newProgress,
          reportText
        });

        const idempotencyKey = `IDEM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const { report: backendReport } = await apiSubmitReport(reportText, idempotencyKey);

        if (willAutoApprove) {
          let newStatus = targetActivity.status;
          if (newProgress >= 100) newStatus = 'completed';
          else if (newProgress > 0 && newStatus === 'not_started') newStatus = 'in_progress';

          const updatedAct: Activity = {
            ...targetActivity,
            progress: newProgress,
            status: newStatus
          };

          setActivities(prev => prev.map(a => a.id === targetActivity.id ? updatedAct : a));
          await apiUpdateActivity(updatedAct);

          const autoAuditRecord: AuditRecord = {
            id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
            report_id: backendReport?.id,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            reportText,
            matchedActivityId: targetActivity.id,
            matchedActivityName: targetActivity.name,
            matchedZone: targetActivity.zone,
            previousProgress,
            newProgress,
            confidenceScore: topMatch.overallConfidence,
            subScores: topMatch.subScores,
            status: 'auto_approved'
          };
          
          await apiSaveAuditRecord(autoAuditRecord);
          const freshAudits = await apiFetchAuditRecords();
          setAuditRecords(freshAudits);

          setLastAutoUpdateNotification({
            activityName: targetActivity.name,
            zone: targetActivity.zone,
            oldProgress: previousProgress,
            newProgress,
            score: topMatch.overallConfidence
          });

          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.7 },
            colors: ['#00F0FF', '#10B981', '#FF9F1C']
          });
        } else {
          const pendingAuditRecord: AuditRecord = {
            id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
            report_id: backendReport?.id,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            reportText,
            matchedActivityId: targetActivity.id,
            matchedActivityName: targetActivity.name,
            matchedZone: targetActivity.zone,
            previousProgress,
            newProgress,
            confidenceScore: topMatch.overallConfidence,
            subScores: topMatch.subScores,
            status: 'pending_review'
          };

          await apiSaveAuditRecord(pendingAuditRecord);
          const freshAudits = await apiFetchAuditRecords();
          setAuditRecords(freshAudits);

          addToastNotification(
            'pending_review',
            'Low Confidence Match Queued',
            `Match score ${topMatch.overallConfidence}% is below threshold. Added to Review Queue.`
          );
        }
      }
    } catch (err: any) {
      console.error('[SAARTHI] Report processing failure:', err);
      const is401 = err.is401 || err.status === 401;
      const is403 = err.is403 || err.status === 403;
      
      const humanMessage = is401
        ? 'Session expired — please log in again.'
        : (is403
            ? 'Access denied: Permission check failed for this role.'
            : (err.message || 'AI evaluation service unavailable. Try again.'));

      addToastNotification(
        'pending_review',
        is401 ? 'Session Expired' : (is403 ? 'Permission Error' : 'Evaluation Failed'),
        humanMessage
      );

      if (is401) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // TASK 3: Manager Approval Endpoint Handler
  const handleApproveReview = async (recordId: string, options?: { activity_id?: string; new_progress?: number; notes?: string }) => {
    try {
      await apiApproveAuditRecord(recordId, options);
      const freshActs = await apiFetchActivities();
      setActivities(freshActs);

      const freshAudits = await apiFetchAuditRecords();
      setAuditRecords(freshAudits);

      addToastNotification('auto_approved', 'Report Approved', 'Activity progress updated in schedule.');
    } catch (err) {
      console.error('[SAARTHI] Failed to approve review item:', err);
    }
  };

  // TASK 3: Manager Rejection Endpoint Handler
  const handleRejectReview = async (recordId: string, notes?: string) => {
    try {
      await apiRejectAuditRecord(recordId, notes);
      const freshAudits = await apiFetchAuditRecords();
      setAuditRecords(freshAudits);
    } catch (err) {
      console.error('[SAARTHI] Failed to reject review item:', err);
    }
  };

  const handleClearAudit = () => {
    setAuditRecords([]);
  };

  const dismissNotification = () => setLastAutoUpdateNotification(null);
  const clearLatestMatchSummary = () => setLatestMatchSummary(null);

  const pendingAuditRecords = auditRecords.filter(a => a.status === 'pending_review');

  return (
    <ScheduleContext.Provider value={{
      currentPreset,
      activities,
      matchResults,
      isProcessing,
      auditRecords,
      pendingAuditRecords,
      autoApproveMode,
      useGeminiApi,
      apiKey,
      isBackendOnline,
      offlineQueueCount,
      lastAutoUpdateNotification,
      latestMatchSummary,
      notifications,
      handleSelectPreset,
      handleAddActivity,
      handleUpdateActivity,
      handleDeleteActivity,
      handleImportSchedule,
      handleSubmitReport,
      handleApproveReview,
      handleRejectReview,
      handleClearAudit,
      flushOfflineQueue,
      setAutoApproveMode,
      setUseGeminiApi,
      setApiKey,
      dismissNotification,
      dismissToastNotification,
      clearLatestMatchSummary
    }}>
      {children}
    </ScheduleContext.Provider>
  );
};

export const useScheduleContext = () => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useScheduleContext must be used within a ScheduleProvider');
  }
  return context;
};
