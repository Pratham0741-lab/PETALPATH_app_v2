export interface EvaluateMasteryInput {
  childId: string;
  skillId: string;
  accuracy: number;
  responseTime: number;
  attempts: number;
  retries: number;
  engagementScore: number;
  helpRequests: number;
  sessionDuration: number;
  timestamp?: string;
}

export interface MasteryEvaluationResult {
  skillId: string;
  previousState: string | null;
  currentState: string;
  masteryScore: number;
  knowledgeScore: number;
  confidenceScore: number;
  retentionScore: number;
  consistencyScore: number;
  previousMasteryScore: number | null;
  masteryScoreDelta: number;
  isRegression: boolean;
  isNewMastery: boolean;
  unlockedSkills: string[];
  nextReviewDate: string;
}

export interface MasteryRecalculateInput {
  childId: string;
  skillId: string;
}

export interface ProcessRevisionInput {
  childId: string;
  skillId: string;
  accuracy: number;
  responseTime: number;
  attempts: number;
  retries: number;
  engagementScore: number;
  helpRequests: number;
  sessionDuration: number;
  timestamp?: string;
}

export interface RevisionQueueItem {
  skillId: string;
  skillName: string;
  masteryState: string;
  priority: number;
  reason: string;
  nextReviewDate: string;
}

export interface SkillHistoryEntry {
  id: string;
  knowledgeScore: number;
  confidenceScore: number;
  retentionScore: number;
  engagementScore: number;
  consistencyScore: number;
  masteryScore: number;
  masteryState: string;
  timestamp: string;
}
