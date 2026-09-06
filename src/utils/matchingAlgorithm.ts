import type { Activity, ExtractedEntities, MatchResult, SubScores } from '../types';
import { normalizeSpokenReport } from './constructionPhonetics';

// Construction domain synonym dictionary for semantic mapping
const SYNONYM_MAP: Record<string, string[]> = {
  excavation: ['digging', 'earthworks', 'trenching', 'piling', 'diaphragm', 'shaft', 'unearth'],
  concrete: ['casting', 'pour', 'pouring', 'raft', 'slab', 'column', 'ready-mix', 'rcc', 'cement'],
  rebar: ['reinforcement', 'steel', 'bending', 'cage', 'iron', 'bars'],
  shuttering: ['formwork', 'framing', 'scaffolding', 'mould'],
  facade: ['glazing', 'curtain wall', 'cladding', 'glass', 'windows'],
  asphalt: ['paving', 'bituminous', 'wearing course', 'blacktop', 'tar'],
  girder: ['psc', 'bridge span', 'beam', 'erection', 'launching', 'heavy lift'],
  mep: ['plumbing', 'electrical', 'conduit', 'chase', 'hvac', 'ducts']
};

/**
 * Clean text into word tokens removing punctuation and stop words
 */
function tokenize(text: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
    'is', 'are', 'was', 'were', 'been', 'be', 'has', 'have', 'had', 'done', 'today',
    'yesterday', 'this', 'that', 'work', 'site', 'report', 'we', 'our', 'and', 'or'
  ]);
  
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s%-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !stopWords.has(token));
}

/**
 * Calculate Levenshtein similarity distance between 0 and 1
 */
function levenshteinSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - (distance / maxLen);
}

/**
 * Extract structured entities from raw supervisor text
 */
export function extractEntitiesFromReport(rawReportText: string): ExtractedEntities {
  const reportText = normalizeSpokenReport(rawReportText);
  const lower = reportText.toLowerCase();
  
  // 1. Progress Percentage Extraction
  let extractedProgress: number | null = null;
  const percentMatch = reportText.match(/(\d{1,3})\s*%/);
  
  if (percentMatch) {
    const val = parseInt(percentMatch[1], 10);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      extractedProgress = val;
    }
  }
  
  // Phrase-based progress extraction if no explicit % found
  const isCompletedMention = /\b(finished|completed|done|wrapped up|finalized|100%|complete)\b/.test(lower);
  if (extractedProgress === null) {
    if (isCompletedMention) extractedProgress = 100;
    else if (/\b(halfway|half done|50%|50 percent)\b/.test(lower)) extractedProgress = 50;
    else if (/\b(started|commenced|begun|just started|10%)\b/.test(lower)) extractedProgress = 20;
    else if (/\b(three quarters|75%|almost done|nearly finished)\b/.test(lower)) extractedProgress = 75;
  }

  // 2. Zone/Location Extraction
  let zoneKeyword: string | null = null;
  const zoneRegexes = [
    /\bzone\s*([a-z0-9-]+)\b/i,
    /\bpier\s*([0-9-]+)\b/i,
    /\btower\s*([0-9-]+)\b/i,
    /\bfloor\s*([0-9-]+)\b/i,
    /\blevel\s*([0-9-]+)\b/i,
    /\bspan\s*([0-9-]+)\b/i,
    /\bshaft\b/i,
    /\bsection\s*([0-9-]+)\b/i
  ];
  
  for (const regex of zoneRegexes) {
    const match = reportText.match(regex);
    if (match) {
      zoneKeyword = match[0].trim();
      break;
    }
  }

  // 3. Delay & Notes Extraction
  const isDelayMention = /\b(delayed|delay|shortage|rain|breakdown|stuck|behind|issue|stoppage)\b/.test(lower);
  
  const tokens = tokenize(reportText);

  return {
    activityNameKeywords: tokens,
    zoneKeyword,
    extractedProgress,
    isCompletedMention,
    isDelayMention,
    extractedDate: new Date().toISOString().split('T')[0],
    extractedNotes: isDelayMention ? 'Potential delay or bottleneck noted in report.' : 'Normal progress update.'
  };
}

/**
 * Calculate Semantic Match Sub-Score (0-100)
 */
function calculateSemanticScore(reportText: string, activity: Activity): number {
  const reportTokens = tokenize(reportText);
  const activityTokens = tokenize(`${activity.name} ${activity.category || ''}`);
  
  if (reportTokens.length === 0 || activityTokens.length === 0) return 30;
  
  let matchScore = 0;
  let totalWeight = activityTokens.length;

  for (const actToken of activityTokens) {
    let tokenMatched = false;
    
    // Direct token match
    if (reportTokens.includes(actToken)) {
      matchScore += 1.0;
      tokenMatched = true;
      continue;
    }
    
    // Synonym expansion match
    for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
      if (actToken.includes(key) || synonyms.some(s => actToken.includes(s))) {
        if (reportTokens.some(rt => rt.includes(key) || synonyms.some(s => rt.includes(s)))) {
          matchScore += 0.85;
          tokenMatched = true;
          break;
        }
      }
    }
    
    // Fuzzy Levenshtein match for typos
    if (!tokenMatched) {
      for (const repToken of reportTokens) {
        const sim = levenshteinSimilarity(actToken, repToken);
        if (sim > 0.75) {
          matchScore += sim * 0.8;
          break;
        }
      }
    }
  }

  const rawPercentage = (matchScore / totalWeight) * 100;
  return Math.min(100, Math.round(rawPercentage * 1.15)); // slight boost for natural matches
}

