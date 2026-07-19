import { z } from 'zod';

export const classroomIdParamSchema = z.object({
  classroomId: z.string().uuid('Invalid classroom ID format'),
});

export const classroomLearnerParamSchema = z.object({
  classroomId: z.string().uuid('Invalid classroom ID format'),
  childId: z.string().uuid('Invalid child ID format'),
});
