import React, { useState } from 'react';
import { History, ShieldCheck, CheckCircle2, Sliders, XCircle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import type { AuditRecord, ApprovalStatus } from '../types';
import { ZoneTag } from './ui/ZoneTag';
import { ConfidenceBadge } from './ui/ConfidenceBadge';

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
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-secondary bg-secondary-container px-2.5 py-0.5 rounded-full font-mono">
            <CheckCircle2 className="w-3 h-3" /> AUTO-APPROVED
          </span>
        );
      case 'manually_approved':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary-container px-2.5 py-0.5 rounded-full font-mono">
            <ShieldCheck className="w-3 h-3" /> MANUALLY APPROVED
          </span>
        );
      case 'corrected':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full font-mono">
            <Sliders className="w-3.5 h-3.5" /> OVERRIDDEN
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full font-mono">
            <XCircle className="w-3.5 h-3.5" /> DISCARDED
          </span>
        );
    }
  };

  return (
    <section className="p-5 rounded-xl border border-outline/20 bg-surface-container-lowest shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-outline/10 pb-4">
        <div>
          <h2 className="text-base font-bold text-on-surface font-mono flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            4. AUDIT TRAIL & LOG HISTORY
          </h2>
          <p className="text-xs text-on-surface-variant font-sans mt-0.5">
            Immutable log of all site supervisor reports submitted, evaluated, approved, or manually overridden.
          </p>
        </div>

        {auditRecords.length > 0 && (
          <button
            onClick={onClearAudit}
            className="flex items-center gap-1.5 text-xs font-mono text-on-surface-variant hover:text-rose-600 border border-outline/30 hover:border-rose-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear History
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-outline/15">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-outline/15 text-on-surface-variant bg-surface-container-low font-bold">
              <th className="py-3 px-3">TIMESTAMP</th>
              <th className="py-3 px-3">SUBMITTED FIELD REPORT</th>
              <th className="py-3 px-3">MATCHED ACTIVITY</th>
              <th className="py-3 px-3">PROGRESS DELTA</th>
              <th className="py-3 px-3">CONFIDENCE</th>
              <th className="py-3 px-3">STATUS</th>
              <th className="py-3 px-3 text-right">DETAILS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline/10 font-sans">
            {auditRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-on-surface-variant italic">
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
                      className="hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3 text-on-surface-variant font-mono text-[11px] whitespace-nowrap">{rec.timestamp}</td>
                      <td className="py-3 px-3 max-w-xs truncate text-on-surface font-sans" title={rec.reportText}>
                        "{rec.reportText}"
                      </td>
                      <td className="py-3 px-3 font-semibold text-primary font-sans">
                        <div className="flex items-center gap-1.5">
                          <span>{rec.matchedActivityName}</span>
                          <ZoneTag zone={rec.matchedZone} />
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold font-mono">
                        <span className="text-on-surface-variant">{rec.previousProgress}%</span> → <span className="text-secondary font-extrabold">{rec.newProgress}%</span>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <ConfidenceBadge score={rec.confidenceScore} isAutoApproved={rec.confidenceScore >= 75} />
                      </td>
                      <td className="py-3 px-3">{getStatusBadge(rec.status)}</td>
                      <td className="py-3 px-3 text-right text-on-surface-variant font-mono">
                        {isExpanded ? <ChevronUp className="w-4 h-4 inline" /> : <ChevronDown className="w-4 h-4 inline" />}
                      </td>
                    </tr>

                    {/* Expandable Details Sub-Row */}
                    {isExpanded && (
                      <tr className="bg-surface-container-low border-b border-outline/15">
                        <td colSpan={7} className="p-4 space-y-3 font-mono">
                          <div className="bg-surface-container-lowest p-3 border border-outline/15 rounded-xl space-y-2 text-xs">
                            <span className="text-[10px] text-primary font-bold uppercase block">FULL UNTRUNCATED SITE REPORT:</span>
                            <p className="text-on-surface font-sans italic">"{rec.reportText}"</p>
                          </div>

                          {/* Sub score breakdown pill grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                            <div className="bg-surface p-2.5 border border-outline/15 rounded-lg">
                              <span className="text-on-surface-variant block text-[10px]">SEMANTIC MATCH</span>
                              <span className="text-primary font-bold">{rec.subScores.semanticMatch}%</span>
                            </div>
                            <div className="bg-surface p-2.5 border border-outline/15 rounded-lg">
                              <span className="text-on-surface-variant block text-[10px]">LOCATION MATCH</span>
                              <span className="text-amber-700 font-bold">{rec.subScores.locationMatch}%</span>
                            </div>
                            <div className="bg-surface p-2.5 border border-outline/15 rounded-lg">
                              <span className="text-on-surface-variant block text-[10px]">DATE PLAUSIBILITY</span>
                              <span className="text-secondary font-bold">{rec.subScores.datePlausibility}%</span>
                            </div>
                            <div className="bg-surface p-2.5 border border-outline/15 rounded-lg">
                              <span className="text-on-surface-variant block text-[10px]">AUDIT ID</span>
                              <span className="text-on-surface font-bold">{rec.id}</span>
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

