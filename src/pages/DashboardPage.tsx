import React from 'react';
import { useScheduleContext } from '../context/ScheduleContext';
import { MatchingEngine } from '../components/MatchingEngine';
import { ReviewQueue } from '../components/ReviewQueue';
import { PlannedVsActual } from '../components/PlannedVsActual';
import { StatCard } from '../components/ui/StatCard';
import { CheckCircle2, Clock, Activity as PulseIcon, Layers, ShieldAlert } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const {
    activities,
    matchResults,
    pendingAuditRecords,
    handleApproveReview,
    handleRejectReview
  } = useScheduleContext();

  const totalActivities = activities.length;
  const completedCount = activities.filter(a => a.status === 'completed' || a.progress >= 100).length;
  const inProgressCount = activities.filter(a => a.status === 'in_progress' && a.progress < 100).length;
  const avgProgress = totalActivities > 0 
    ? Math.round(activities.reduce((acc, a) => acc + a.progress, 0) / totalActivities) 
    : 0;

  return (
    <div className="space-y-6 page-transition">
      
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
          label="AVG PROGRESS"
          value={`${avgProgress}%`}
          icon={PulseIcon}
          variant="cyan"
          subtext="Across all site zones"
        />

        <StatCard
          label="PENDING REVIEWS"
          value={pendingAuditRecords.length}
          icon={ShieldAlert}
          variant={pendingAuditRecords.length > 0 ? "amber" : "emerald"}
          subtext={pendingAuditRecords.length > 0 ? "Requires manager sign-off" : "All matches verified"}
        />
      </div>

      {/* TASK 3: Human-in-the-Loop Review Queue */}
      <ReviewQueue
        pendingAudits={pendingAuditRecords}
        activities={activities}
        onApprove={handleApproveReview}
        onReject={handleRejectReview}
      />

      {/* TASK 4: Planned vs. Actual Progress Dashboard & Slippage Detection */}
      <PlannedVsActual activities={activities} />

      {/* Full Matching Engine Review Panel */}
      <MatchingEngine
        matchResults={matchResults}
        activities={activities}
      />

    </div>
  );
};
