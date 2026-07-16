import { z } from 'zod';

const bloomLevels = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'] as const;

export const searchSkillsSchema = z.object({
  query: z.string().optional(),
  subjectId: z.string().uuid().optional(),
  domainId: z.string().uuid().optional(),
  bloomLevel: z.enum(bloomLevels).optional(),
  difficulty: z.coerce.number().int().min(1).optional(),
  estimatedAge: z.coerce.number().int().optional(),
  originalGrade: z.coerce.number().int().optional(),
  originalMonth: z.coerce.number().int().min(1).max(12).optional(),
  isCoreSkill: z.coerce.boolean().optional(),
  isRootSkill: z.coerce.boolean().optional(),
  tags: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createCurriculumGradeSchema = z.object({
  gradeNumber: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
});

export const updateCurriculumGradeSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

export const createCurriculumDomainSchema = z.object({
  name: z.string().min(1),
  subjectId: z.string().uuid(),
  description: z.string().optional(),
  displayOrder: z.number().int().min(0).default(0),
});

export const updateCurriculumDomainSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const skillIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const createSkillTagSchema = z.object({
  tag: z.string().min(1).max(50),
});

export const deleteSkillTagSchema = z.object({
  tagId: z.string().uuid(),
});

export const createSkillActivitySchema = z.object({
  title: z.string().min(1),
  activityType: z.string().min(1),
  contentUrl: z.string().url().optional(),
  description: z.string().optional(),
  displayOrder: z.number().int().min(0).default(0),
});

export const updateSkillActivitySchema = z.object({
  title: z.string().min(1).optional(),
  activityType: z.string().min(1).optional(),
  contentUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const createSkillAssessmentSchema = z.object({
  title: z.string().min(1),
  assessmentType: z.string().min(1),
  description: z.string().optional(),
  maxScore: z.number().positive().default(100),
  passingScore: z.number().positive().default(80),
});

export const updateSkillAssessmentSchema = z.object({
  title: z.string().min(1).optional(),
  assessmentType: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  maxScore: z.number().positive().optional(),
  passingScore: z.number().positive().optional(),
});

export const domainBySubjectSchema = z.object({
  subjectId: z.string().uuid(),
});
