import React, { useState, useEffect } from 'react';
import { CheckCircle, Cpu, Gauge, ChevronRight, ArrowRight, Sparkles, Zap } from 'lucide-react';
import type { Activity, MatchResult } from '../types';

interface MatchingEngineProps {
  matchResults: MatchResult[] | null;
  activities: Activity[];
}

export const MatchingEngine: React.FC<MatchingEngineProps> = ({
  matchResults,
  activities
}) => {
  const topMatch = matchResults && matchResults.length > 0 ? matchResults[0] : null;

  const [selectedActivityId, setSelectedActivityId] = useState<string>(topMatch ? topMatch.activity.id : '');
  const [customProgress, setCustomProgress] = useState<number>(topMatch ? topMatch.extractedProgress : 0);

  useEffect(() => {
    if (topMatch) {
      setSelectedActivityId(topMatch.activity.id);
      setCustomProgress(topMatch.extractedProgress);
    }
  }, [topMatch]);

  if (!matchResults || matchResults.length === 0 || !topMatch) {
    return (
      <section className="blueprint-card p-6 rounded-sm text-center">
        <div className="max-w-md mx-auto py-8">
          <div className="w-12 h-12 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-cyan-300 mono-font uppercase">AUTONOMOUS MATCHING ENGINE IDLE</h3>
          <p className="text-xs text-slate-400 mt-1">
            Submit a site report above to view live natural language entity extraction, sub-score breakdown, and automatic schedule synchronization.
          </p>
        </div>
      </section>
    );
  }

  const activeTargetActivity = activities.find(a => a.id === selectedActivityId) || topMatch.activity;

  return (
    <section className="blueprint-card p-5 rounded-sm border-cyan-400">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-5 border-b border-cyan-500/30 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_10px_#00f0ff] animate-pulse"></span>
            <h2 className="text-lg font-bold text-cyan-300 mono-font uppercase">
              2. HEURISTIC & SEMANTIC MATCH BREAKDOWN
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time entity extraction, location validation, and confidence sub-scores.
          </p>
        </div>

        {topMatch.isHighConfidence ? (
          <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/50 px-3 py-1.5 rounded-xs text-emerald-300 text-xs mono-font">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-spin-slow" />
            <span className="font-bold">HIGH CONFIDENCE MATCH ({topMatch.overallConfidence}%)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-amber-950/80 border border-amber-500/50 px-3 py-1.5 rounded-xs text-amber-300 text-xs mono-font">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="font-bold">LOW CONFIDENCE — MANUAL REVIEW ({topMatch.overallConfidence}%)</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TOP MATCH & REASONING CARD */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-950/90 border border-cyan-500/30 p-4 rounded-xs">
            <div className="flex items-center justify-between text-xs mono-font mb-2">
              <span className="text-slate-400 uppercase tracking-wider">MATCHED TARGET ACTIVITY</span>
              <span className="text-cyan-400 font-bold">{activeTargetActivity.id}</span>
            </div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              {activeTargetActivity.name}
              <span className="text-xs px-2 py-0.5 bg-slate-900 border border-slate-700 text-amber-300 rounded-xs mono-font">
                {activeTargetActivity.zone}
              </span>
            </h3>

            {/* REASONING SUMMARY */}
            <div className="mt-3 p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-xs text-xs text-cyan-200">
              <span className="font-bold block text-cyan-400 mb-1 mono-font">MATCHING ALGORITHM REASONING:</span>
              <p className="leading-relaxed">{topMatch.reasoning}</p>
            </div>
          </div>

          {/* SUB-SCORE METRIC BARS */}
          <div className="bg-slate-950/90 border border-cyan-500/30 p-4 rounded-xs space-y-3 text-xs mono-font">
            <h4 className="font-bold text-cyan-300 uppercase flex items-center gap-2 mb-3">
              <Gauge className="w-4 h-4 text-cyan-400" /> CONFIDENCE SUB-SCORE BREAKDOWN
            </h4>

            {/* 1. SEMANTIC MATCH (50%) */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>SEMANTIC & SYNONYM OVERLAP (50% WEIGHT)</span>
                <span className="font-bold text-cyan-300">{topMatch.subScores.semanticMatch}%</span>
              </div>
              <div className="w-full bg-slate-900 border border-slate-700 h-2 rounded-xs overflow-hidden">
                <div
                  className="bg-cyan-400 h-full rounded-xs transition-all duration-500"
                  style={{ width: `${topMatch.subScores.semanticMatch}%` }}
                ></div>
              </div>
            </div>

            {/* 2. LOCATION MATCH (35%) */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>ZONE / LOCATION EXTRACTION (35% WEIGHT)</span>
                <span className="font-bold text-amber-300">{topMatch.subScores.locationMatch}%</span>
              </div>
              <div className="w-full bg-slate-900 border border-slate-700 h-2 rounded-xs overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-xs transition-all duration-500"
                  style={{ width: `${topMatch.subScores.locationMatch}%` }}
                ></div>
              </div>
            </div>

            {/* 3. DATE PLAUSIBILITY (15%) */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>SCHEDULE STATUS PLAUSIBILITY (15% WEIGHT)</span>
                <span className="font-bold text-emerald-300">{topMatch.subScores.datePlausibility}%</span>
              </div>
              <div className="w-full bg-slate-900 border border-slate-700 h-2 rounded-xs overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-xs transition-all duration-500"
                  style={{ width: `${topMatch.subScores.datePlausibility}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* CANDIDATE CANDIDATE RANKINGS */}
        <div className="bg-slate-950/90 border border-cyan-500/30 p-4 rounded-xs flex flex-col">
          <h4 className="font-bold text-cyan-300 text-xs mono-font uppercase mb-3 flex items-center justify-between border-b border-cyan-500/20 pb-2">
            <span>CANDIDATE RANKINGS</span>
            <span className="text-slate-400 text-[10px]">{matchResults.length} EVALUATED</span>
          </h4>

          <div className="space-y-2 overflow-y-auto max-h-72 pr-1 flex-1">
            {matchResults.map((result, idx) => (
              <div
                key={result.activity.id}
                onClick={() => {
                  setSelectedActivityId(result.activity.id);
                  setCustomProgress(result.extractedProgress);
                }}
                className={`p-2.5 rounded-xs border text-xs mono-font transition-all cursor-pointer ${
                  selectedActivityId === result.activity.id
                    ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">#{idx + 1} {result.activity.name}</span>
                  <span className={`font-bold ${result.overallConfidence >= 78 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {result.overallConfidence}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] mt-1 text-slate-400">
                  <span>{result.activity.zone}</span>
                  <span>Target: {result.extractedProgress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
