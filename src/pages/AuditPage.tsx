import React from 'react';
import { useScheduleContext } from '../context/ScheduleContext';
import { AuditLog } from '../components/AuditLog';

export const AuditPage: React.FC = () => {
  const { auditRecords, handleClearAudit } = useScheduleContext();

  return (
    <div className="space-y-6">
      <AuditLog
        auditRecords={auditRecords}
        onClearAudit={handleClearAudit}
      />
    </div>
  );
};
