import React, { useState } from 'react';
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
  if (!matchResults || matchResults.length === 0) {
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

  const topMatch = matchResults[0];
  const [selectedActivityId, setSelectedActivityId] = useState<string>(topMatch.activity.id);
  const [customProgress, setCustomProgress] = useState<number>(topMatch.extractedProgress);

  // Sync state if topMatch changes
  React.useEffect(() => {
    if (topMatch) {
      setSelectedActivityId(topMatch.activity.id);
      setCustomProgress(topMatch.extractedProgress);
    }
  }, [topMatch]);

  const activeTargetActivity = activities.find(a => a.id === selectedActivityId) || topMatch.activity;

  return (
    <section className="blueprint-card p-5 rounded-sm border-cyan-400">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-cyan-300 mono-font flex items-center gap-2">
              <Gauge className="w-5 h-5 text-cyan-400" />
              3. AUTONOMOUS MATCH ANALYSIS & EVALUATION
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time NLP entity extraction and sub-score metrics automatically synchronized with the baseline schedule.
          </p>
        </div>

        {/* Confidence Stamp */}
        <div className="blueprint-stamp">
          AUTONOMOUS AUTO-UPDATED
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT / MAIN CANDIDATE CARD (Col 7) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Top Activity Card */}
          <div className="bg-slate-950 p-4 border border-cyan-500/30 rounded-xs space-y-3 relative overflow-hidden">
            
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-cyan-400 mono-font font-bold block uppercase">AUTOMATICALLY MATCHED ACTIVITY</span>
                <h3 className="text-base font-extrabold text-slate-100 mono-font">{activeTargetActivity.name}</h3>
                <div className="flex items-center gap-2 mt-1 text-xs mono-font">
                  <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-amber-300 rounded-xs">
                    {activeTargetActivity.zone}
                  </span>
                  <span className="text-slate-400">ID: {activeTargetActivity.id}</span>
                </div>
              </div>

              {/* Confidence Gauge */}
              <div className="text-right">
                <span className="text-[10px] text-slate-400 mono-font block">OVERALL CONFIDENCE</span>
                <div className={`text-2xl font-black mono-font ${topMatch.overallConfidence >= 78 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {topMatch.overallConfidence}%
                </div>
              </div>
            </div>

            {/* Extracted Entities Tag Pills */}
            <div className="pt-2 border-t border-cyan-500/10 flex flex-wrap gap-2 text-[11px] mono-font">
              <span className="bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-xs flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" /> Extracted Target Progress: {topMatch.extractedProgress}%
              </span>
              {topMatch.extractedEntities.zoneKeyword && (
                <span className="bg-amber-950/80 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-xs">
                  Zone Keyword: "{topMatch.extractedEntities.zoneKeyword}"
                </span>
              )}
              {topMatch.extractedEntities.isDelayMention && (
                <span className="bg-crimson-950/80 text-crimson-300 border border-crimson-500/30 px-2 py-0.5 rounded-xs">
                  ⚠️ Delay Note Flagged
                </span>
              )}
            </div>

            {/* Progress Delta Preview */}
            <div className="bg-slate-900/90 p-3 border border-cyan-500/20 rounded-xs text-xs mono-font space-y-2">
              <span className="text-[10px] text-cyan-400 font-bold block">SCHEDULE PROGRESS AUTOMATICALLY APPLIED:</span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Previous Baseline:</span>
                  <span className="font-bold text-slate-200">{topMatch.activity.progress}%</span>
                </div>
                <ArrowRight className="w-4 h-4 text-cyan-400" />
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Updated Baseline:</span>
                  <span className="font-extrabold text-emerald-400">{customProgress}%</span>
                </div>
              </div>
            </div>

            {/* AI Reasoning Text */}
            <p className="text-xs text-slate-300 italic mono-font bg-cyan-950/20 p-2.5 border-l-2 border-cyan-400">
              "{topMatch.reasoning}"
            </p>
          </div>

          {/* AUTONOMOUS EXECUTION STATUS BADGE (NO MANUAL BUTTONS NEEDED) */}
          <div className="bg-emerald-950/70 border border-emerald-400/80 p-3.5 rounded-xs text-xs mono-font text-emerald-300 flex items-center justify-between gap-3 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-extrabold block text-emerald-200">AUTOMATICALLY APPROVED & SCHEDULE SYNCED</span>
                <span className="text-[11px] text-slate-300">The schedule builder was automatically updated without human intervention.</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-950 bg-emerald-400 px-2 py-1 rounded-xs uppercase shrink-0 flex items-center gap-1">
              <Zap className="w-3 h-3 fill-slate-950" /> ZERO TOUCH
            </span>
          </div>

        </div>

        {/* RIGHT SUB-SCORE BREAKDOWN METRICS (Col 5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950 p-4 border border-cyan-500/30 rounded-xs space-y-4">
            <h4 className="text-xs font-bold text-cyan-400 mono-font border-b border-cyan-500/20 pb-2">
              SUB-SCORE BREAKDOWN (ALGORITHMIC RATING)
            </h4>

            {/* Sub-Score 1: Semantic Match */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs mono-font">
                <span className="text-slate-300">Wording / Semantic Match</span>
                <span className="font-bold text-cyan-300">{topMatch.subScores.semanticMatch}%</span>
              </div>
              <div className="h-2 bg-slate-900 border border-cyan-500/20 rounded-xs overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-500"
                  style={{ width: `${topMatch.subScores.semanticMatch}%` }}
                ></div>
              </div>
            </div>

            {/* Sub-Score 2: Location Match */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs mono-font">
                <span className="text-slate-300">Location / Zone Match</span>
                <span className="font-bold text-amber-300">{topMatch.subScores.locationMatch}%</span>
              </div>
              <div className="h-2 bg-slate-900 border border-cyan-500/20 rounded-xs overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${topMatch.subScores.locationMatch}%` }}
                ></div>
              </div>
            </div>

            {/* Sub-Score 3: Date & Sequence Plausibility */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs mono-font">
                <span className="text-slate-300">Date / Sequence Plausibility</span>
                <span className="font-bold text-emerald-300">{topMatch.subScores.datePlausibility}%</span>
              </div>
              <div className="h-2 bg-slate-900 border border-cyan-500/20 rounded-xs overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${topMatch.subScores.datePlausibility}%` }}
                ></div>
              </div>
            </div>

            {/* Sub-Score 4: Progress Extraction */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs mono-font">
                <span className="text-slate-300">Progress Extraction Confidence</span>
                <span className="font-bold text-purple-300">{topMatch.subScores.progressConfidence}%</span>
              </div>
              <div className="h-2 bg-slate-900 border border-cyan-500/20 rounded-xs overflow-hidden">
                <div
                  className="h-full bg-purple-400 transition-all duration-500"
                  style={{ width: `${topMatch.subScores.progressConfidence}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* ALTERNATIVE RANKED MATCHES */}
          {matchResults.length > 1 && (
            <div className="bg-slate-950 p-4 border border-cyan-500/20 rounded-xs space-y-2">
              <span className="text-[10px] text-slate-400 mono-font font-bold block uppercase">
                OTHER RANKED SCHEDULE MATCHES:
              </span>
              <div className="space-y-1.5">
                {matchResults.slice(1, 3).map((res) => (
                  <div
                    key={res.activity.id}
                    className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded-xs text-xs mono-font"
                  >
                    <div>
                      <span className="text-slate-300 font-semibold">{res.activity.name}</span>
                      <span className="text-[10px] text-amber-400 ml-2">({res.activity.zone})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold">{res.overallConfidence}%</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
};
