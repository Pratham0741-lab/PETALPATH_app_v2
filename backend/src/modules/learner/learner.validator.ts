/**
 * Learner endpoint validators (Zod).
 *
 * Phase 1 endpoints have no request body — only URL params. The schemas
 * exist so later phases can extend them without changing the controller.
 */

import { z } from 'zod';

export const childIdParamSchema = z.object({
  childId: z.string().uuid('childId must be a UUID'),
});
