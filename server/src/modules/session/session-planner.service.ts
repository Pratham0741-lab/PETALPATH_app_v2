import { prisma } from '../../config/database.js';
import {
  SessionStatus,
  SessionBlockStatus,
  SessionEventType,
  DifficultyLevel,
  ActivityType,
  MasteryState,
} from '../../shared/enums.js';
import { sessionTemplateRepository } from './repositories/session-template.repository.js';
import { sessionPlanRepository } from './repositories/session-plan.repository.js';
import { sessionBlockRepository } from './repositories/session-block.repository.js';
import { sessionEventRepository } from './repositories/session-event.repository.js';
import { curriculumEngineService } from '../curriculum/curriculum-engine.service.js';
import { reinforcementEngineService } from '../reinforcement/reinforcement-engine.service.js';
import { learningProfileRepository } from '../adaptive/repositories/learning-profile.repository.js';
import { skillHealthRepository } from '../mastery/repositories/skill-health.repository.js';
import { logger } from '../../utils/logger.js';

export class SessionPlannerService {
  // ──────────────────────────────────────────────
  //  SEED DEFAULT TEMPLATES
  // ──────────────────────────────────────────────

  /**
   * Seeds the default 10, 15, and 20-minute templates if none exist.
   */
  async seedTemplatesIfNeeded() {
    const templates = await sessionTemplateRepository.findAll();
    if (templates.length > 0) return;

    logger.info('Seeding default session templates...');

    // 10-minute template: Warmup -> Video -> Game -> Reward
    await sessionTemplateRepository.create({
      name: '10-minute template',
      durationMinutes: 10,
      blockSequence: [
        { activityType: ActivityType.WARMUP, estimatedMinutes: 2 },
        { activityType: ActivityType.VIDEO, estimatedMinutes: 3 },
        { activityType: ActivityType.GAME, estimatedMinutes: 4 },
        { activityType: ActivityType.REWARD, estimatedMinutes: 1 },
      ],
    });

    // 15-minute template: Warmup -> Video -> Speaking -> Game -> Reward
    await sessionTemplateRepository.create({
      name: '15-minute template',
      durationMinutes: 15,
      blockSequence: [
        { activityType: ActivityType.WARMUP, estimatedMinutes: 2 },
        { activityType: ActivityType.VIDEO, estimatedMinutes: 3 },
        { activityType: ActivityType.SPEAKING, estimatedMinutes: 4 },
        { activityType: ActivityType.GAME, estimatedMinutes: 5 },
        { activityType: ActivityType.REWARD, estimatedMinutes: 1 },
      ],
    });

    // 20-minute template: Warmup -> Video -> Game -> Story -> Speaking -> Reward
    await sessionTemplateRepository.create({
      name: '20-minute template',
      durationMinutes: 20,
      blockSequence: [
        { activityType: ActivityType.WARMUP, estimatedMinutes: 2 },
        { activityType: ActivityType.VIDEO, estimatedMinutes: 4 },
        { activityType: ActivityType.GAME, estimatedMinutes: 5 },
        { activityType: ActivityType.STORY, estimatedMinutes: 5 },
        { activityType: ActivityType.SPEAKING, estimatedMinutes: 3 },
        { activityType: ActivityType.REWARD, estimatedMinutes: 1 },
      ],
    });

    logger.info('Session templates seeded successfully.');
  }

  // ──────────────────────────────────────────────
  //  SESSION PLANNING ALGORITHMS
  // ──────────────────────────────────────────────

  /**
   * priority = 0.4 × curriculumPriority + 0.3 × reinforcementPriority + 0.2 × modalityFit + 0.1 × recencyFactor
   */
  calculatePriority(
    curriculumPriority: number,
    reinforcementPriority: number,
    isPreferredModality: boolean,
    lastPracticedDaysAgo: number
  ): number {
    const modalityFit = isPreferredModality ? 100.0 : 50.0;
    // Decays priority if practiced recently; boosts if never practiced (100) or practiced long ago
    const recencyFactor = Math.min(100.0, lastPracticedDaysAgo * 10.0);

    const priority =
      0.4 * curriculumPriority +
      0.3 * reinforcementPriority +
      0.2 * modalityFit +
      0.1 * recencyFactor;

    return Math.round(priority * 100) / 100;
  }

