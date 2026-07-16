export interface SkillSearchFilters {
  query?: string;
  subjectId?: string;
  domainId?: string;
  bloomLevel?: string;
  difficulty?: number;
  estimatedAge?: number;
  originalGrade?: number;
  originalMonth?: number;
  isCoreSkill?: boolean;
  isRootSkill?: boolean;
  tags?: string[];
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SkillSearchResult {
  id: string;
  name: string;
  description: string | null;
  subjectId: string;
  subjectName: string;
  domainId: string | null;
  domainName: string | null;
  difficulty: number;
  bloomLevel: string;
  displayOrder: number;
  isCoreSkill: boolean;
  isRootSkill: boolean;
  originalGrade: number | null;
  tags: string[];
  masteryThreshold: number;
  estimatedDuration: number;
}

export interface SkillDetailResult {
  id: string;
  name: string;
  description: string | null;
  subjectId: string;
  subject: { id: string; name: string };
  domainId: string | null;
  domain: { id: string; name: string } | null;
  difficulty: number;
  estimatedAge: number | null;
  isRootSkill: boolean;
  bloomLevel: string;
  masteryThreshold: number;
  estimatedDuration: number;
  recommendedActivityType: string | null;
  recommendedAssessmentType: string | null;
  revisionInterval: number;
  originalGrade: number | null;
  originalMonth: number | null;
  displayOrder: number;
  isCoreSkill: boolean;
  isOptionalSkill: boolean;
  learningObjective: string | null;
  tags: { id: string; tag: string }[];
  activities: { id: string; title: string; activityType: string; contentUrl: string | null; description: string | null; displayOrder: number }[];
  assessments: { id: string; title: string; assessmentType: string; description: string | null; maxScore: number; passingScore: number }[];
  parentDependencies: { id: string; parentSkillId: string; parentSkillName: string; weight: number }[];
  childDependencies: { id: string; childSkillId: string; childSkillName: string; weight: number }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CurriculumTreeResult {
  grade: { id: string; gradeNumber: number; title: string };
  subjects: {
    id: string;
    name: string;
    domains: {
      id: string;
      name: string;
      skills: SkillSearchResult[];
    }[];
  }[];
}
