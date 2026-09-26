import React from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';

interface ConfidenceBadgeProps {
  score: number;
  isAutoApproved?: boolean;
  className?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  score,
  isAutoApproved = score >= 75,
  className = ''
}) => {
  if (isAutoApproved || score >= 75) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-mono text-xs font-semibold ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
        <Sparkles className="w-3.5 h-3.5 text-secondary" />
        <span>HIGH CONFIDENCE ({score}%) — AUTO-APPLIED</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono text-xs font-semibold ${className}`}>
      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
      <span>LOW CONFIDENCE ({score}%) — NEEDS REVIEW</span>
    </div>
  );
};
