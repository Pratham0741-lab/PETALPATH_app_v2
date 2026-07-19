export interface GradeMetadata {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export interface Activity {
  readonly type: string;
  readonly difficulty: number;
  readonly estimated_minutes: number;
  readonly repeatable: boolean;
}

export interface NodeReward {
  readonly xp: number;
  readonly coins: number;
}

export interface NodeMastery {
  readonly required_score: number;
  readonly attempts: number;
}

export interface NodeCurriculumDetails {
  readonly subject: string;
  readonly month: string;
  readonly learning_outcome: string;
  readonly original_topic: string;
}

export interface AssessmentQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly questionType: 'MULTIPLE_CHOICE' | 'SCALE' | 'TEXT' | 'BOOLEAN';
  readonly options?: readonly { readonly label: string; readonly value: string }[];
  readonly maxScore: number;
  readonly correctAnswer?: string;
}

export interface LessonAssessment {
  readonly id: string; // Matches the lessonId
  readonly title: string;
  readonly description?: string;
  readonly estimatedMinutes: number;
  readonly questions: readonly AssessmentQuestion[];
}

export interface CurriculumNode {
  readonly id: string;
  readonly title: string;
  readonly order: number;
  readonly difficulty: number;
  readonly estimated_minutes: number;
  readonly prerequisites: readonly string[];
  readonly activities: readonly Activity[];
  readonly reward: NodeReward;
  readonly mastery: NodeMastery;
  readonly curriculum: NodeCurriculumDetails;
  readonly assessment?: LessonAssessment;
}

export interface CurriculumTheme {
  readonly id: string;
  readonly title: string;
  readonly order: number;
  readonly nodes: readonly CurriculumNode[];
}

export interface GradeCurriculum {
  readonly grade: GradeMetadata;
  readonly themes: readonly CurriculumTheme[];
}
