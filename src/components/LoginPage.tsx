import React, { useState } from 'react';
import { Compass, ShieldCheck, User, Lock, Mail, ArrowRight, Sparkles, Key, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const { login, register, loginAsDemoRole, isLoading } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('field_worker');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick Demo Block visibility controlled via env flag VITE_ENABLE_DEMO_LOGINS=true
  const showDemoLogins = import.meta.env.VITE_ENABLE_DEMO_LOGINS === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      if (isRegisterMode) {
        await register(email, password, fullName, selectedRole);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    }
  };

  const handleDemoClick = async (role: UserRole) => {
    setErrorMsg(null);
    try {
      await loginAsDemoRole(role);
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo login failed');
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 md:p-6 page-transition text-on-surface font-sans">
      <div className="max-w-md w-full space-y-6">
        
        {/* Brand Header (Matching NavBar Logo Aesthetic) */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-3 bg-slate-900 text-emerald-400 rounded-2xl flex items-center justify-center shadow-md">
            <Compass className="w-8 h-8 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-on-surface font-mono uppercase">SAARTHI</h1>
            <p className="text-xs font-mono text-on-surface-variant mt-1 uppercase tracking-wider">
              AI Construction Progress Engine // Authentication
            </p>
          </div>
        </div>

        {/* Quick Demo Login Hub (Visible only when VITE_ENABLE_DEMO_LOGINS=true) */}
        {showDemoLogins && (
          <div className="bg-surface-container-low border border-outline/20 p-4 rounded-2xl space-y-3 text-xs font-mono shadow-xs">
            <div className="flex items-center justify-between text-on-surface font-bold border-b border-outline/10 pb-2">
              <span className="flex items-center gap-1.5 uppercase text-secondary font-extrabold">
                <Sparkles className="w-4 h-4 text-secondary animate-pulse" /> QUICK DEMO ROLE LOGIN (1-CLICK)
              </span>
              <span className="text-[10px] text-on-surface-variant font-semibold">SIH26122</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoClick('field_worker')}
                disabled={isLoading}
                className="p-2.5 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-900 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer font-bold shadow-xs active:scale-95 disabled:opacity-50"
              >
                <User className="w-4 h-4 text-emerald-700" />
                <span className="text-[10px]">FIELD WORKER</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick('manager')}
                disabled={isLoading}
                className="p-2.5 bg-sky-100 hover:bg-sky-200 border border-sky-300 text-sky-900 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer font-bold shadow-xs active:scale-95 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-sky-700" />
                <span className="text-[10px]">MANAGER</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick('admin')}
                disabled={isLoading}
                className="p-2.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer font-bold shadow-xs active:scale-95 disabled:opacity-50"
              >
                <Key className="w-4 h-4 text-amber-700" />
                <span className="text-[10px]">ADMIN</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Authentication Card */}
        <div className="bg-surface-container-lowest border border-outline/20 p-6 md:p-8 rounded-2xl shadow-sm space-y-5">
          
          {/* Sign In / Register Tab Selector */}
          <div className="flex items-center justify-between border-b border-outline/15 pb-3 font-mono text-xs">
            <button
              type="button"
              onClick={() => { setIsRegisterMode(false); setErrorMsg(null); }}
              className={`font-extrabold pb-1 cursor-pointer transition-colors ${!isRegisterMode ? 'text-secondary border-b-2 border-secondary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              SIGN IN
            </button>
            <button
              type="button"
              onClick={() => { setIsRegisterMode(true); setErrorMsg(null); }}
              className={`font-extrabold pb-1 cursor-pointer transition-colors ${isRegisterMode ? 'text-secondary border-b-2 border-secondary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              CREATE NEW ACCOUNT
            </button>
          </div>

          {/* Validation / Auth Error Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
            
            {isRegisterMode && (
              <div>
                <label className="block font-mono text-on-surface-variant font-bold uppercase text-[11px] mb-1.5">FULL NAME</label>
                <div className="relative">
                  <User className="w-4 h-4 text-outline absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline/30 text-on-surface pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary focus:bg-surface transition-all font-sans"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-mono text-on-surface-variant font-bold uppercase text-[11px] mb-1.5">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-outline absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="worker@saarthi.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline/30 text-on-surface pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary focus:bg-surface transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-on-surface-variant font-bold uppercase text-[11px] mb-1.5">PASSWORD</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-outline absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline/30 text-on-surface pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary focus:bg-surface transition-all font-sans"
                />
              </div>
            </div>

            {isRegisterMode && (
              <div>
                <label className="block font-mono text-on-surface-variant font-bold uppercase text-[11px] mb-1.5">ASSIGN SYSTEM ROLE</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full bg-surface-container-low border border-outline/30 text-on-surface px-3 py-2.5 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-secondary cursor-pointer"
                >
                  <option value="field_worker">Field Worker (Report Intake & Voice Only)</option>
                  <option value="manager">Manager (Review Queue, Dashboard, Audit Log)</option>
                  <option value="admin">Admin (Full Control, Schedule Builder, User Management)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold font-mono text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50 mt-2"
            >
              <span>{isLoading ? 'AUTHENTICATING...' : (isRegisterMode ? 'REGISTER ACCOUNT' : 'LOG IN')}</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>

          </form>
        </div>

        {/* Blueprint Motif Notice Footer */}
        <p className="text-[11px] font-mono text-on-surface-variant text-center">
          SAARTHI SECURE JWT ACCESS // TEAM HAIL MARY
        </p>

      </div>
    </div>
  );
};
