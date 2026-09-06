import React from 'react';
import { Compass, Cpu, Layers, ShieldCheck, Zap, Bot } from 'lucide-react';
import type { SchedulePreset } from '../types';
import { SCHEDULE_PRESETS } from '../utils/presets';

interface HeaderProps {
  currentPresetId: string;
  onSelectPreset: (preset: SchedulePreset) => void;
  activeActivitiesCount: number;
  totalAuditCount: number;
  useGeminiApi: boolean;
  onToggleGeminiApi: () => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  autoApproveMode: boolean;
  onToggleAutoApproveMode: () => void;
}

export const BlueprintHeader: React.FC<HeaderProps> = ({
  currentPresetId,
  onSelectPreset,
  activeActivitiesCount,
  totalAuditCount,
  useGeminiApi,
  onToggleGeminiApi,
  apiKey,
  onApiKeyChange,
  autoApproveMode,
  onToggleAutoApproveMode
}) => {
  const [showSettings, setShowSettings] = React.useState(false);

  return (
    <header className="blueprint-titleblock mb-6 p-4 rounded-sm border-cyan-400/40">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        
        {/* Logo & Technical Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950/80 border border-cyan-400/50 rounded-sm text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]">
            <Compass className="w-7 h-7 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-wider text-cyan-400 mono-font">
                SETUTRACK <span className="text-amber-400 text-sm font-semibold tracking-normal px-2 py-0.5 border border-amber-400/50 bg-amber-950/40 rounded-xs">AUTONOMOUS ENGINE v3.5</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 mono-font mt-0.5 flex items-center gap-2">
              <span>PROJECT DWG: ST-2026-NEXUS</span>
              <span className="text-cyan-600">|</span>
              <span>SCALE: N.T.S.</span>
              <span className="text-cyan-600">|</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                {autoApproveMode ? 'AUTONOMOUS ZERO-TOUCH ACTIVE' : 'MANUAL APPROVAL ACTIVE'}
              </span>
            </p>
          </div>
        </div>

        {/* Controls & Autonomous Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Autonomous Zero-Touch Mode Toggle Button */}
          <button
            onClick={onToggleAutoApproveMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold mono-font border rounded-xs transition-all cursor-pointer ${
              autoApproveMode
                ? 'bg-emerald-950 text-emerald-300 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="When active, site reports automatically update planned schedule activities without human intervention."
          >
            <Bot className={`w-4 h-4 ${autoApproveMode ? 'text-emerald-400 animate-bounce' : 'text-slate-500'}`} />
            <span>{autoApproveMode ? '⚡ ZERO-TOUCH AUTO-UPDATE: ON' : 'MANUAL REVIEW MODE'}</span>
          </button>

          {/* Preset Selector */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-cyan-500/30 p-1.5 rounded-sm">
            <Layers className="w-4 h-4 text-cyan-400 ml-1" />
            <span className="text-xs font-semibold text-slate-300 mono-font uppercase">Preset:</span>
            <select
              value={currentPresetId}
              onChange={(e) => {
                const found = SCHEDULE_PRESETS.find(p => p.id === e.target.value);
                if (found) onSelectPreset(found);
              }}
              className="bg-cyan-950/90 text-cyan-300 text-xs mono-font border border-cyan-500/40 rounded-xs px-2 py-1 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              {SCHEDULE_PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {/* AI Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 text-xs mono-font px-3 py-1.5 bg-slate-900 border border-amber-500/40 text-amber-300 hover:bg-amber-950/40 transition-colors rounded-xs cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>AI Config</span>
          </button>

          {/* Live Metrics Stamp */}
          <div className="hidden md:flex items-center gap-3 bg-cyan-950/40 border border-cyan-500/20 px-3 py-1 rounded-xs mono-font text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">SCHEDULE ITEMS</span>
              <span className="text-cyan-300 font-bold">{activeActivitiesCount}</span>
            </div>
            <div className="h-6 w-px bg-cyan-500/20"></div>
            <div>
              <span className="text-slate-400 block text-[10px]">AUDITED REPORTS</span>
              <span className="text-amber-400 font-bold">{totalAuditCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable AI Config Drawer */}
      {showSettings && (
        <div className="mt-4 p-3 bg-slate-950 border border-amber-500/50 rounded-xs text-xs mono-font text-slate-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-amber-300">Dual AI Engine Configuration</p>
              <p className="text-[11px] text-slate-400">
                SetuTrack automatically runs pure client-side NLP fuzzy matching offline. You may optionally toggle Gemini API inference.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useGeminiApi}
                onChange={onToggleGeminiApi}
                className="accent-amber-400"
              />
              <span>Use Live Gemini API</span>
            </label>
            {useGeminiApi && (
              <input
                type="password"
                placeholder="Paste Gemini API Key..."
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                className="bg-slate-900 border border-amber-400/50 text-amber-200 px-2 py-1 rounded-xs text-xs w-48 focus:outline-none"
              />
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export const BlueprintFooter: React.FC = () => {
  return (
    <footer className="blueprint-titleblock mt-12 p-4 rounded-sm border-cyan-400/40 text-xs mono-font text-slate-400">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-cyan-500/20">
        
        <div className="pr-2">
          <span className="text-[10px] text-cyan-400 font-bold block uppercase tracking-wider">DRAWING TITLE</span>
          <span className="text-sm font-bold text-slate-200 block">SETUTRACK AI SCHEDULE BRIDGE</span>
          <span className="text-[10px] text-slate-500">ZERO-TOUCH AUTONOMOUS SITE AUDIT INSTRUMENT</span>
        </div>

        <div className="pt-2 md:pt-0 md:px-4">
          <span className="text-[10px] text-cyan-400 font-bold block uppercase tracking-wider">STAMP / CERTIFICATION</span>
          <div className="flex items-center gap-2 mt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-bold">AUTONOMOUS SCHEDULE SYNC ACTIVE</span>
          </div>
        </div>

        <div className="pt-2 md:pt-0 md:px-4">
          <span className="text-[10px] text-cyan-400 font-bold block uppercase tracking-wider">ENGINEER SPECIFICATION</span>
          <span className="text-slate-300 block">GOOGLE DEEPMIND / ANTIGRAVITY ENGINE</span>
          <span className="text-[10px] text-slate-500">ISO-9001 COMPLIANT CONSTRUCTION AUTOMATION</span>
        </div>

        <div className="pt-2 md:pt-0 md:pl-4 flex flex-col justify-between">
          <span className="text-[10px] text-cyan-400 font-bold block uppercase tracking-wider">SHEET CONTROL</span>
          <div className="flex justify-between items-center text-[11px] text-slate-300">
            <span>DWG 1 OF 1</span>
            <span className="text-amber-400">REV: 03.5</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
