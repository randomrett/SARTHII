import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';
import type { Activity, AuditRecord } from '../types';
import { ZoneTag } from './ui/ZoneTag';

interface ReviewQueueProps {
  pendingAudits: AuditRecord[];
  activities: Activity[];
  onApprove: (recordId: string, options?: { activity_id?: string; new_progress?: number; notes?: string }) => void;
  onReject: (recordId: string, notes?: string) => void;
}

export const ReviewQueue: React.FC<ReviewQueueProps> = ({
  pendingAudits,
  activities,
  onApprove,
  onReject
}) => {
  const [reassignMap, setReassignMap] = useState<Record<string, string>>({});
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  if (pendingAudits.length === 0) {
    return (
      <section className="p-6 rounded-xl border border-outline/20 bg-surface-container-lowest shadow-sm text-center">
        <div className="max-w-md mx-auto py-6">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center mx-auto mb-3">
            <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-on-surface font-mono uppercase">HUMAN-IN-THE-LOOP QUEUE EMPTY</h3>
          <p className="text-xs text-on-surface-variant font-sans mt-1">
            All submitted field reports have been verified or auto-approved. Low-confidence matches (&lt;78%) will populate here for manager approval.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="p-5 rounded-xl border border-amber-300/40 bg-surface-container-lowest shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-outline/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
            <h2 className="text-base font-bold text-on-surface font-mono uppercase flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              HUMAN-IN-THE-LOOP REVIEW QUEUE
            </h2>
          </div>
          <p className="text-xs text-on-surface-variant font-sans mt-0.5">
            Review and approve low-confidence matches (&lt;78%) before they update baseline schedule progress.
          </p>
        </div>

        <span className="px-3 py-1 bg-amber-500 text-slate-950 font-mono text-xs font-black rounded-full shadow-xs flex items-center gap-1.5 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" />
          {pendingAudits.length} PENDING APPROVAL{pendingAudits.length > 1 ? 'S' : ''}
        </span>
      </div>

      {/* List of Pending Reviews */}
      <div className="space-y-4">
        {pendingAudits.map((record, index) => {
          const selectedActId = reassignMap[record.id] || record.matchedActivityId;

          const currentNewProgress = progressMap[record.id] ?? record.newProgress;
          const noteText = notesMap[record.id] || '';

          return (
            <div
              key={record.id}
              style={{ animationDelay: `${Math.min(index * 40, 160)}ms` }}
              className="bg-surface-container-low border border-amber-300/50 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm stagger-item"
            >
              {/* Top Banner: Timestamp & Raw Text */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-outline/10 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="font-extrabold text-slate-900 bg-amber-400 px-2 py-0.5 rounded">
                      {record.id}
                    </span>
                    <span className="text-on-surface-variant">• {record.timestamp}</span>
                  </div>
                  <blockquote className="text-sm font-semibold text-on-surface italic font-sans mt-1">
                    "{record.reportText}"
                  </blockquote>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-amber-100 border border-amber-300 text-amber-900 font-mono text-xs font-bold">
                    Score: {record.confidenceScore}% (Low Confidence)
                  </span>
                </div>
              </div>

              {/* Match Comparison & Reassignment Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                
                {/* Proposed Match Details */}
                <div className="bg-surface-container p-3 rounded-lg border border-outline/15 space-y-2">
                  <span className="text-on-surface-variant font-bold block uppercase text-[10px]">
                    TOP AI MATCH PROPOSAL:
                  </span>
                  <div className="font-bold text-on-surface text-sm flex items-center gap-2 flex-wrap font-sans">
                    {record.matchedActivityName}
                    <ZoneTag zone={record.matchedZone} />
                  </div>

                  <div className="flex items-center justify-between pt-1 text-on-surface-variant border-t border-outline/10">
                    <span>Progress Update:</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1">
                      {record.previousProgress}% <ArrowRight className="w-3 h-3 text-emerald-600" /> {record.newProgress}%
                    </span>
                  </div>
                </div>

                {/* Reassignment & Adjustment Control */}
                <div className="bg-surface-container p-3.5 rounded-xl border border-outline/20 space-y-3">
                  <span className="text-on-surface-variant font-bold block uppercase text-[10px] tracking-wider">
                    MANAGER REASSIGNMENT / PROGRESS ADJUSTMENT:
                  </span>
                  
                  {/* Select Activity */}
                  <div className="relative w-full">
                    <select
                      value={selectedActId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setReassignMap(prev => ({ ...prev, [record.id]: newId }));
                        const newAct = activities.find(a => a.id === newId);
                        if (newAct) {
                          setProgressMap(prev => ({ ...prev, [record.id]: newAct.progress }));
                        }
                      }}
                      className="w-full bg-surface-container-lowest border border-outline/30 text-on-surface font-sans text-xs p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary cursor-pointer shadow-xs appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2344474D%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '0.65rem auto',
                        paddingRight: '2rem'
                      }}
                    >
                      {!activities.some(a => a.id === record.matchedActivityId) && record.matchedActivityId && (
                        <option value={record.matchedActivityId} className="bg-surface-container-lowest text-on-surface py-1">
                          {record.matchedActivityId} — {record.matchedActivityName || 'Matched Activity'} — {record.matchedZone || 'Zone'}
                        </option>
                      )}
                      {activities.map(a => (
                        <option key={a.id} value={a.id} className="bg-surface-container-lowest text-on-surface py-1">
                          {a.id} — {a.name} — {a.zone}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Progress Range & Number Input */}
                  <div className="flex items-center justify-between gap-3 pt-1 font-sans">
                    <span className="text-on-surface-variant text-xs font-semibold">Set Progress %:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={currentNewProgress}
                        onChange={(e) => setProgressMap(prev => ({ ...prev, [record.id]: parseInt(e.target.value) || 0 }))}
                        className="w-24 accent-secondary cursor-pointer"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={currentNewProgress}
                        onChange={(e) => setProgressMap(prev => ({ ...prev, [record.id]: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                        className="w-16 bg-surface-container-lowest border border-outline/30 text-on-surface font-mono font-bold text-xs p-1.5 rounded-md text-right focus:outline-none focus:ring-2 focus:ring-secondary"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Reviewer Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-outline/15 font-mono">
                <input
                  type="text"
                  placeholder="Optional review notes (e.g. Verified by Site Engineer)..."
                  value={noteText}
                  onChange={(e) => setNotesMap(prev => ({ ...prev, [record.id]: e.target.value }))}
                  className="flex-1 bg-surface-container-lowest border border-outline/20 text-on-surface px-3 py-2 rounded-lg text-xs font-sans focus:outline-none focus:border-slate-900"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onReject(record.id, noteText)}
                    className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <XCircle className="w-3.5 h-3.5" /> REJECT
                  </button>

                  <button
                    type="button"
                    onClick={() => onApprove(record.id, {
                      activity_id: selectedActId,
                      new_progress: currentNewProgress,
                      notes: noteText
                    })}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{selectedActId !== record.matchedActivityId ? 'REASSIGN & APPROVE' : 'APPROVE MATCH'}</span>
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </section>
  );
};
