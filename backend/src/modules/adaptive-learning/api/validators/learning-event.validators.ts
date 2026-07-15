import { z } from 'zod';
import { LearningEventType, Modality } from '../../domain/value-objects/event-types.js';

export const createLearningEventSchema = z.object({
  eventId: z.string().uuid().optional(),
  eventType: z.nativeEnum(LearningEventType),
  eventVersion: z.number().int().min(1).default(1),
  sessionId: z.string().uuid(),
  curriculumId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  moduleId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  conceptId: z.string().uuid().optional(),
  activityId: z.string().uuid().optional(),
  modality: z.nativeEnum(Modality).optional(),
  timestamp: z.coerce.date().optional(),
  duration: z.number().int().nonnegative().optional(),
  payload: z.record(z.unknown()).optional(),
  idempotencyKey: z.string().min(1).optional(),
});

export const getEventsByChildSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const getEvidenceByChildSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateLearningEventInput = z.infer<typeof createLearningEventSchema>;
export type GetEventsByChildInput = z.infer<typeof getEventsByChildSchema>;
export type GetEvidenceByChildInput = z.infer<typeof getEvidenceByChildSchema>;