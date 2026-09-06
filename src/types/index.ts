export type ActivityStatus = 'not_started' | 'in_progress' | 'delayed' | 'completed';

export interface Activity {
  id: string;
  name: string;
  zone: string;
  plannedStart: string; // YYYY-MM-DD
  plannedEnd: string;   // YYYY-MM-DD
  progress: number;     // 0 - 100
  status: ActivityStatus;
  category?: string;
  unit?: string;
  targetQuantity?: number;
  completedQuantity?: number;
}

export interface SubScores {
  semanticMatch: number;   // 0 - 100
  locationMatch: number;   // 0 - 100
  datePlausibility: number;// 0 - 100
  progressConfidence: number; // 0 - 100
}

export interface ExtractedEntities {
  activityNameKeywords: string[];
  zoneKeyword: string | null;
  extractedProgress: number | null; // e.g. 60 from "60% done"
  isCompletedMention: boolean;     // e.g. "finished today"
  isDelayMention: boolean;         // e.g. "delayed", "shortage"
  extractedDate: string | null;
  extractedNotes: string;
}

export interface MatchResult {
  activity: Activity;
  overallConfidence: number; // 0 - 100
  subScores: SubScores;
  extractedProgress: number; // Suggested progress % to apply
  extractedEntities: ExtractedEntities;
  reasoning: string;
  isHighConfidence: boolean;
}

export type ApprovalStatus = 'auto_approved' | 'manually_approved' | 'corrected' | 'rejected';

export interface AuditRecord {
  id: string;
  timestamp: string;
  reportText: string;
  matchedActivityId: string;
  matchedActivityName: string;
  matchedZone: string;
  previousProgress: number;
  newProgress: number;
  confidenceScore: number;
  subScores: SubScores;
  status: ApprovalStatus;
  notes?: string;
}

export interface SchedulePreset {
  id: string;
  title: string;
  description: string;
  activities: Activity[];
}
