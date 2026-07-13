import { prisma } from '../../../../config/database.js';
import { RecoveryMode } from '../../domain/entities/recovery-mode.entity.js';
import { IRecoveryModeRepository } from '../../domain/repositories/repository-interfaces.js';

function mapToEntity(data: any): RecoveryMode {
  return new RecoveryMode({
    id: data.id,
    childId: data.childId,
    status: data.status,
    triggerReason: data.triggerReason,
    enteredAt: data.enteredAt,
    resolvedAt: data.resolvedAt ?? undefined,
    effortTierDrop: data.effortTierDrop,
    minTopicsAtTier: data.minTopicsAtTier,
    currentTier: data.currentTier,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
}

export class RecoveryModeRepository implements IRecoveryModeRepository {
  async create(recoveryMode: RecoveryMode): Promise<RecoveryMode> {
    const created = await prisma.recoveryMode.create({
      data: recoveryMode.toPrismaCreate(),
    });
    return mapToEntity(created);
  }

  async findByChildId(childId: string): Promise<RecoveryMode | null> {
    const data = await prisma.recoveryMode.findUnique({ where: { childId } });
    return data ? mapToEntity(data) : null;
  }

  async findActiveByChildId(childId: string): Promise<RecoveryMode | null> {
    const data = await prisma.recoveryMode.findFirst({
      where: { childId, status: 'ACTIVE' },
    });
    return data ? mapToEntity(data) : null;
  }

  async update(recoveryMode: RecoveryMode): Promise<RecoveryMode> {
    const updated = await prisma.recoveryMode.update({
      where: { id: recoveryMode.id },
      data: recoveryMode.toPrismaUpdate(),
    });
    return mapToEntity(updated);
  }
}