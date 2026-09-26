import React, { useState, useEffect } from 'react';
import { Cpu, Gauge } from 'lucide-react';
import type { Activity, MatchResult } from '../types';
import { ConfidenceBadge } from './ui/ConfidenceBadge';
import { ZoneTag } from './ui/ZoneTag';

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

  useEffect(() => {
    if (topMatch) {
      setSelectedActivityId(topMatch.activity.id);
    }
  }, [topMatch]);

  if (!matchResults || matchResults.length === 0 || !topMatch) {
    return (
      <section className="p-6 rounded-xl border border-outline/20 bg-surface-container-lowest shadow-sm text-center">
        <div className="max-w-md mx-auto py-8">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-on-surface font-mono uppercase">AUTONOMOUS MATCHING ENGINE IDLE</h3>
          <p className="text-xs text-on-surface-variant font-sans mt-1">
            Submit a site report above to view live natural language entity extraction, sub-score breakdown, and automatic schedule synchronization.
          </p>
        </div>
      </section>
    );
  }

  const activeTargetActivity = activities.find(a => a.id === selectedActivityId) || topMatch.activity;

  return (
    <section className="p-5 rounded-xl border border-outline/20 bg-surface-container-lowest shadow-sm space-y-5">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-outline/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse"></span>
            <h2 className="text-base font-bold text-on-surface font-mono uppercase">
              2. HEURISTIC & SEMANTIC MATCH BREAKDOWN
            </h2>
          </div>
          <p className="text-xs text-on-surface-variant font-sans mt-0.5">
            Real-time entity extraction, location validation, and confidence sub-scores.
          </p>
        </div>

        <ConfidenceBadge 
          score={topMatch.overallConfidence} 
          isAutoApproved={topMatch.isHighConfidence} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TOP MATCH & REASONING CARD */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface-container-low border border-outline/15 p-4 rounded-xl">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-on-surface-variant uppercase tracking-wider font-semibold">MATCHED TARGET ACTIVITY</span>
              <span className="text-primary font-bold">{activeTargetActivity.id}</span>
            </div>
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2 flex-wrap">
              {activeTargetActivity.name}
              <ZoneTag zone={activeTargetActivity.zone} />
            </h3>

            {/* REASONING SUMMARY */}
            <div className="mt-3 p-3 bg-surface-container border border-outline/10 rounded-lg text-xs text-on-surface font-sans">
              <span className="font-bold block text-primary mb-1 font-mono">MATCHING ALGORITHM REASONING:</span>
              <p className="leading-relaxed">{topMatch.reasoning}</p>
            </div>
          </div>

          {/* SUB-SCORE METRIC BARS */}
          <div className="bg-surface-container-low border border-outline/15 p-4 rounded-xl space-y-3 text-xs font-mono">
            <h4 className="font-bold text-on-surface uppercase flex items-center gap-2 mb-3">
              <Gauge className="w-4 h-4 text-primary" /> CONFIDENCE SUB-SCORE BREAKDOWN
            </h4>

            {/* 1. SEMANTIC MATCH (50%) */}
            <div>
              <div className="flex justify-between text-on-surface-variant mb-1">
                <span>SEMANTIC & SYNONYM OVERLAP (50% WEIGHT)</span>
                <span className="font-bold text-primary">{topMatch.subScores.semanticMatch}%</span>
              </div>
              <div className="w-full bg-surface-container-highest border border-outline/20 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${topMatch.subScores.semanticMatch}%` }}
                ></div>
              </div>
            </div>

            {/* 2. LOCATION MATCH (35%) */}
            <div>
              <div className="flex justify-between text-on-surface-variant mb-1">
                <span>ZONE / LOCATION EXTRACTION (35% WEIGHT)</span>
                <span className="font-bold text-amber-600">{topMatch.subScores.locationMatch}%</span>
              </div>
              <div className="w-full bg-surface-container-highest border border-outline/20 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${topMatch.subScores.locationMatch}%` }}
                ></div>
              </div>
            </div>

            {/* 3. DATE PLAUSIBILITY (15%) */}
            <div>
              <div className="flex justify-between text-on-surface-variant mb-1">
                <span>SCHEDULE STATUS PLAUSIBILITY (15% WEIGHT)</span>
                <span className="font-bold text-secondary">{topMatch.subScores.datePlausibility}%</span>
              </div>
              <div className="w-full bg-surface-container-highest border border-outline/20 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-secondary h-full rounded-full transition-all duration-500"
                  style={{ width: `${topMatch.subScores.datePlausibility}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* CANDIDATE CANDIDATE RANKINGS */}
        <div className="bg-surface-container-low border border-outline/15 p-4 rounded-xl flex flex-col">
          <h4 className="font-bold text-on-surface text-xs font-mono uppercase mb-3 flex items-center justify-between border-b border-outline/10 pb-2">
            <span>CANDIDATE RANKINGS</span>
            <span className="text-on-surface-variant text-[10px]">{matchResults.length} EVALUATED</span>
          </h4>

          <div className="space-y-2 overflow-y-auto max-h-72 pr-1 flex-1">
            {matchResults.map((result, idx) => (
              <div
                key={result.activity.id}
                onClick={() => {
                  setSelectedActivityId(result.activity.id);
                }}
                className={`p-2.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                  selectedActivityId === result.activity.id
                    ? 'bg-primary-container text-on-primary-container border-primary shadow-sm font-semibold'
                    : 'bg-surface-container border-outline/15 text-on-surface-variant hover:border-outline/40 hover:text-on-surface'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">#{idx + 1} {result.activity.name}</span>
                  <span className={`font-bold ${result.overallConfidence >= 75 ? 'text-secondary font-mono' : 'text-amber-600 font-mono'}`}>
                    {result.overallConfidence}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] mt-1 text-on-surface-variant">
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

