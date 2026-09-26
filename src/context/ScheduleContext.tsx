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

  // TASK 4 ITEM 4: LIVE WEBSOCKET-DRIVEN REAL-TIME UPDATES
  useEffect(() => {
    if (!isBackendOnline) return;

    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWebSocket = () => {
      try {
        const wsUrl = 'ws://localhost:8000/ws/updates';
        console.log(`[SAARTHI WS CLIENT] Connecting to WebSocket at ${wsUrl}...`);
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log('[SAARTHI WS CLIENT] WebSocket connection established successfully.');
        };

        socket.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('⚡ [SAARTHI WS EVENT RECV]:', data);

            // Auto-refresh activities and audit records when server broadcasts an update
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
          console.warn('[SAARTHI WS CLIENT] WebSocket closed. Reconnecting in 3s...');
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        socket.onerror = (err) => {
          console.warn('[SAARTHI WS CLIENT ERROR]:', err);
          socket?.close();
        };
      } catch (e) {
        console.warn('[SAARTHI WS INIT ERR]:', e);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) socket.close();
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
    setIsProcessing(true);
    setLastAutoUpdateNotification(null);

    const reachable = await checkBackendReachability();
    setIsBackendOnline(reachable);

    // OFFLINE QUEUE PATH
    if (!reachable) {
      const queuedItem = await enqueueReport(reportText);
      const count = await getQueueCount();
      setOfflineQueueCount(count);
      setIsProcessing(false);

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
      return;
    }

    // ONLINE PATH
    try {
      const results = matchReportToSchedule(reportText, activities);
      setMatchResults(results);
      setIsProcessing(false);

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
          // TASK 3: Low confidence or Manual Review mode -> Create pending_review record!
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
    } catch (err) {
      console.warn('[SAARTHI] Report processing error:', err);
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
