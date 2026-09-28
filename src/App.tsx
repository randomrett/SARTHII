import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ScheduleProvider } from './context/ScheduleContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { BlueprintFooter } from './components/BlueprintHeaderFooter';
import { LoginPage } from './components/LoginPage';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { SchedulePage } from './pages/SchedulePage';
import { AuditPage } from './pages/AuditPage';
import { SettingsPage } from './pages/SettingsPage';
import { ShieldAlert } from 'lucide-react';

const ProtectedRoute: React.FC<{ allowedRoles: string[]; children: React.ReactNode }> = ({ allowedRoles, children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/" replace />;
  if (!allowedRoles.includes(currentUser.role)) {
    return (
      <div className="p-8 bg-surface-container-lowest border border-rose-300 rounded-2xl text-center space-y-3 font-mono shadow-sm max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-on-surface uppercase">ACCESS RESTRICTED BY ROLE</h3>
        <p className="text-xs text-on-surface-variant font-sans">
          Your current role (<strong className="text-rose-700 uppercase">{currentUser.role}</strong>) does not have authorization to view this area.
        </p>
      </div>
    );
  }
  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen p-3 md:p-6 max-w-7xl mx-auto space-y-6">
      <Navbar />

      <main className="min-h-[65vh]">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['manager', 'admin']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SchedulePage />
              </ProtectedRoute>
            }
          />
          <Route path="/audit" element={<AuditPage />} />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <BlueprintFooter />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ScheduleProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ScheduleProvider>
    </AuthProvider>
  );
};

export default App;

