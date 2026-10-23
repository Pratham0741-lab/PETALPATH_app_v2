import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import type { BaselineBody } from './baseline.validators.js';

export class BaselineRepository {
  async findByChildId(childId: string) {
    return prisma.childBaseline.findUnique({ where: { childId } });
  }

  /** One baseline per child: a re-submission replaces the previous one. */
  async upsert(childId: string, body: BaselineBody) {
    const data = {
      assessedAt: new Date(body.assessed_at),
      grade: body.grade,
      domains: body.domains as Prisma.InputJsonValue,
      strengths: body.strengths as Prisma.InputJsonValue,
      focusAreas: body.focus_areas as Prisma.InputJsonValue,
      skipped: body.skipped,
    };
    const existing = await this.findByChildId(childId);
    const row = await prisma.childBaseline.upsert({
      where: { childId },
      create: { childId, ...data },
      update: data,
    });
    return { row, created: !existing };
  }

  async findChild(childId: string) {
    return prisma.child.findFirst({ where: { id: childId, deletedAt: null } });
  }

  async recordConsent(userId: string, version: string, at: Date) {
    return prisma.user.update({
      where: { id: userId },
      data: { parentalConsentVersion: version, parentalConsentAt: at },
      select: { parentalConsentVersion: true, parentalConsentAt: true },
    });
  }
}

export const baselineRepository = new BaselineRepository();