  /**
   * Estimates block count based on child's age group.
   */
  getBlockCountForAge(age: number): number {
    if (age <= 3) return 4;
    if (age <= 5) return 5;
    return 6;
  }

  /**
   * Estimates individual block difficulty based on session position and length.
   */
  calculateDifficultyCurve(position: number, totalBlocks: number): DifficultyLevel {
    if (position === 0) return DifficultyLevel.EASY; // Warmup
    if (position === totalBlocks - 1) return DifficultyLevel.EASY; // Reward/Cool-down

    const ratio = position / totalBlocks;
    if (ratio < 0.4) {
      return DifficultyLevel.EASY;
    } else if (ratio < 0.8) {
      return DifficultyLevel.MEDIUM;
    } else {
      return DifficultyLevel.HARD;
    }
  }

  /**
   * Validates target session constraints:
   * - reinforcement ratio <= 30%
   * - same subject count <= 2
   * - same modality consecutive <= 1 (no consecutive duplicates)
   */
  validateSession(blocks: any[]): boolean {
    let reinforcementCount = 0;
    const subjectCounts: Record<string, number> = {};

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // Reinforcement count check
      if (block.isReinforcement) {
        reinforcementCount++;
      }

      // Subject count check
      if (block.subjectId) {
        subjectCounts[block.subjectId] = (subjectCounts[block.subjectId] ?? 0) + 1;
        if (subjectCounts[block.subjectId] > 2) {
          logger.warn(`Subject constraint violated: Subject ${block.subjectId} used ${subjectCounts[block.subjectId]} times.`);
          return false;
        }
      }

      // Modality consecutive check
      if (i > 0 && block.activityType !== ActivityType.REWARD && block.activityType !== ActivityType.WARMUP) {
        const prevBlock = blocks[i - 1];
        if (prevBlock.activityType === block.activityType) {
          logger.warn(`Modality rotation constraint violated: Consecutive duplicates for ${block.activityType}.`);
          return false;
        }
      }
    }

    const reinforcementRatio = reinforcementCount / blocks.length;
    if (reinforcementRatio > 0.3) {
      logger.warn(`Reinforcement ratio constraint violated: ${(reinforcementRatio * 100).toFixed(0)}%.`);
      return false;
    }

