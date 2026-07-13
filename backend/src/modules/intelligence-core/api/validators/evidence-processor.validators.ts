import { z } from 'zod';

export const processEvidenceSchema = z.object({
  childId: z.string().uuid(),
  events: z.array(z.record(z.unknown())),
  evidence: z.array(z.record(z.unknown())),
});

export const getMetricSnapshotsSchema = z.object({
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ProcessEvidenceInput = z.infer<typeof processEvidenceSchema>;
export type GetMetricSnapshotsInput = z.infer<typeof getMetricSnapshotsSchema>;