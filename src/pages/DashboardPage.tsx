import React from 'react';
import { useScheduleContext } from '../context/ScheduleContext';
import { MatchingEngine } from '../components/MatchingEngine';
import { LayoutDashboard, CheckCircle2, Clock, AlertTriangle, Activity as PulseIcon, Layers } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { activities, matchResults } = useScheduleContext();

  const totalActivities = activities.length;
  const completedCount = activities.filter(a => a.status === 'completed' || a.progress >= 100).length;
  const inProgressCount = activities.filter(a => a.status === 'in_progress' && a.progress < 100).length;
  const delayedCount = activities.filter(a => a.status === 'delayed').length;
  const avgProgress = totalActivities > 0 
    ? Math.round(activities.reduce((acc, a) => acc + a.progress, 0) / totalActivities) 
    : 0;

  return (
    <div className="space-y-6">
      
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="blueprint-card p-4 rounded-sm border-cyan-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 mono-font font-bold">TOTAL ACTIVITIES</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-cyan-300 mono-font mt-2">{totalActivities}</p>
        </div>

        <div className="blueprint-card p-4 rounded-sm border-emerald-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 mono-font font-bold">COMPLETED</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-300 mono-font mt-2">{completedCount}</p>
        </div>

        <div className="blueprint-card p-4 rounded-sm border-amber-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 mono-font font-bold">IN PROGRESS</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-300 mono-font mt-2">{inProgressCount}</p>
        </div>

        <div className="blueprint-card p-4 rounded-sm border-cyan-400/40">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 mono-font font-bold">AVG PROJECT PROGRESS</span>
            <PulseIcon className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-cyan-300 mono-font mt-2">{avgProgress}%</p>
        </div>

      </div>

      {/* Full Matching Engine Review Panel */}
      <MatchingEngine
        matchResults={matchResults}
        activities={activities}
      />

    </div>
  );
};
