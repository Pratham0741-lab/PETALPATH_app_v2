import { z } from 'zod';
import { LearningEventType, Modality } from '../../domain/value-objects/intelligence-types.js';

export const observeEventSchema = z.object({
  eventType: z.nativeEnum(LearningEventType),
  sessionId: z.string().uuid(),
  topicId: z.string().uuid(),
  activityId: z.string().uuid(),
  modality: z.nativeEnum(Modality).optional(),
  payload: z.record(z.unknown()),
});

export const getTopicStatesSchema = z.object({
  childId: z.string().uuid(),
});

export const getKnowledgeStatesSchema = z.object({
  childId: z.string().uuid(),
});

export const classifyChildSchema = z.object({
  childId: z.string().uuid(),
});

export type ObserveEventInput = z.infer<typeof observeEventSchema>;
export type GetTopicStatesInput = z.infer<typeof getTopicStatesSchema>;
export type GetKnowledgeStatesInput = z.infer<typeof getKnowledgeStatesSchema>;
export type ClassifyChildInput = z.infer<typeof classifyChildSchema>;