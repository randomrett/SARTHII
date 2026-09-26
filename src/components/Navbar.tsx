import React from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, Home, LayoutDashboard, Calendar, FileText, Settings as SettingsIcon, WifiOff, RefreshCw, CheckCircle, X, AlertTriangle } from 'lucide-react';
import { useScheduleContext } from '../context/ScheduleContext';

export const Navbar: React.FC = () => {
  const {
    autoApproveMode,
    auditRecords,
    pendingAuditRecords,
    offlineQueueCount,
    isBackendOnline,
    flushOfflineQueue,
    notifications,
    dismissToastNotification
  } = useScheduleContext();

  const navItems = [
    { path: '/', label: 'Home (Report Intake)', icon: Home },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: pendingAuditRecords.length > 0 ? pendingAuditRecords.length : undefined },
    { path: '/schedule', label: 'Schedule', icon: Calendar },
    { path: '/audit', label: 'Audit Trail', icon: FileText, badge: auditRecords.length },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-50 bg-surface-container-lowest/95 backdrop-blur-md border-b border-surface-container-high shadow-xs">
      <div className="max-w-7xl mx-auto h-16 px-4 md:px-6 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 bg-slate-900 text-emerald-400 rounded-lg flex items-center justify-center shadow-xs">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-on-surface tracking-tight uppercase">SAARTHI</span>
              <span className="font-mono text-[11px] font-semibold bg-surface-container text-on-surface px-2 py-0.5 rounded">
                [METRO LINE 4 — PHASE 2B]
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-on-surface-variant">
              <span>SIH26122</span>
              <span>•</span>
              <span className="text-secondary font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                {autoApproveMode ? 'ZERO-TOUCH AUTONOMOUS' : 'MANUAL REVIEW'}
              </span>
            </div>
          </div>
        </div>

        {/* Offline Queue Badge & Status Indicator */}
        <div className="flex items-center gap-2">
          {offlineQueueCount > 0 ? (
            <button
              onClick={() => flushOfflineQueue()}
              title="Click to force sync offline reports with backend"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-800 border border-amber-500/40 rounded-full text-xs font-mono font-bold animate-pulse hover:bg-amber-500/30 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
              <span>{offlineQueueCount} report{offlineQueueCount > 1 ? 's' : ''} pending sync</span>
            </button>
          ) : !isBackendOnline ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-800 border border-red-300 rounded-full text-xs font-mono">
              <WifiOff className="w-3.5 h-3.5 text-red-600" />
              <span>OFFLINE</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300 font-bold">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>ONLINE & SYNCED</span>
            </div>
          )}

          {/* TASK 1: Navigation Items with Hover Animations & Scoped Active Indicator */}
          <nav className="flex items-center gap-1 md:gap-2 h-16 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2 h-10 px-3 my-auto text-xs md:text-sm font-semibold rounded-lg transition-all duration-150 ease-in-out shrink-0 ${
                      isActive
                        ? 'bg-secondary/10 text-secondary font-bold'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-4 h-4 transition-colors duration-150 ${isActive ? 'text-secondary' : 'text-on-surface-variant group-hover:text-secondary'}`} />
                      <span>{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[10px] font-mono font-extrabold rounded-full animate-pulse">
                          {item.badge}
                        </span>
                      )}

                      {/* Scoped Underline Indicator with Smooth Center-Expand Hover Animation (<150ms) */}
                      <span
                        className={`absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all duration-150 ease-out origin-center ${
                          isActive
                            ? 'bg-secondary scale-x-100 opacity-100'
                            : 'bg-secondary/50 scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100'
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

      </div>

      {/* LIVE IN-APP NOTIFICATION TOAST POPUPS */}
      {notifications.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
          {notifications.slice(0, 3).map(notif => (
            <div
              key={notif.id}
              className="pointer-events-auto bg-slate-900 text-white p-3.5 rounded-xl border border-emerald-400/40 shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom duration-200"
            >
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 text-xs font-mono">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-extrabold text-emerald-400 uppercase">{notif.title}</span>
                  <span className="text-[10px] text-slate-400">{notif.timestamp}</span>
                </div>
                <p className="text-slate-200 text-xs font-sans mt-0.5 leading-snug">{notif.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismissToastNotification(notif.id)}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

    </header>
  );
};
