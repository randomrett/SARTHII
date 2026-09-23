import React from 'react';
import { useScheduleContext } from '../context/ScheduleContext';
import { SCHEDULE_PRESETS } from '../utils/presets';
import { Settings as SettingsIcon, Bot, Cpu, Layers } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    currentPreset,
    handleSelectPreset,
    autoApproveMode,
    setAutoApproveMode,
    useGeminiApi,
    setUseGeminiApi,
    apiKey,
    setApiKey
  } = useScheduleContext();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="blueprint-card p-5 rounded-sm border-cyan-400/40">
        <h2 className="text-lg font-bold text-cyan-300 mono-font flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-cyan-400" />
          SYSTEM CONFIGURATION & CONTROL PANEL
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage autonomous execution settings, preset schedule baselines, and AI engine inference parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Zero-Touch Autonomous Mode */}
        <div className="blueprint-card p-5 rounded-sm space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <h3 className="font-bold text-cyan-300 text-sm mono-font flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-400" />
              1. AUTONOMOUS EXECUTION MODE
            </h3>
            <span className={`px-2 py-0.5 text-[10px] mono-font font-bold rounded-xs border ${
              autoApproveMode ? 'text-emerald-300 bg-emerald-950 border-emerald-500' : 'text-slate-400 bg-slate-900 border-slate-700'
            }`}>
              {autoApproveMode ? 'AUTONOMOUS ACTIVE' : 'MANUAL REVIEW'}
            </span>
          </div>

          <p className="text-xs text-slate-300">
            When enabled, site reports automatically update planned schedule activities and log audit trail entries without human intervention whenever match confidence exceeds threshold.
          </p>

          <button
            onClick={() => setAutoApproveMode(!autoApproveMode)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold mono-font border rounded-xs transition-all cursor-pointer ${
              autoApproveMode
                ? 'bg-emerald-950 text-emerald-300 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
            }`}
          >
            <Bot className={`w-4 h-4 ${autoApproveMode ? 'text-emerald-400 animate-bounce' : 'text-slate-400'}`} />
            <span>{autoApproveMode ? '⚡ DISABLE ZERO-TOUCH (SWITCH TO MANUAL)' : '⚡ ENABLE ZERO-TOUCH AUTO-APPROVE'}</span>
          </button>
        </div>

        {/* Card 2: Preset Schedule Loader */}
        <div className="blueprint-card p-5 rounded-sm space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <h3 className="font-bold text-cyan-300 text-sm mono-font flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              2. BASELINE SCHEDULE PRESETS
            </h3>
          </div>

          <p className="text-xs text-slate-300">
            Select a pre-configured baseline schedule preset (Metro, Highway, High-Rise Tower).
          </p>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 mono-font block">Active Preset:</label>
            <select
              value={currentPreset.id}
              onChange={(e) => {
                const found = SCHEDULE_PRESETS.find(p => p.id === e.target.value);
                if (found) handleSelectPreset(found);
              }}
              className="w-full bg-cyan-950 text-cyan-300 text-xs mono-font border border-cyan-500/40 rounded-xs p-2.5 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              {SCHEDULE_PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.title} — ({p.activities.length} Activities)</option>
              ))}
            </select>
          </div>
        </div>

        {/* Card 3: Dual AI Engine Configuration */}
        <div className="blueprint-card p-5 rounded-sm space-y-4 md:col-span-2">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <h3 className="font-bold text-cyan-300 text-sm mono-font flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              3. AI INFERENCE ENGINE CONFIGURATION
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950 p-4 border border-cyan-500/30 rounded-xs">
            <div>
              <p className="text-xs font-bold text-slate-200 mono-font">Client-Side Heuristic vs. Live Gemini API</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Saarthi automatically runs pure client-side NLP fuzzy matching offline. Optionally connect live Gemini API.
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-slate-900 border border-amber-500/50 px-3 py-1.5 rounded-xs text-xs mono-font text-amber-300 shrink-0">
              <input
                type="checkbox"
                checked={useGeminiApi}
                onChange={() => setUseGeminiApi(!useGeminiApi)}
                className="accent-amber-400"
              />
              <span>Use Live Gemini API</span>
            </label>
          </div>

          {useGeminiApi && (
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-amber-300 mono-font block">Gemini API Key:</label>
              <input
                type="password"
                placeholder="Paste Gemini API key here..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-950 border border-amber-400/50 text-amber-200 p-2.5 text-xs mono-font rounded-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
