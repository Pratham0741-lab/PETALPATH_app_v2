import { z } from 'zod';
import { BASELINE_DOMAINS, BASELINE_GRADES } from './baseline.types.js';

const DomainSchema = z.enum(BASELINE_DOMAINS);

const DomainResultSchema = z
  .object({
    level: z.number().int().min(0).max(3),
    confidence: z.enum(['high', 'low']),
  })
  .strict();

/**
 * Body of POST /children/:childId/baseline. `.strict()` everywhere: unknown
 * fields are rejected, not ignored, so nothing beyond the pseudonymous result
 * (no name, photo, voice, birth date) can be stored through this endpoint.
 */
export const BaselineBodySchema = z
  .object({
    child_id: z.string().uuid().optional(),
    assessed_at: z.string().datetime({ offset: true }),
    grade: z.enum(BASELINE_GRADES),
    // A domain with no data (stopped early, or not in the item bank) is
    // simply absent.
    domains: z
      .record(DomainSchema, DomainResultSchema)
      .refine((d) => Object.keys(d).every((k) => (BASELINE_DOMAINS as readonly string[]).includes(k)), {
        message: 'Unknown domain',
      }),
    strengths: z.array(DomainSchema).max(BASELINE_DOMAINS.length),
    focus_areas: z.array(DomainSchema).max(BASELINE_DOMAINS.length),
    skipped: z.boolean(),
  })
  .strict()
  .superRefine((b, ctx) => {
    if (b.skipped && Object.keys(b.domains).length > 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A skipped baseline has no domain results', path: ['domains'] });
    }
    for (const list of ['strengths', 'focus_areas'] as const) {
      if (new Set(b[list]).size !== b[list].length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate domain in ${list}`, path: [list] });
      }
      for (const d of b[list]) {
        if (!(d in b.domains)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${list} names a domain with no result`, path: [list] });
        }
      }
    }
  });

export type BaselineBody = z.infer<typeof BaselineBodySchema>;

export const ConsentBodySchema = z
  .object({
    version: z.string().trim().min(1).max(32),
  })
  .strict();
