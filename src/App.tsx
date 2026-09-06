import React, { useState } from 'react';
import type { Activity, AuditRecord, MatchResult, SchedulePreset } from './types';
import { SCHEDULE_PRESETS } from './utils/presets';
import { matchReportToSchedule } from './utils/matchingAlgorithm';
import { BlueprintHeader, BlueprintFooter } from './components/BlueprintHeaderFooter';
import { ScheduleBuilder } from './components/ScheduleBuilder';
import { ReportIntake } from './components/ReportIntake';
import { MatchingEngine } from './components/MatchingEngine';
import { AuditLog } from './components/AuditLog';
import confetti from 'canvas-confetti';
import { Bot, Zap } from 'lucide-react';

export const App: React.FC = () => {
  // Application State
  const [currentPreset, setCurrentPreset] = useState<SchedulePreset>(SCHEDULE_PRESETS[0]);
  const [activities, setActivities] = useState<Activity[]>(SCHEDULE_PRESETS[0].activities);
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);

  // Zero-Touch Autonomous Mode (Default: true for zero human intervention!)
  const [autoApproveMode, setAutoApproveMode] = useState<boolean>(true);
  const [lastAutoUpdateNotification, setLastAutoUpdateNotification] = useState<{
    activityName: string;
    zone: string;
    oldProgress: number;
    newProgress: number;
    score: number;
  } | null>(null);

  // AI Config State
  const [useGeminiApi, setUseGeminiApi] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');

  // Change Preset
  const handleSelectPreset = (preset: SchedulePreset) => {
    setCurrentPreset(preset);
    setActivities(preset.activities);
    setMatchResults(null);
    setLastAutoUpdateNotification(null);
  };

  // Schedule CRUD Handlers
  const handleAddActivity = (newAct: Activity) => {
    setActivities(prev => [...prev, newAct]);
  };

  const handleUpdateActivity = (updatedAct: Activity) => {
    setActivities(prev => prev.map(a => a.id === updatedAct.id ? updatedAct : a));
  };

  const handleDeleteActivity = (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  // Process Report Submission & Apply Zero-Touch Auto-Approval
  const handleSubmitReport = (reportText: string) => {
    setIsProcessing(true);
    setLastAutoUpdateNotification(null);

    setTimeout(() => {
      const results = matchReportToSchedule(reportText, activities);
      setMatchResults(results);
      setIsProcessing(false);

      if (results && results.length > 0) {
        const topMatch = results[0];

        // FULLY AUTOMATIC APPROVAL MODE (Zero-Touch Autonomous Execution)
        if (autoApproveMode) {
          const targetActivity = topMatch.activity;
          const previousProgress = targetActivity.progress;
          const newProgress = topMatch.extractedProgress;

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

  return (
    <div className="min-h-screen p-3 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Engineering Header */}
      <BlueprintHeader
        currentPresetId={currentPreset.id}
        onSelectPreset={handleSelectPreset}
        activeActivitiesCount={activities.length}
        totalAuditCount={auditRecords.length}
        useGeminiApi={useGeminiApi}
        onToggleGeminiApi={() => setUseGeminiApi(!useGeminiApi)}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        autoApproveMode={autoApproveMode}
        onToggleAutoApproveMode={() => setAutoApproveMode(!autoApproveMode)}
      />

      {/* AUTONOMOUS ZERO-TOUCH AUTO-UPDATE NOTIFICATION BANNER */}
      {lastAutoUpdateNotification && (
        <div className="bg-emerald-950/90 border-2 border-emerald-400 p-4 rounded-sm mono-font text-xs shadow-[0_0_20px_rgba(16,185,129,0.35)] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-900 border border-emerald-400 rounded-full text-emerald-300">
                <Bot className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-emerald-300 text-sm flex items-center gap-1">
                    <Zap className="w-4 h-4 text-emerald-400" /> ZERO-TOUCH AUTONOMOUS SCHEDULE UPDATE APPLIED!
                  </span>
                  <span className="bg-emerald-900 text-emerald-200 border border-emerald-500/50 px-2 py-0.5 rounded-xs text-[10px]">
                    CONFIDENCE: {lastAutoUpdateNotification.score}%
                  </span>
                </div>
                <p className="text-slate-200 mt-1">
                  Report matched to <strong className="text-cyan-300">{lastAutoUpdateNotification.activityName}</strong> ({lastAutoUpdateNotification.zone}). Progress automatically updated from <span className="text-slate-400">{lastAutoUpdateNotification.oldProgress}%</span> → <strong className="text-emerald-400 text-sm">{lastAutoUpdateNotification.newProgress}%</strong> without human intervention.
                </p>
              </div>
            </div>
            <button
              onClick={() => setLastAutoUpdateNotification(null)}
              className="text-slate-400 hover:text-slate-100 text-xs underline cursor-pointer"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      {/* Main Connected Grid Layout */}
      <main className="space-y-6">
        
        {/* Section 1: Schedule Builder */}
        <ScheduleBuilder
          activities={activities}
          onAddActivity={handleAddActivity}
          onUpdateActivity={handleUpdateActivity}
          onDeleteActivity={handleDeleteActivity}
        />

        {/* Section 2: Report Intake */}
        <ReportIntake
          onSubmitReport={handleSubmitReport}
          isProcessing={isProcessing}
        />

        {/* Section 3: Autonomous Matching Engine & Entity Analysis */}
        <MatchingEngine
          matchResults={matchResults}
          activities={activities}
        />

        {/* Section 4: Audit Log */}
        <AuditLog
          auditRecords={auditRecords}
          onClearAudit={handleClearAudit}
        />

      </main>

      {/* Engineering Titleblock Footer */}
      <BlueprintFooter />

    </div>
  );
};

export default App;
