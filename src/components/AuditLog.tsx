import React, { useState } from 'react';
import { History, ShieldCheck, CheckCircle2, Sliders, XCircle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import type { AuditRecord, ApprovalStatus } from '../types';

interface AuditLogProps {
  auditRecords: AuditRecord[];
  onClearAudit: () => void;
}

export const AuditLog: React.FC<AuditLogProps> = ({
  auditRecords,
  onClearAudit
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'auto_approved':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/50 px-2 py-0.5 rounded-xs mono-font">
            <CheckCircle2 className="w-3 h-3" /> AUTO-APPROVED
          </span>
        );
      case 'manually_approved':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-500/50 px-2 py-0.5 rounded-xs mono-font">
            <ShieldCheck className="w-3 h-3" /> MANUALLY APPROVED
          </span>
        );
      case 'corrected':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/80 border border-amber-500/50 px-2 py-0.5 rounded-xs mono-font">
            <Sliders className="w-3.5 h-3.5" /> OVERRIDDEN
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-crimson-400 bg-crimson-950/80 border border-crimson-500/50 px-2 py-0.5 rounded-xs mono-font">
            <XCircle className="w-3.5 h-3.5" /> DISCARDED
          </span>
        );
    }
  };

  return (
    <section className="blueprint-card p-5 rounded-sm">
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-200 mono-font flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            4. AUDIT TRAIL & LOG HISTORY
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of all site supervisor reports submitted, evaluated, approved, or manually overridden.
          </p>
        </div>

        {auditRecords.length > 0 && (
          <button
            onClick={onClearAudit}
            className="flex items-center gap-1 text-xs mono-font text-slate-400 hover:text-crimson-400 border border-slate-700 hover:border-crimson-500/40 px-2.5 py-1 rounded-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear History
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs mono-font">
          <thead>
            <tr className="border-b border-cyan-500/30 text-cyan-400 bg-slate-950/80">
              <th className="py-2.5 px-3">TIMESTAMP</th>
              <th className="py-2.5 px-3">SUBMITTED FIELD REPORT</th>
              <th className="py-2.5 px-3">MATCHED ACTIVITY</th>
              <th className="py-2.5 px-3">PROGRESS DELTA</th>
              <th className="py-2.5 px-3">CONFIDENCE</th>
              <th className="py-2.5 px-3">STATUS</th>
              <th className="py-2.5 px-3 text-right">DETAILS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cyan-500/10">
            {auditRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500 italic">
                  No site report audits logged yet. Submit a report in step 2 above.
                </td>
              </tr>
            ) : (
              auditRecords.map(rec => {
                const isExpanded = expandedId === rec.id;
                return (
                  <React.Fragment key={rec.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                      className="hover:bg-cyan-950/20 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">{rec.timestamp}</td>
                      <td className="py-3 px-3 max-w-xs truncate text-slate-200" title={rec.reportText}>
                        "{rec.reportText}"
                      </td>
                      <td className="py-3 px-3 font-semibold text-cyan-300">
                        {rec.matchedActivityName} <span className="text-amber-400 font-normal text-[10px]">({rec.matchedZone})</span>
                      </td>
                      <td className="py-3 px-3 font-bold">
                        <span className="text-slate-400">{rec.previousProgress}%</span> → <span className="text-emerald-400">{rec.newProgress}%</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`font-bold ${rec.confidenceScore >= 78 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {rec.confidenceScore}%
                        </span>
                      </td>
                      <td className="py-3 px-3">{getStatusBadge(rec.status)}</td>
                      <td className="py-3 px-3 text-right text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4 inline" /> : <ChevronDown className="w-4 h-4 inline" />}
                      </td>
                    </tr>

                    {/* Expandable Details Sub-Row */}
                    {isExpanded && (
                      <tr className="bg-slate-950/90 border-b border-cyan-500/20">
                        <td colSpan={7} className="p-4 space-y-3">
                          <div className="bg-slate-900/90 p-3 border border-cyan-500/30 rounded-xs space-y-2 text-xs">
                            <span className="text-[10px] text-cyan-400 font-bold uppercase block">FULL UNTRUNCATED SITE REPORT:</span>
                            <p className="text-slate-100 italic">"{rec.reportText}"</p>
                          </div>

                          {/* Sub score breakdown pill grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                            <div className="bg-slate-900 p-2 border border-slate-800 rounded-xs">
                              <span className="text-slate-400 block text-[10px]">SEMANTIC MATCH</span>
                              <span className="text-cyan-300 font-bold">{rec.subScores.semanticMatch}%</span>
                            </div>
                            <div className="bg-slate-900 p-2 border border-slate-800 rounded-xs">
                              <span className="text-slate-400 block text-[10px]">LOCATION MATCH</span>
                              <span className="text-amber-300 font-bold">{rec.subScores.locationMatch}%</span>
                            </div>
                            <div className="bg-slate-900 p-2 border border-slate-800 rounded-xs">
                              <span className="text-slate-400 block text-[10px]">DATE PLAUSIBILITY</span>
                              <span className="text-emerald-300 font-bold">{rec.subScores.datePlausibility}%</span>
                            </div>
                            <div className="bg-slate-900 p-2 border border-slate-800 rounded-xs">
                              <span className="text-slate-400 block text-[10px]">AUDIT ID</span>
                              <span className="text-slate-300 font-bold">{rec.id}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
