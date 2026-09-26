import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ReportIntake } from '../components/ReportIntake';
import { MatchingEngine } from '../components/MatchingEngine';
import { useScheduleContext } from '../context/ScheduleContext';
import { ConfidenceBadge } from '../components/ui/ConfidenceBadge';
import { ZoneTag } from '../components/ui/ZoneTag';
import { CheckCircle2, ArrowRight, Paperclip, FileText } from 'lucide-react';

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
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      
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

      {/* Lightweight Inline Match Confirmation Banner */}
      {latestMatchSummary && (
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

