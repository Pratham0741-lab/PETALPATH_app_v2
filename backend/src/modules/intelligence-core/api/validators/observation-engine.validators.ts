import { z } from 'zod';
import { LearningEventType, Modality } from '../../domain/value-objects/intelligence-types.js';

export const createObservationEventSchema = z.object({
  eventType: z.nativeEnum(LearningEventType),
  sessionId: z.string().uuid(),
  topicId: z.string().uuid(),
  activityId: z.string().uuid(),
  modality: z.nativeEnum(Modality).optional(),
  payload: z.record(z.unknown()),
});

export const getTopicStatesSchema = z.object({
  topicId: z.string().uuid().optional(),
  state: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateObservationEventInput = z.infer<typeof createObservationEventSchema>;
export type GetTopicStatesInput = z.infer<typeof getTopicStatesSchema>;