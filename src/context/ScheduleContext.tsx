import React, { createContext, useContext, useState } from 'react';
import type { Activity, AuditRecord, MatchResult, SchedulePreset } from '../types';
import { SCHEDULE_PRESETS } from '../utils/presets';
import { matchReportToSchedule } from '../utils/matchingAlgorithm';
import confetti from 'canvas-confetti';

interface LatestMatchSummary {
  activityName: string;
  zone: string;
  confidence: number;
  isAutoApproved: boolean;
  newProgress: number;
  reportText: string;
}

interface ScheduleContextType {
  currentPreset: SchedulePreset;
  activities: Activity[];
  matchResults: MatchResult[] | null;
  isProcessing: boolean;
  auditRecords: AuditRecord[];
  autoApproveMode: boolean;
  useGeminiApi: boolean;
  apiKey: string;
  lastAutoUpdateNotification: {
    activityName: string;
    zone: string;
    oldProgress: number;
    newProgress: number;
    score: number;
  } | null;
  latestMatchSummary: LatestMatchSummary | null;
  handleSelectPreset: (preset: SchedulePreset) => void;
  handleAddActivity: (newAct: Activity) => void;
  handleUpdateActivity: (updatedAct: Activity) => void;
  handleDeleteActivity: (id: string) => void;
  handleSubmitReport: (reportText: string) => void;
  handleClearAudit: () => void;
  setAutoApproveMode: React.Dispatch<React.SetStateAction<boolean>>;
  setUseGeminiApi: React.Dispatch<React.SetStateAction<boolean>>;
  setApiKey: React.Dispatch<React.SetStateAction<string>>;
  dismissNotification: () => void;
  clearLatestMatchSummary: () => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPreset, setCurrentPreset] = useState<SchedulePreset>(SCHEDULE_PRESETS[0]);
  const [activities, setActivities] = useState<Activity[]>(SCHEDULE_PRESETS[0].activities);
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);

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

  // AI Config State
  const [useGeminiApi, setUseGeminiApi] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');

  const handleSelectPreset = (preset: SchedulePreset) => {
    setCurrentPreset(preset);
    setActivities(preset.activities);
    setMatchResults(null);
    setLastAutoUpdateNotification(null);
    setLatestMatchSummary(null);
  };

  const handleAddActivity = (newAct: Activity) => {
    setActivities(prev => [...prev, newAct]);
  };

  const handleUpdateActivity = (updatedAct: Activity) => {
    setActivities(prev => prev.map(a => a.id === updatedAct.id ? updatedAct : a));
  };

  const handleDeleteActivity = (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmitReport = (reportText: string) => {
    setIsProcessing(true);
    setLastAutoUpdateNotification(null);

    setTimeout(() => {
      const results = matchReportToSchedule(reportText, activities);
      setMatchResults(results);
      setIsProcessing(false);

      if (results && results.length > 0) {
        const topMatch = results[0];
        const targetActivity = topMatch.activity;
        const previousProgress = targetActivity.progress;
        const newProgress = topMatch.extractedProgress;
        const isAutoApproved = autoApproveMode && topMatch.overallConfidence >= 50;

        setLatestMatchSummary({
          activityName: targetActivity.name,
          zone: targetActivity.zone,
          confidence: topMatch.overallConfidence,
          isAutoApproved,
          newProgress,
          reportText
        });

        // FULLY AUTOMATIC APPROVAL MODE (Zero-Touch Autonomous Execution)
        if (autoApproveMode) {
          let newStatus = targetActivity.status;
          if (newProgress >= 100) newStatus = 'completed';
          else if (newProgress > 0 && newStatus === 'not_started') newStatus = 'in_progress';

          // 1. Instantly Update Baseline Schedule
          setActivities(prev => prev.map(a => a.id === targetActivity.id ? {
            ...a,
            progress: newProgress,
            status: newStatus
          } : a));

          // 2. Log Audit Trail Entry automatically
          const autoAuditRecord: AuditRecord = {
            id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            reportText,
            matchedActivityId: targetActivity.id,
            matchedActivityName: targetActivity.name,
            matchedZone: targetActivity.zone,
            previousProgress,
            newProgress,
            confidenceScore: topMatch.overallConfidence,
            subScores: topMatch.subScores,
            status: topMatch.overallConfidence >= 78 ? 'auto_approved' : 'corrected'
          };
          setAuditRecords(prev => [autoAuditRecord, ...prev]);

          // 3. Set Autonomous Notification Banner
          setLastAutoUpdateNotification({
            activityName: targetActivity.name,
            zone: targetActivity.zone,
            oldProgress: previousProgress,
            newProgress,
            score: topMatch.overallConfidence
          });

          // 4. Trigger Confetti
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.7 },
            colors: ['#00F0FF', '#10B981', '#FF9F1C']
          });
        }
      }
    }, 450);
  };

  const handleClearAudit = () => {
    setAuditRecords([]);
  };

  const dismissNotification = () => setLastAutoUpdateNotification(null);
  const clearLatestMatchSummary = () => setLatestMatchSummary(null);

  return (
    <ScheduleContext.Provider value={{
      currentPreset,
      activities,
      matchResults,
      isProcessing,
      auditRecords,
      autoApproveMode,
      useGeminiApi,
      apiKey,
      lastAutoUpdateNotification,
      latestMatchSummary,
      handleSelectPreset,
      handleAddActivity,
      handleUpdateActivity,
      handleDeleteActivity,
      handleSubmitReport,
      handleClearAudit,
      setAutoApproveMode,
      setUseGeminiApi,
      setApiKey,
      dismissNotification,
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
