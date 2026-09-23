import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ScheduleProvider } from './context/ScheduleContext';
import { Navbar } from './components/Navbar';
import { BlueprintFooter } from './components/BlueprintHeaderFooter';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { SchedulePage } from './pages/SchedulePage';
import { AuditPage } from './pages/AuditPage';
import { SettingsPage } from './pages/SettingsPage';

export const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen p-3 md:p-6 max-w-7xl mx-auto space-y-6">
      <Navbar />

      <main className="min-h-[65vh]">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      <BlueprintFooter />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ScheduleProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ScheduleProvider>
  );
};

export default App;