/**
 * Calculate Location / Zone Match Sub-Score (0-100)
 */
function calculateLocationScore(extractedEntities: ExtractedEntities, activityZone: string, fullReportText: string): number {
  const repZone = extractedEntities.zoneKeyword?.toLowerCase();
  const actZone = activityZone.toLowerCase();
  const reportLower = fullReportText.toLowerCase();

  // Exact zone string match
  if (repZone && (actZone === repZone || actZone.includes(repZone) || repZone.includes(actZone))) {
    return 100;
  }

  // Zone mentioned in report text explicitly
  if (actZone && reportLower.includes(actZone)) {
    return 95;
  }

  // Partial substring zone match (e.g., "Zone A" vs "Zone A - West")
  const actZoneTokens = tokenize(actZone);
  if (repZone && actZoneTokens.some(tok => repZone.includes(tok) && tok.length > 1)) {
    return 80;
  }

  // If report has a zone mentioned but it's completely different from this activity's zone
  if (repZone && actZone) {
    const repZoneNum = repZone.replace(/[^a-z0-9]/g, '');
    const actZoneNum = actZone.replace(/[^a-z0-9]/g, '');
    if (repZoneNum && actZoneNum && repZoneNum !== actZoneNum) {
      return 15; // Low confidence due to conflicting zone
    }
  }

  // If no zone was extracted in the report, assign neutral score
  return 60;
}

/**
 * Calculate Date & Sequence Plausibility Sub-Score (0-100)
 */
function calculateDatePlausibility(activity: Activity, extractedEntities: ExtractedEntities): number {
  let score = 75;

  // Active activities are more plausible targets than completed ones
  if (activity.status === 'in_progress') {
    score += 20;
  } else if (activity.status === 'not_started') {
    score += 10;
  } else if (activity.status === 'completed') {
    // If report mentions 100% again or already done, lower slightly
    if (extractedEntities.extractedProgress !== null && extractedEntities.extractedProgress < 100) {
      score -= 25; // Unlikely to update a completed task to <100% progress without explicit revert
    }
  }

  // If progress increment is logical (e.g. current progress is 40% and new is 60%)
  if (extractedEntities.extractedProgress !== null) {
    if (extractedEntities.extractedProgress >= activity.progress) {
      score += 10;
    } else {
      score -= 15; // Regressive progress report
    }
  }

  return Math.max(10, Math.min(100, score));
}

/**
 * Match a raw site report against all activities in the schedule
 */
export function matchReportToSchedule(rawReportText: string, activities: Activity[]): MatchResult[] {
  if (!activities || activities.length === 0) {
    return [];
  }

  const reportText = normalizeSpokenReport(rawReportText);
  const entities = extractEntitiesFromReport(reportText);

  const results: MatchResult[] = activities.map(act => {
    const semanticMatch = calculateSemanticScore(reportText, act);
    const locationMatch = calculateLocationScore(entities, act.zone, reportText);
    const datePlausibility = calculateDatePlausibility(act, entities);

    // Weighted Overall Score calculation
    let overallConfidence = Math.round(
      (semanticMatch * 0.50) +
      (locationMatch * 0.35) +
      (datePlausibility * 0.15)
    );

    // Hard penalty if location explicitly conflicts
    if (locationMatch <= 20) {
      overallConfidence = Math.min(overallConfidence, 45);
    }

    const subScores: SubScores = {
      semanticMatch,
      locationMatch,
      datePlausibility,
      progressConfidence: entities.extractedProgress !== null ? 90 : 50
    };

    // Determine target progress to apply
    let targetProgress = act.progress;
    if (entities.extractedProgress !== null) {
      targetProgress = entities.extractedProgress;
    } else if (entities.isCompletedMention) {
      targetProgress = 100;
    }

    // Dynamic reasoning generator
    const reasoningParts: string[] = [];
    if (semanticMatch > 75) reasoningParts.push(`High semantic match on activity terms ("${act.name}")`);
    else if (semanticMatch > 40) reasoningParts.push(`Moderate keyword overlap with "${act.name}"`);
    else reasoningParts.push(`Low keyword similarity`);

    if (locationMatch >= 90) reasoningParts.push(`Exact location match for ${act.zone}`);
    else if (locationMatch <= 20) reasoningParts.push(`Zone mismatch (Report mentions different zone)`);

    if (entities.extractedProgress !== null) {
      reasoningParts.push(`Extracted ${entities.extractedProgress}% target progress`);
    }

    const isHighConfidence = overallConfidence >= 78;

    return {
      activity: act,
      overallConfidence,
      subScores,
      extractedProgress: targetProgress,
      extractedEntities: entities,
      reasoning: reasoningParts.join('. ') + '.',
      isHighConfidence
    };
  });

  // Sort descending by overall confidence score
  return results.sort((a, b) => b.overallConfidence - a.overallConfidence);
}
