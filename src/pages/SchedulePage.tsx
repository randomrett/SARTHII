import React from 'react';
import { useScheduleContext } from '../context/ScheduleContext';
import { ScheduleBuilder } from '../components/ScheduleBuilder';

export const SchedulePage: React.FC = () => {
  const { 
    activities, 
    handleAddActivity, 
    handleUpdateActivity, 
    handleDeleteActivity 
  } = useScheduleContext();

  return (
    <div className="space-y-6">
      <ScheduleBuilder
        activities={activities}
        onAddActivity={handleAddActivity}
        onUpdateActivity={handleUpdateActivity}
        onDeleteActivity={handleDeleteActivity}
      />
    </div>
  );
};
