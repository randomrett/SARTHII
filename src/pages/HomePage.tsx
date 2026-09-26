import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ReportIntake } from '../components/ReportIntake';
import { MatchingEngine } from '../components/MatchingEngine';
import { useScheduleContext } from '../context/ScheduleContext';
import { ConfidenceBadge } from '../components/ui/ConfidenceBadge';
import { ZoneTag } from '../components/ui/ZoneTag';
import { CheckCircle2, ArrowRight, Paperclip, FileText, WifiOff, Clock } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { 
    handleSubmitReport, 
    isProcessing, 
    latestMatchSummary, 
    clearLatestMatchSummary,
    matchResults,
    activities
  } = useScheduleContext();

  const [attachedFile, setAttachedFile] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0].name);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto page-transition">
      
      {/* Page Heading Banner */}
      <div className="bg-surface-container-low border border-outline/20 p-4 rounded-xl font-mono flex items-center justify-between flex-wrap gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-lg text-primary">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-on-surface tracking-wider uppercase">FIELD DATA INTAKE HUB</h2>
            <p className="text-xs text-on-surface-variant font-sans">
              Hands-free voice dictation ("Hey Saarthi") or text report submission for automatic schedule updates.
            </p>
          </div>
        </div>

        {/* Attachment Stub */}
        <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-surface-container border border-outline/30 text-on-surface rounded-lg hover:border-primary cursor-pointer transition-colors">
          <Paperclip className="w-3.5 h-3.5 text-primary" />
          <span>{attachedFile ? `ATTACHED: ${attachedFile}` : 'ATTACH SITE PHOTO / DOC'}</span>
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
        </label>
      </div>

      {/* Offline Queued Confirmation Card */}
      {latestMatchSummary && latestMatchSummary.isQueuedOffline && (
        <div className="bg-amber-950/40 border-2 border-amber-500/80 p-4 rounded-xl font-mono text-xs shadow-md animate-in fade-in slide-in-from-top-4 text-amber-200">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-full text-amber-400">
                <WifiOff className="w-6 h-6 shrink-0" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-amber-300 text-sm flex items-center gap-1.5">
                    REPORT QUEUED LOCALLY (OFFLINE)
                  </span>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> PENDING SYNC
                  </span>
                </div>
                <p className="text-amber-200/90 font-sans mt-1">
                  Queued — will sync automatically when back online. Saved locally with idempotency key <code className="text-amber-300 font-mono">{latestMatchSummary.idempotencyKey}</code>.
                </p>
              </div>
            </div>

            <button
              onClick={clearLatestMatchSummary}
              className="text-amber-300/80 hover:text-amber-200 text-xs underline cursor-pointer px-2"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      {/* Lightweight Inline Match Confirmation Banner */}
      {latestMatchSummary && !latestMatchSummary.isQueuedOffline && (
        <div className="bg-secondary-container/90 border-2 border-secondary p-4 rounded-xl font-mono text-xs shadow-md animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-secondary shrink-0" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-on-secondary-container text-sm flex items-center gap-1.5">
                    REPORT MATCHED: {latestMatchSummary.activityName}
                  </span>
                  <ZoneTag zone={latestMatchSummary.zone} />
                  <ConfidenceBadge score={latestMatchSummary.confidence} isAutoApproved={latestMatchSummary.isAutoApproved} />
                </div>
                <p className="text-on-secondary-container/90 font-sans mt-1">
                  Progress set to <strong className="text-secondary font-mono text-sm">{latestMatchSummary.newProgress}%</strong>. {latestMatchSummary.isAutoApproved ? 'Schedule updated automatically via zero-touch autonomous execution.' : 'Requires manual review.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="flex items-center gap-1 px-3 py-1.5 bg-secondary text-on-secondary font-bold rounded-lg hover:opacity-90 transition-opacity shadow-sm"
              >
                <span>REVIEW IN DASHBOARD</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={clearLatestMatchSummary}
                className="text-on-secondary-container/70 hover:text-on-secondary-container text-xs underline cursor-pointer px-2"
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Core Report Intake Component */}
      <ReportIntake
        onSubmitReport={handleSubmitReport}
        isProcessing={isProcessing}
      />

      {/* Full Matching Engine Review Panel */}
      <MatchingEngine
        matchResults={matchResults}
        activities={activities}
      />

    </div>
  );
};
