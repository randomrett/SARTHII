import React from 'react';
import type { LucideIcon } from 'lucide-react';


interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: string;
  variant?: 'cyan' | 'emerald' | 'amber' | 'primary';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  subtext,
  variant = 'cyan',
  className = ''
}) => {
  const variantStyles = {
    cyan: 'border-cyan-300/40 bg-surface-container-lowest text-on-surface',
    emerald: 'border-emerald-300/40 bg-surface-container-lowest text-on-surface',
    amber: 'border-amber-300/40 bg-surface-container-lowest text-on-surface',
    primary: 'border-slate-300/40 bg-surface-container-lowest text-on-surface'
  };

  const iconStyles = {
    cyan: 'bg-cyan-100 text-cyan-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    primary: 'bg-slate-100 text-slate-800'
  };

  return (
    <div className={`p-4 rounded-xl border shadow-sm ${variantStyles[variant]} ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-lg ${iconStyles[variant]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-black font-mono mt-2 text-on-surface">{value}</p>
      {subtext && <p className="text-xs text-on-surface-variant mt-1">{subtext}</p>}
    </div>
  );
};
