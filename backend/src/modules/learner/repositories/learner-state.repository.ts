/**
 * LearnerState Repository
 *
 * Prisma access layer for the LearnerState materialized read model.
 * Follows the same pattern as adaptive/repositories/learning-profile.repository.ts.
 */

import { prisma } from '../../../config/database.js';
import type { Prisma, LearnerState } from '@prisma/client';

export class LearnerStateRepository {
  async findByChildId(childId: string): Promise<LearnerState | null> {
    return prisma.learnerState.findUnique({
      where: { childId },
    });
  }

  /**
   * Upsert the aggregate state row for a child and bump `version`.
   * The `version` field is used by clients for optimistic concurrency /
   * ETag-style revalidation.
   */
  async upsert(childId: string, data: Prisma.LearnerStateUpdateInput): Promise<LearnerState> {
    // Assemble the create-branch input. Spread the shared fields FIRST so
    // the explicit `child` relation is not overwritten.
    const createData = {
      ...(data as Prisma.LearnerStateCreateInput),
      child: { connect: { id: childId } },
    } as Prisma.LearnerStateCreateInput;

    return prisma.learnerState.upsert({
      where: { childId },
      update: {
        ...data,
        version: { increment: 1 },
      },
      create: createData,
    });
  }

  async deleteByChildId(childId: string): Promise<void> {
    await prisma.learnerState.deleteMany({ where: { childId } });
  }
}

export const learnerStateRepository = new LearnerStateRepository();
