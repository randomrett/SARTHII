import React from 'react';
import { useScheduleContext } from '../context/ScheduleContext';
import { useAuth } from '../context/AuthContext';
import { SCHEDULE_PRESETS } from '../utils/presets';
import { Settings as SettingsIcon, Bot, Cpu, Layers, Users, RefreshCw } from 'lucide-react';
import type { UserRole } from '../types';

export const SettingsPage: React.FC = () => {
  const {
    currentPreset,
    handleSelectPreset,
    autoApproveMode,
    setAutoApproveMode,
    useGeminiApi,
    setUseGeminiApi
  } = useScheduleContext();

  const { allUsers, updateUserRole, refreshUsers } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl mx-auto page-transition">
      
      {/* Header */}
      <div className="p-5 rounded-xl border border-outline/20 bg-surface-container-lowest shadow-sm">
        <h2 className="text-base font-bold text-on-surface font-mono flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-primary" />
          SYSTEM CONFIGURATION & CONTROL PANEL
        </h2>
        <p className="text-xs text-on-surface-variant font-sans mt-1">
          Manage autonomous execution settings, preset schedule baselines, AI engine parameters, and system user roles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Zero-Touch Autonomous Mode */}
        <div className="p-5 rounded-xl border border-outline/20 bg-surface-container-lowest shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-outline/10 pb-3">
            <h3 className="font-bold text-on-surface text-xs font-mono uppercase flex items-center gap-2">
              <Bot className="w-4 h-4 text-secondary" />
              1. AUTONOMOUS EXECUTION MODE
            </h3>
            <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full border ${
              autoApproveMode 
                ? 'text-on-secondary-container bg-secondary-container border-secondary/30' 
                : 'text-on-surface-variant bg-surface-container border-outline/20'
            }`}>
              {autoApproveMode ? 'AUTONOMOUS ACTIVE' : 'MANUAL REVIEW'}
            </span>
          </div>

          <p className="text-xs text-on-surface-variant font-sans">
            When enabled, site reports automatically update planned schedule activities and log audit trail entries without human intervention whenever match confidence exceeds threshold.
          </p>

          <button
            onClick={() => setAutoApproveMode(!autoApproveMode)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold font-mono rounded-lg transition-all cursor-pointer ${
              autoApproveMode
                ? 'bg-secondary-container text-on-secondary-container border border-secondary/40 shadow-xs'
                : 'bg-surface-container text-on-surface border border-outline/20 hover:bg-surface-container-high'
            }`}
          >
            <Bot className={`w-4 h-4 ${autoApproveMode ? 'text-secondary animate-bounce' : 'text-on-surface-variant'}`} />
            <span>{autoApproveMode ? '⚡ DISABLE ZERO-TOUCH (SWITCH TO MANUAL)' : '⚡ ENABLE ZERO-TOUCH AUTO-APPROVE'}</span>
          </button>
        </div>

        {/* Card 2: Preset Schedule Loader */}
        <div className="p-5 rounded-xl border border-outline/20 bg-surface-container-lowest shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-outline/10 pb-3">
            <h3 className="font-bold text-on-surface text-xs font-mono uppercase flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              2. BASELINE SCHEDULE PRESETS
            </h3>
          </div>

          <p className="text-xs text-on-surface-variant font-sans">
            Select a pre-configured baseline schedule preset (Metro, Highway, High-Rise Tower).
          </p>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-on-surface-variant font-mono block">Active Preset:</label>
            <select
              value={currentPreset.id}
              onChange={(e) => {
                const found = SCHEDULE_PRESETS.find(p => p.id === e.target.value);
                if (found) handleSelectPreset(found);
              }}
              className="w-full bg-surface-container-low text-on-surface text-xs font-mono border border-outline/30 rounded-lg p-2.5 focus:outline-none focus:border-primary cursor-pointer"
            >
              {SCHEDULE_PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.title} — ({p.activities.length} Activities)</option>
              ))}
            </select>
          </div>
        </div>

        {/* Card 3: Dual AI Engine Configuration */}
        <div className="p-5 rounded-xl border border-outline/20 bg-surface-container-lowest shadow-sm space-y-4 md:col-span-2">
          <div className="flex items-center justify-between border-b border-outline/10 pb-3">
            <h3 className="font-bold text-on-surface text-xs font-mono uppercase flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-600" />
              3. AI INFERENCE ENGINE CONFIGURATION
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-container-low p-4 border border-outline/15 rounded-xl">
            <div>
              <p className="text-xs font-bold text-on-surface font-mono">Client-Side Heuristic vs. Live Gemini API</p>
              <p className="text-xs text-on-surface-variant font-sans mt-0.5">
                Saarthi automatically runs pure client-side NLP fuzzy matching offline. Optionally connect live Gemini API.
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-surface-container border border-amber-300 px-3 py-1.5 rounded-lg text-xs font-mono text-amber-900 shrink-0">
              <input
                type="checkbox"
                checked={useGeminiApi}
                onChange={() => setUseGeminiApi(!useGeminiApi)}
                className="accent-amber-600 cursor-pointer"
              />
              <span>Use Live Gemini API</span>
            </label>
          </div>

          <p className="text-[11px] font-mono text-on-surface-variant italic">
            Note: GEMINI_API_KEY is configured securely on the Render backend host environment.
          </p>
        </div>

        {/* Card 4: Admin User & Role Management Table */}
        <div className="p-5 rounded-xl border border-outline/20 bg-surface-container-lowest shadow-sm space-y-4 md:col-span-2">
          <div className="flex items-center justify-between border-b border-outline/10 pb-3">
            <h3 className="font-bold text-on-surface text-xs font-mono uppercase flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-600" />
              4. SYSTEM USER ROLE ASSIGNMENT (ADMIN CONTROL)
            </h3>
            <button
              onClick={refreshUsers}
              className="flex items-center gap-1 text-[11px] font-mono text-primary hover:underline cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh List
            </button>
          </div>

          <p className="text-xs text-on-surface-variant font-sans">
            Assign system roles (<code className="text-emerald-700 font-mono font-bold">field_worker</code>, <code className="text-sky-700 font-mono font-bold">manager</code>, <code className="text-amber-700 font-mono font-bold">admin</code>) to users. Changes update access privileges instantly.
          </p>

          <div className="overflow-x-auto rounded-xl border border-outline/15">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-outline/15 text-on-surface-variant bg-surface-container-low font-bold">
                  <th className="py-2.5 px-3">USER ID</th>
                  <th className="py-2.5 px-3">FULL NAME</th>
                  <th className="py-2.5 px-3">EMAIL ADDRESS</th>
                  <th className="py-2.5 px-3">ASSIGNED ROLE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/10 font-sans">
                {allUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-on-surface-variant italic font-mono">
                      No system users found. Demo accounts seed automatically on login.
                    </td>
                  </tr>
                ) : (
                  allUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-2.5 px-3 font-mono text-primary font-bold">{user.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-on-surface">{user.full_name || 'N/A'}</td>
                      <td className="py-2.5 px-3 font-mono text-on-surface-variant">{user.email}</td>
                      <td className="py-2.5 px-3">
                        <select
                          value={user.role}
                          onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                          className="bg-surface-container-lowest border border-outline/30 text-on-surface font-mono text-xs p-1.5 rounded-md focus:outline-none focus:border-primary cursor-pointer font-bold"
                        >
                          <option value="field_worker">Field Worker (Report Intake)</option>
                          <option value="manager">Manager (Review Queue & Dashboard)</option>
                          <option value="admin">Admin (Full Control & Schedule Builder)</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  );
};


