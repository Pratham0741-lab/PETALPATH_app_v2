export interface PlacementQuestionConfig {
  skillId: string;
  choices?: Array<{ label: string; value: string }>;
}

export interface PlacementQuestion {
  id: string;
  prompt: string;
  questionType: string;
  config: PlacementQuestionConfig;
  order: number;
  maxScore: number;
}

export interface PlacementQuestionnaire {
  assessmentId: string;
  title: string;
  description: string | null;
  estimatedMinutes: number;
  totalQuestions: number;
  questions: PlacementQuestion[];
}

export interface SubmitAnswerInput {
  attemptId: string;
  questionId: string;
  answer: string;
}

export interface SkillAssessmentResult {
  skillId: string;
  skillName: string;
  skillCode: string;
  correctCount: number;
  totalCount: number;
  accuracy: number;
  mastery: 'MASTERED' | 'LEARNING' | 'WEAK' | 'NOT_ASSESSED';
}

export interface PrerequisiteGap {
  skillId: string;
  skillName: string;
  skillCode: string;
  dependentOn: { skillId: string; skillName: string; skillCode: string }[];
}

export interface PlacementResult {
  childId: string;
  assessmentId: string;
  attemptId: string;
  assessedSkills: SkillAssessmentResult[];
  prerequisiteGaps: PrerequisiteGap[];
  masteredCount: number;
  weakCount: number;
  learningCount: number;
  startingSkillId: string | null;
  startingSkillName: string | null;
  revisionQueueCount: number;
  curriculumInitialized: boolean;
  roadmapGenerated: boolean;
}

export interface PlacementProgress {
  attemptId: string;
  assessmentId: string;
  totalQuestions: number;
  answeredQuestions: number;
  currentQuestionIndex: number;
  currentQuestion: PlacementQuestion | null;
  isComplete: boolean;
}

export enum AgeGroup {
  PRE_NURSERY = 'PRE_NURSERY',
  NURSERY = 'NURSERY',
  LKG = 'LKG',
  UKG = 'UKG',
}
