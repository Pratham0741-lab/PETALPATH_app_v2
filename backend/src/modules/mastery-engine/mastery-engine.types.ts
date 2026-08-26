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
  /**
   * Whether MASTERED has been *earned* — full coverage of the lesson's
   * activities across the number of separate practice sessions the curriculum
   * asks for (`CurriculumNode.mastery.attempts`).
   *
   * Omitted or `true` keeps the previous behaviour. When explicitly `false` the
   * mastery score is clamped just below the MASTERED threshold, so a single
   * lucky three-star run can reach STRONG but cannot skip the spaced repetition
   * that turns a good day into a retained skill.
   */
  masteryProven?: boolean;
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
  /**
   * Set when the evaluation ran inside a caller's transaction and something was
   * unlocked. The roadmap refresh uses its own client, so it must happen after
   * the caller commits — the caller owns that call rather than this service.
   */
  pendingRoadmapRefresh?: boolean;
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
