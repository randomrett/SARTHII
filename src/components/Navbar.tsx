import React from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, Home, LayoutDashboard, Calendar, FileText, Settings as SettingsIcon } from 'lucide-react';
import { useScheduleContext } from '../context/ScheduleContext';


export const Navbar: React.FC = () => {
  const { autoApproveMode, auditRecords } = useScheduleContext();

  const navItems = [
    { path: '/', label: 'Home (Report Intake)', icon: Home },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/schedule', label: 'Schedule', icon: Calendar },
    { path: '/audit', label: 'Audit Trail', icon: FileText, badge: auditRecords.length },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-50 bg-surface-container-lowest/95 backdrop-blur-md border-b border-surface-container-high shadow-xs">
      <div className="max-w-7xl mx-auto h-16 px-4 md:px-6 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 bg-primary-container text-secondary-fixed rounded-lg flex items-center justify-center shadow-xs">
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

        {/* Navigation Items */}
        <nav className="flex items-center gap-1 md:gap-2 h-16 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `relative flex items-center gap-2 h-full px-3 text-xs md:text-sm font-semibold transition-colors shrink-0 ${
                    isActive
                      ? 'text-on-surface font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-secondary' : 'text-on-surface-variant'}`} />
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.2 bg-secondary-container text-on-secondary-container text-[10px] font-mono font-bold rounded-full">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-secondary rounded-full" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

      </div>
    </header>
  );
};
