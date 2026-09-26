import React from 'react';
import { Calendar, AlertTriangle, TrendingDown, TrendingUp, CheckCircle2 } from 'lucide-react';
import type { Activity } from '../types';
import { ZoneTag } from './ui/ZoneTag';

interface PlannedVsActualProps {
  activities: Activity[];
}

export function calculatePlannedProgress(plannedStart: string, plannedEnd: string): number {
  if (!plannedStart || !plannedEnd) return 0;
  const start = new Date(plannedStart).getTime();
  const end = new Date(plannedEnd).getTime();
  const now = Date.now();

  if (now < start) return 0;
  if (now >= end) return 100;

  const totalDuration = end - start;
  if (totalDuration <= 0) return 100;

  const elapsed = now - start;
  return Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
}

export const PlannedVsActual: React.FC<PlannedVsActualProps> = ({ activities }) => {
  const activitiesWithCalculated = activities.map(act => {
    const plannedByNow = calculatePlannedProgress(act.plannedStart, act.plannedEnd);
    const gap = act.progress - plannedByNow;
    const isDelayed = gap < -5 || act.status === 'delayed';
    return {
      ...act,
      plannedByNow,
      gap,
      isDelayed
    };
  });

  const delayedCount = activitiesWithCalculated.filter(a => a.isDelayed).length;
  const onTrackCount = activitiesWithCalculated.filter(a => !a.isDelayed).length;

  return (
    <section className="p-5 rounded-xl border border-outline/20 bg-surface-container-lowest shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-outline/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-primary rounded-full"></span>
            <h2 className="text-base font-bold text-on-surface font-mono uppercase">
              3. PLANNED VS. ACTUAL PROGRESS TRACKER & SLIPPAGE ALERTS
            </h2>
          </div>
          <p className="text-xs text-on-surface-variant font-sans mt-0.5">
            Compares real-time actual progress against baseline schedule target dates (planned progress as of today).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {delayedCount > 0 && (
            <span className="px-3 py-1 bg-red-100 border border-red-300 text-red-800 font-mono text-xs font-bold rounded-full flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              {delayedCount} BEHIND SCHEDULE
            </span>
          )}
          <span className="px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-800 font-mono text-xs font-bold rounded-full flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {onTrackCount} ON TRACK
          </span>
        </div>
      </div>

      {/* Activity Gap Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activitiesWithCalculated.map(act => (
          <div
            key={act.id}
            className={`p-4 rounded-xl border transition-all space-y-3 font-mono ${
              act.isDelayed
                ? 'bg-red-50/40 border-red-300/80 shadow-xs ring-1 ring-red-200'
                : 'bg-surface-container-low border-outline/15 hover:border-outline/40'
            }`}
          >
            {/* Top row: Name, Zone, Status Badge */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary text-xs">{act.id}</span>
                  <ZoneTag zone={act.zone} />
                </div>
                <h3 className="font-bold text-on-surface font-sans text-sm mt-0.5">{act.name}</h3>
              </div>

              {act.isDelayed ? (
                <span className="px-2.5 py-1 bg-red-600 text-white font-extrabold text-[10px] rounded-full flex items-center gap-1 shrink-0 shadow-xs">
                  <TrendingDown className="w-3 h-3" /> GAP: {act.gap}%
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-emerald-600 text-white font-extrabold text-[10px] rounded-full flex items-center gap-1 shrink-0 shadow-xs">
                  <TrendingUp className="w-3 h-3" /> ON TARGET ({act.gap >= 0 ? `+${act.gap}%` : `${act.gap}%`})
                </span>
              )}
            </div>

            {/* Date Range */}
            <div className="text-[11px] text-on-surface-variant flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Planned: {act.plannedStart} → {act.plannedEnd}</span>
            </div>

            {/* Comparison Bar: Planned vs Actual */}
            <div className="space-y-1.5 text-xs pt-1">
              
              {/* Planned Target Bar */}
              <div>
                <div className="flex justify-between text-[11px] text-on-surface-variant mb-0.5">
                  <span>Target Progress-by-Now:</span>
                  <span className="font-bold text-slate-800">{act.plannedByNow}%</span>
                </div>
                <div className="w-full bg-surface-container-highest border border-outline/20 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${act.plannedByNow}%` }}
                  ></div>
                </div>
              </div>

              {/* Actual Progress Bar */}
              <div>
                <div className="flex justify-between text-[11px] text-on-surface-variant mb-0.5">
                  <span>Actual Progress Reported:</span>
                  <span className={`font-bold ${act.isDelayed ? 'text-red-700' : 'text-emerald-700'}`}>
                    {act.progress}%
                  </span>
                </div>
                <div className="w-full bg-surface-container-highest border border-outline/20 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${act.isDelayed ? 'bg-red-600' : 'bg-emerald-600'}`}
                    style={{ width: `${act.progress}%` }}
                  ></div>
                </div>
              </div>

            </div>

          </div>
        ))}
      </div>
    </section>
  );
};
