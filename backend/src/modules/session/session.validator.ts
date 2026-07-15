/**
 * Session endpoint validators (Zod).
 */

import { z } from 'zod';

export const sessionIdParamSchema = z.object({
  id: z.string().uuid('session id must be a UUID'),
});

export const childIdQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(20),
});
