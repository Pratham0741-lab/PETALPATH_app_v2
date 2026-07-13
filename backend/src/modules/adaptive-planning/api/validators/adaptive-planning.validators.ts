import { z } from 'zod';
import { RoadmapSectionType, LearningDebtType, ReinforcementQueueStatus, PracticeType } from '../../domain/value-objects/planning-types.js';

export const createRoadmapSchema = z.object({
  forceRegenerate: z.boolean().optional(),
});

export const getRoadmapSchema = z.object({
  version: z.number().int().optional(),
});

export const getRoadmapItemsSchema = z.object({
  sectionType: z.nativeEnum(RoadmapSectionType).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createLearningDebtSchema = z.object({
  topicId: z.string().uuid(),
  modality: z.string().optional(),
  debtType: z.nativeEnum(LearningDebtType),
  severity: z.number().min(0).max(1),
  description: z.string().min(1),
});

export const getLearningDebtsSchema = z.object({
  topicId: z.string().uuid().optional(),
  resolved: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const resolveDebtSchema = z.object({
  debtId: z.string().uuid(),
});

export const getReinforcementQueuesSchema = z.object({
  status: z.nativeEnum(ReinforcementQueueStatus).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createPracticeSchema = z.object({
  topicId: z.string().uuid(),
  modality: z.string().optional(),
  type: z.nativeEnum(PracticeType),
  scheduledFor: z.coerce.date(),
  debtId: z.string().uuid().optional(),
});

export const getPracticesSchema = z.object({
  topicId: z.string().uuid().optional(),
  type: z.nativeEnum(PracticeType).optional(),
  completed: z.coerce.boolean().optional(),
  debtId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const getRecoveryModeSchema = z.object({
});

export const createRecoveryModeSchema = z.object({}).optional();

export const resolveRecoverySchema = z.object({
});

export const getAdaptiveConstraintsSchema = z.object({
  activeOnly: z.coerce.boolean().optional(),
});

export const createAdaptiveConstraintSchema = z.object({
  type: z.string(),
  name: z.string().min(1),
  value: z.record(z.unknown()),
  priority: z.coerce.number().int().min(1).max(10).default(1),
});

export const createSessionPlanSchema = z.object({
  durationMinutes: z.coerce.number().int().min(5).max(60),
  roadmapId: z.string().uuid().optional(),
});

export const getSessionPlanSchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const getSessionPlanByIdSchema = z.object({
  sessionPlanId: z.string().uuid(),
});

export const sessionPlanActionSchema = z.object({
  sessionPlanId: z.string().uuid(),
});

export const getSessionBlocksSchema = z.object({
  sessionPlanId: z.string().uuid(),
});

export const completeBlockSchema = z.object({
  sessionPlanId: z.string().uuid(),
  blockId: z.string().uuid(),
});

export const skipBlockSchema = z.object({
  sessionPlanId: z.string().uuid(),
  blockId: z.string().uuid(),
});

export const getNextRecommendationSchema = z.object({
});

export const getPracticeRecommendationSchema = z.object({
});

export const getAdaptiveRecommendationSchema = z.object({
});

export const getRecoveryRecommendationSchema = z.object({
});

export type CreateRoadmapInput = z.infer<typeof createRoadmapSchema>;
export type GetRoadmapInput = z.infer<typeof getRoadmapSchema>;
export type GetRoadmapItemsInput = z.infer<typeof getRoadmapItemsSchema>;
export type CreateLearningDebtInput = z.infer<typeof createLearningDebtSchema>;
export type GetLearningDebtsInput = z.infer<typeof getLearningDebtsSchema>;
export type ResolveDebtInput = z.infer<typeof resolveDebtSchema>;
export type GetReinforcementQueuesInput = z.infer<typeof getReinforcementQueuesSchema>;
export type CreatePracticeInput = z.infer<typeof createPracticeSchema>;
export type GetPracticesInput = z.infer<typeof getPracticesSchema>;
export type GetRecoveryModeInput = z.infer<typeof getRecoveryModeSchema>;
export type CreateRecoveryModeInput = z.infer<typeof createRecoveryModeSchema>;
export type ResolveRecoveryInput = z.infer<typeof resolveRecoverySchema>;
export type GetAdaptiveConstraintsInput = z.infer<typeof getAdaptiveConstraintsSchema>;
export type CreateAdaptiveConstraintInput = z.infer<typeof createAdaptiveConstraintSchema>;
export type CreateSessionPlanInput = z.infer<typeof createSessionPlanSchema>;
export type GetSessionPlanInput = z.infer<typeof getSessionPlanSchema>;
export type GetSessionPlanByIdInput = z.infer<typeof getSessionPlanByIdSchema>;
export type SessionPlanActionInput = z.infer<typeof sessionPlanActionSchema>;
export type GetSessionBlocksInput = z.infer<typeof getSessionBlocksSchema>;
export type CompleteBlockInput = z.infer<typeof completeBlockSchema>;
export type SkipBlockInput = z.infer<typeof skipBlockSchema>;
export type GetNextRecommendationInput = z.infer<typeof getNextRecommendationSchema>;
export type GetPracticeRecommendationInput = z.infer<typeof getPracticeRecommendationSchema>;
export type GetAdaptiveRecommendationInput = z.infer<typeof getAdaptiveRecommendationSchema>;
export type GetRecoveryRecommendationInput = z.infer<typeof getRecoveryRecommendationSchema>;