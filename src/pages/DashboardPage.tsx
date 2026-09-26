import React from 'react';
import { useScheduleContext } from '../context/ScheduleContext';
import { MatchingEngine } from '../components/MatchingEngine';
import { StatCard } from '../components/ui/StatCard';
import { CheckCircle2, Clock, Activity as PulseIcon, Layers } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { activities, matchResults } = useScheduleContext();

  const totalActivities = activities.length;
  const completedCount = activities.filter(a => a.status === 'completed' || a.progress >= 100).length;
  const inProgressCount = activities.filter(a => a.status === 'in_progress' && a.progress < 100).length;
  const avgProgress = totalActivities > 0 
    ? Math.round(activities.reduce((acc, a) => acc + a.progress, 0) / totalActivities) 
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="TOTAL ACTIVITIES"
          value={totalActivities}
          icon={Layers}
          variant="primary"
          subtext="Total baseline activities"
        />

        <StatCard
          label="COMPLETED"
          value={completedCount}
          icon={CheckCircle2}
          variant="emerald"
          subtext="100% verified complete"
        />

        <StatCard
          label="IN PROGRESS"
          value={inProgressCount}
          icon={Clock}
          variant="amber"
          subtext="Active in-flight tasks"
        />

        <StatCard
          label="AVG PROJECT PROGRESS"
          value={`${avgProgress}%`}
          icon={PulseIcon}
          variant="cyan"
          subtext="Across all site zones"
        />
      </div>

      {/* Full Matching Engine Review Panel */}
      <MatchingEngine
        matchResults={matchResults}
        activities={activities}
      />

    </div>
  );
};

