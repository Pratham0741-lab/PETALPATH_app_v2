import { z } from 'zod';

export const refreshRoadmapSchema = z.object({
  trigger: z.enum(['PLACEMENT_COMPLETE', 'SKILL_MASTERED', 'REVISION_COMPLETED', 'CURRICULUM_UPDATED', 'MANUAL']).optional(),
});

export const sectionParamSchema = z.object({
  section: z.enum(['MASTERED', 'REVIEW', 'AVAILABLE', 'LOCKED', 'FUTURE']),
});