    return true;
  }

  // ──────────────────────────────────────────────
  //  CORE GENERATION FLOW
  // ──────────────────────────────────────────────

  /**
   * Generates a completely personalized learning session.
   */
  async generateSession(childId: string): Promise<any> {
    await this.seedTemplatesIfNeeded();

    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) throw new Error('Child profile not found');

    // 1. Fetch learning profile & settings from Adaptive Engine
    const profile = await learningProfileRepository.findByChildId(childId);
    const optimalDuration = profile?.optimalSessionDuration ?? 15;
    const preferredModality = profile?.preferredModality ?? ActivityType.VIDEO;

    // 2. Select appropriate template from database
    const template = await sessionTemplateRepository.findByDuration(optimalDuration);
    if (!template) throw new Error('No session templates configured in database');

    // 3. Fetch recommended & available skills from Curriculum Engine
    const recommendedSkills = await curriculumEngineService.recommendNextSkills(childId, 10);
    const availableSkills = await curriculumEngineService.getAvailableSkills(childId);

    // 4. Fetch due reviews from Reinforcement Engine
    const dueReviews = await reinforcementEngineService.getDueSkills(childId);

    // Parse block sequence template
    const blockSequence = template.blockSequence as any[];
    const blocksToBuild: any[] = [];

    let reinforcementUsed = 0;
    const maxReinforcement = Math.floor(blockSequence.length * 0.3); // max 30% of slots

    const subjectHistory: Record<string, number> = {};

    // 5. Build session blocks sequentially
    for (let pos = 0; pos < blockSequence.length; pos++) {
      const step = blockSequence[pos];
      const activityType = step.activityType as ActivityType;
      const duration = step.estimatedMinutes as number;

      // Special blocks: WARMUP & REWARD have no specific skills
      if (activityType === ActivityType.WARMUP || activityType === ActivityType.REWARD) {
        blocksToBuild.push({
          activityType,
          estimatedMinutes: duration,
          difficulty: DifficultyLevel.EASY,
          position: pos,
          isReinforcement: false,
          skillId: null,
          subjectId: null,
        });
        continue;
      }

      // Check if we should inject reinforcement for this slot
      let selectedSkill: any = null;
      let isReinforcement = false;

      if (reinforcementUsed < maxReinforcement && dueReviews.length > reinforcementUsed) {
        // Try to find a due review matching the modality/activityType
        const reviewCandidate = dueReviews.find(
          (dr) =>
            dr.isCompleted === false &&
            !blocksToBuild.some((b) => b.skillId === dr.skillId)
        );

        if (reviewCandidate) {
          const health = await skillHealthRepository.findByChildAndSkill(childId, reviewCandidate.skillId);
          selectedSkill = health?.skill;
          isReinforcement = true;
          reinforcementUsed++;
        }
      }

      // If not reinforcement (or no matching review found), select from curriculum recommendations
      if (!selectedSkill) {
        for (const rec of recommendedSkills) {
          // Avoid duplicate skills in the same session
          if (blocksToBuild.some((b) => b.skillId === rec.nextSkillId)) {
            continue;
          }

          // Check subject balance: limit to at most 2 blocks per subject
          const currentCount = subjectHistory[rec.subjectId] ?? 0;
          if (currentCount >= 2) {
            continue;
          }

          // Fetch skill entity
          const skill = await prisma.skill.findUnique({
            where: { id: rec.nextSkillId },
            include: { subject: true },
          });

          if (skill) {
            selectedSkill = skill;
            subjectHistory[skill.subjectId] = currentCount + 1;
            break;
          }
        }
      }

      // Fallback: search available skills if recommendation lists are exhausted
      if (!selectedSkill) {
        for (const av of availableSkills) {
          const skill = av.skill;
          if (blocksToBuild.some((b) => b.skillId === skill.id)) {
            continue;
          }
          const currentCount = subjectHistory[skill.subjectId] ?? 0;
          if (currentCount < 2) {
            selectedSkill = skill;
            subjectHistory[skill.subjectId] = currentCount + 1;
            break;
          }
        }
      }

      // Calculate difficulty curve
      const difficulty = this.calculateDifficultyCurve(pos, blockSequence.length);

      blocksToBuild.push({
        activityType,
        estimatedMinutes: duration,
        difficulty,
        position: pos,
        isReinforcement,
        skillId: selectedSkill?.id ?? null,
        subjectId: selectedSkill?.subjectId ?? null,
      });
    }

    // 6. Save Session Plan and Blocks atomically in a transaction
    return prisma.$transaction(async (tx) => {
      // 6.a Create session plan
      const plan = await tx.sessionPlan.create({
        data: {
          childId,
          durationMinutes: template.durationMinutes,
          status: SessionStatus.GENERATED,
        },
      });

      // 6.b Create blocks
      const createdBlocks = [];
      for (const b of blocksToBuild) {
        const block = await tx.sessionBlock.create({
          data: {
            sessionPlanId: plan.id,
            skillId: b.skillId,
            subjectId: b.subjectId,
            activityType: b.activityType,
            difficulty: b.difficulty,
            estimatedMinutes: b.estimatedMinutes,
            position: b.position,
            status: SessionBlockStatus.PENDING,
          },
          include: {
            skill: true,
            subject: true,
          },
        });
        createdBlocks.push(block);
      }

      // 6.c Emit GENERATED event
      await tx.sessionEvent.create({
        data: {
          sessionPlanId: plan.id,
          eventType: SessionEventType.GENERATED,
          metadata: {
            durationMinutes: plan.durationMinutes,
            blocksCount: createdBlocks.length,
          },
        },
      });

      return {
        ...plan,
        sessionBlocks: createdBlocks,
      };
    });
  }

  // ──────────────────────────────────────────────
  //  SESSION LIFECYCLE MANAGEMENT
  // ──────────────────────────────────────────────

  async startSession(sessionPlanId: string) {
    const plan = await sessionPlanRepository.findById(sessionPlanId);
    if (!plan) throw new Error('Session plan not found');

    const updated = await sessionPlanRepository.updateStatus(sessionPlanId, SessionStatus.STARTED, {
      startedAt: new Date(),
    });

    await sessionEventRepository.create({
      sessionPlanId,
      eventType: SessionEventType.STARTED,
    });

    return updated;
  }

  async pauseSession(sessionPlanId: string) {
    const plan = await sessionPlanRepository.findById(sessionPlanId);
    if (!plan) throw new Error('Session plan not found');

    const updated = await sessionPlanRepository.updateStatus(sessionPlanId, SessionStatus.PAUSED);

    await sessionEventRepository.create({
      sessionPlanId,
      eventType: SessionEventType.PAUSED,
    });

    return updated;
  }

  async resumeSession(sessionPlanId: string) {
    const plan = await sessionPlanRepository.findById(sessionPlanId);
    if (!plan) throw new Error('Session plan not found');

    const updated = await sessionPlanRepository.updateStatus(sessionPlanId, SessionStatus.STARTED);

    await sessionEventRepository.create({
      sessionPlanId,
      eventType: SessionEventType.RESUMED,
    });

    return updated;
  }

  async completeSession(sessionPlanId: string) {
    const plan = await sessionPlanRepository.findById(sessionPlanId);
    if (!plan) throw new Error('Session plan not found');

    // Automatically mark all pending blocks as completed
    await prisma.$transaction(async (tx) => {
      await tx.sessionBlock.updateMany({
        where: { sessionPlanId, status: SessionBlockStatus.PENDING },
        data: { status: SessionBlockStatus.COMPLETED, completedAt: new Date() },
      });
    });

    const updated = await sessionPlanRepository.updateStatus(sessionPlanId, SessionStatus.COMPLETED, {
      completedAt: new Date(),
    });

    await sessionEventRepository.create({
      sessionPlanId,
      eventType: SessionEventType.COMPLETED,
    });

    return updated;
  }

  async completeBlock(sessionPlanId: string, blockId: string) {
    const block = await prisma.sessionBlock.findUnique({ where: { id: blockId } });
    if (!block || block.sessionPlanId !== sessionPlanId) {
      throw new Error('Block not found or mismatch');
    }

    const updatedBlock = await sessionBlockRepository.updateStatus(
      blockId,
      SessionBlockStatus.COMPLETED,
      new Date()
    );

    await sessionEventRepository.create({
      sessionPlanId,
      eventType: SessionEventType.BLOCK_COMPLETED,
      metadata: { blockId, position: block.position },
    });

    return updatedBlock;
  }

  async skipBlock(sessionPlanId: string, blockId: string) {
    const block = await prisma.sessionBlock.findUnique({ where: { id: blockId } });
    if (!block || block.sessionPlanId !== sessionPlanId) {
      throw new Error('Block not found or mismatch');
    }

    const updatedBlock = await sessionBlockRepository.updateStatus(
      blockId,
      SessionBlockStatus.SKIPPED
    );

    await sessionEventRepository.create({
      sessionPlanId,
      eventType: SessionEventType.BLOCK_SKIPPED,
      metadata: { blockId, position: block.position },
    });

    return updatedBlock;
  }

  async abandonSession(sessionPlanId: string) {
    const plan = await sessionPlanRepository.findById(sessionPlanId);
    if (!plan) throw new Error('Session plan not found');

    const updated = await sessionPlanRepository.updateStatus(sessionPlanId, SessionStatus.ABANDONED, {
      completedAt: new Date(),
    });

    await sessionEventRepository.create({
      sessionPlanId,
      eventType: SessionEventType.ABANDONED,
    });

    return updated;
  }
}

export const sessionPlannerService = new SessionPlannerService();
