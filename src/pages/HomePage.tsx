import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ReportIntake } from '../components/ReportIntake';
import { useScheduleContext } from '../context/ScheduleContext';
import { CheckCircle2, ArrowRight, Image, Paperclip, Zap, Bot, FileText } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { 
    handleSubmitReport, 
    isProcessing, 
    latestMatchSummary, 
    clearLatestMatchSummary 
  } = useScheduleContext();

  const [attachedFile, setAttachedFile] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0].name);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Page Heading Banner */}
      <div className="bg-slate-900/80 border border-cyan-500/30 p-4 rounded-sm mono-font flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950 border border-cyan-400 rounded-sm text-cyan-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-cyan-300">FIELD DATA INTAKE</h2>
            <p className="text-xs text-slate-400">
              Hands-free voice dictation ("Hey Saarthi") or text report submission for automatic schedule updates.
            </p>
          </div>
        </div>

        {/* Attachment Stub */}
        <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs mono-font bg-slate-950 border border-cyan-500/40 text-cyan-300 rounded-xs hover:border-cyan-400 cursor-pointer">
          <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
          <span>{attachedFile ? `ATTACHED: ${attachedFile}` : 'ATTACH SITE PHOTO / DOC'}</span>
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
        </label>
      </div>

      {/* Lightweight Inline Match Confirmation Banner */}
      {latestMatchSummary && (
        <div className="bg-emerald-950/90 border-2 border-emerald-400 p-4 rounded-sm mono-font text-xs shadow-[0_0_20px_rgba(16,185,129,0.35)] animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-emerald-300 text-sm flex items-center gap-1">
                    REPORT MATCHED: {latestMatchSummary.activityName} ({latestMatchSummary.zone})
                  </span>
                  <span className="bg-emerald-900 text-emerald-200 border border-emerald-500/50 px-2 py-0.5 rounded-xs text-[10px]">
                    CONFIDENCE: {latestMatchSummary.confidence}%
                  </span>
                </div>
                <p className="text-slate-300 mt-1">
                  Progress set to <strong className="text-emerald-400 text-sm">{latestMatchSummary.newProgress}%</strong>. {latestMatchSummary.isAutoApproved ? 'Schedule updated automatically via zero-touch autonomous execution.' : 'Requires manual review.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-400 text-slate-950 font-bold rounded-xs hover:bg-emerald-300 transition-colors shadow-[0_0_10px_rgba(16,185,129,0.4)]"
              >
                <span>REVIEW IN DASHBOARD</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={clearLatestMatchSummary}
                className="text-slate-400 hover:text-slate-100 text-xs underline cursor-pointer px-2"
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

    </div>
  );
};
