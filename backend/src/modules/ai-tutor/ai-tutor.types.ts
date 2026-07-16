export interface StartSessionInput {
  childId: string;
  durationMinutes: number;
}

export interface ResumeSessionInput {
  childId: string;
  sessionId: string;
}

export interface EndSessionInput {
  childId: string;
  sessionId: string;
}

export interface RecordProgressInput {
  childId: string;
  sessionId: string;
  blockId: string;
  skillId: string;
  accuracy: number;
  responseTime: number;
  attempts: number;
  retries: number;
  engagementScore: number;
  helpRequests: number;
  sessionDuration: number;
}

export interface SessionResult {
  sessionId: string;
  status: string;
  blocks: SessionBlockResult[];
  startedAt: string | null;
  completedAt: string | null;
}

export interface SessionBlockResult {
  id: string;
  skillId: string | null;
  skillName: string | null;
  activityType: string;
  difficulty: string;
  status: string;
  position: number;
  isReinforcement: boolean;
  estimatedMinutes: number;
}

export interface NextActivityResponse {
  blockId: string;
  skillId: string | null;
  skillName: string | null;
  activityType: string;
  difficulty: string;
  estimatedMinutes: number;
  sessionId: string;
}

export interface ProgressResult {
  blockId: string;
  blockStatus: string;
  masteryResult: {
    skillId: string;
    masteryState: string;
    masteryScore: number;
    isNewMastery: boolean;
    unlockedSkills: string[];
  } | null;
  sessionComplete: boolean;
}
