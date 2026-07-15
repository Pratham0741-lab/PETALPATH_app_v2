import { AssessmentQuestionType } from '@prisma/client';

export interface CreateQuestionInput {
  prompt: string;
  questionType: AssessmentQuestionType;
  options?: Array<{ label: string; value: string }> | null;
  order?: number;
  maxScore?: number;
  correctAnswer?: string | null;
}

export interface CreateAssessmentInput {
  title: string;
  description?: string | null;
  ageGroup?: string | null;
  estimatedMinutes?: number;
  thumbnail?: string | null;
  isActive?: boolean;
  questions: CreateQuestionInput[];
}

export interface AssessmentResponseInput {
  questionId: string;
  answer: string;
}

export interface StartAttemptInput {
  assessmentId: string;
}

export interface SubmitAttemptInput {
  responses: AssessmentResponseInput[];
}
