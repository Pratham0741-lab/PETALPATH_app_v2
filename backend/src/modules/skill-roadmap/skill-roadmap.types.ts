export interface RoadmapSkill {
  skillId: string;
  name: string;
  skillCode: string;
  subjectId: string;
  difficulty: number;
  displayOrder: number;
  estimatedDuration: number;
  isCoreSkill: boolean;
  isOptionalSkill: boolean;
  masteryState: string;
  knowledgeScore: number;
  confidenceScore: number;
  retentionScore: number;
  masteryScore: number;
  priorityScore: number;
  unlockRatio: number;
  dependencyDepth: number;
  prerequisites: string[];
  nextReviewDate: string | null;
  lastPracticed: string | null;
  reason?: string;
}

export interface RoadmapSection {
  type: 'MASTERED' | 'REVIEW' | 'AVAILABLE' | 'LOCKED' | 'FUTURE';
  title: string;
  skills: RoadmapSkill[];
}

export interface DailyQueueItem {
  skillId: string;
  name: string;
  section: string;
  priorityScore: number;
}

export interface NextSkillInfo {
  skillId: string;
  name: string;
  reason: string;
}

export interface RoadmapMetadata {
  totalSkills: number;
  masteredCount: number;
  reviewCount: number;
  availableCount: number;
  lockedCount: number;
  futureCount: number;
  dailyQueue: DailyQueueItem[];
  nextSkill: NextSkillInfo | null;
}

export interface AdaptiveRoadmap {
  childId: string;
  generatedAt: string;
  version: number;
  sections: RoadmapSection[];
  metadata: RoadmapMetadata;
}

export interface NextSkillResponse {
  skillId: string;
  name: string;
  skillCode: string;
  reason: string;
  priorityScore: number;
  estimatedDuration: number;
  prerequisites: string[];
  subjectId: string;
  masteryState: string;
  knowledgeScore: number;
}

export interface RefreshTrigger {
  trigger: 'PLACEMENT_COMPLETE' | 'SKILL_MASTERED' | 'REVISION_COMPLETED' | 'CURRICULUM_UPDATED' | 'MANUAL';
}
