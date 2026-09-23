import React from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, Home, LayoutDashboard, Calendar, FileText, Settings as SettingsIcon, Bot, Zap } from 'lucide-react';
import { useScheduleContext } from '../context/ScheduleContext';

export const Navbar: React.FC = () => {
  const { autoApproveMode, activities, auditRecords } = useScheduleContext();

  const navItems = [
    { path: '/', label: 'HOME (INTAKE)', icon: Home },
    { path: '/dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
    { path: '/schedule', label: 'SCHEDULE', icon: Calendar },
    { path: '/audit', label: 'AUDIT LOG', icon: FileText, badge: auditRecords.length },
    { path: '/settings', label: 'SETTINGS', icon: SettingsIcon },
  ];

  return (
    <nav className="blueprint-titleblock mb-6 p-4 rounded-sm border-cyan-400/40">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950/80 border border-cyan-400/50 rounded-sm text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]">
            <Compass className="w-7 h-7 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-wider text-cyan-400 mono-font">
                SAARTHI <span className="text-amber-400 text-xs font-semibold tracking-normal px-2 py-0.5 border border-amber-400/50 bg-amber-950/40 rounded-xs">AUTONOMOUS ENGINE</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 mono-font mt-0.5 flex items-center gap-2">
              <span>DWG: SIH26122</span>
              <span className="text-cyan-600">|</span>
              <span>HAIL MARY</span>
              <span className="text-cyan-600">|</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                {autoApproveMode ? 'ZERO-TOUCH AUTONOMOUS' : 'MANUAL REVIEW'}
              </span>
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 text-xs font-extrabold mono-font border rounded-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                      : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full ml-1">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

      </div>
    </nav>
  );
};
