import { aiTutorRepository } from './ai-tutor.repository.js';
import { prisma } from '../../config/database.js';
import { skillRoadmapService } from '../skill-roadmap/skill-roadmap.service.js';
import { masteryEngineService } from '../mastery-engine/mastery-engine.service.js';
import { logger } from '../../utils/logger.js';
import { ActivityType, DifficultyLevel, SessionStatus, SessionEventType, SessionBlockStatus } from '../../shared/enums.js';
import type {
  StartSessionInput,
  ResumeSessionInput,
  EndSessionInput,
  RecordProgressInput,
  SessionResult,
  NextActivityResponse,
  ProgressResult,
} from './ai-tutor.types.js';
import type { AdaptiveRoadmap, DailyQueueItem, RoadmapSkill } from '../skill-roadmap/skill-roadmap.types.js';

export class AiTutorService {
  async startSession(input: StartSessionInput): Promise<SessionResult> {
    const { childId, durationMinutes } = input;

    const roadmap = await skillRoadmapService.getRoadmap(childId);
    const dailyQueue = roadmap.metadata.dailyQueue;
    const nextSkill = roadmap.metadata.nextSkill;
    const blocks: { skillId: string; activityType: ActivityType; difficulty: DifficultyLevel; name: string }[] = [];

    const reviewItems = dailyQueue
      .filter((q: DailyQueueItem) => q.section === 'REVIEW')
      .slice(0, 3);
    for (const item of reviewItems) {
      const skill = this.findSkillInRoadmap(roadmap, item.skillId);
      blocks.push({
        skillId: item.skillId,
        activityType: ActivityType.GAME,
        difficulty: skill ? this.mapDifficulty(skill.difficulty) : DifficultyLevel.MEDIUM,
        name: item.name,
      });
    }

    const availableItems = dailyQueue
      .filter((q: DailyQueueItem) => q.section === 'AVAILABLE')
      .slice(0, 3);
    for (const item of availableItems) {
      const skill = this.findSkillInRoadmap(roadmap, item.skillId);
      blocks.push({
        skillId: item.skillId,
        activityType: ActivityType.VIDEO,
        difficulty: skill ? this.mapDifficulty(skill.difficulty) : DifficultyLevel.MEDIUM,
        name: item.name,
      });
    }

    if (blocks.length === 0 && nextSkill) {
      const skill = this.findSkillInRoadmap(roadmap, nextSkill.skillId);
      blocks.push({
        skillId: nextSkill.skillId,
        activityType: ActivityType.GAME,
        difficulty: skill ? this.mapDifficulty(skill.difficulty) : DifficultyLevel.MEDIUM,
        name: nextSkill.name,
      });
    }

    if (blocks.length === 0) {
      throw new Error('No skills available for the session');
    }

    const session = await prisma.$transaction(async (tx) => {
      // C2: row-level lock serializes concurrent startSession for the same child
      await tx.$queryRaw`SELECT 1 FROM "children" WHERE id = ${childId} FOR UPDATE`;

      const existing = await aiTutorRepository.findActiveSessionForChild(childId, tx);
      if (existing) {
        throw new Error('An active session already exists — resume or end it first');
      }

      const plan = await aiTutorRepository.createSessionPlan({
        childId,
        durationMinutes,
        status: SessionStatus.STARTED,
        startedAt: new Date(),
      }, tx);

      for (let i = 0; i < blocks.length; i++) {
        await aiTutorRepository.createSessionBlock({
          sessionPlanId: plan.id,
          skillId: blocks[i].skillId,
          activityType: blocks[i].activityType,
          difficulty: blocks[i].difficulty,
          estimatedMinutes: Math.round(durationMinutes / blocks.length),
          position: i,
          status: SessionBlockStatus.PENDING,
          isReinforcement: false,
        }, tx);
      }

      await aiTutorRepository.createSessionEvent({
        sessionPlanId: plan.id,
        eventType: SessionEventType.STARTED,
      }, tx);

      return plan;
    });

    const fullSession = await aiTutorRepository.findSessionPlanById(session.id);
    if (!fullSession) {
      throw new Error('Session not found after creation');
    }
    return this.toSessionResult(fullSession);
  }

  async resumeSession(input: ResumeSessionInput): Promise<SessionResult> {
    const { childId, sessionId } = input;

    const session = await aiTutorRepository.findSessionPlanById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    if (session.childId !== childId) {
      throw new Error('Session does not belong to this child');
    }
    if (session.status === SessionStatus.COMPLETED || session.status === SessionStatus.ABANDONED) {
      throw new Error('Session is already ended');
    }

    // H1: wrap writes in single transaction
    if (session.status === SessionStatus.PAUSED) {
      await prisma.$transaction(async (tx) => {
        await aiTutorRepository.updateSessionPlan(sessionId, { status: SessionStatus.STARTED }, tx);
        await aiTutorRepository.createSessionEvent({ sessionPlanId: sessionId, eventType: SessionEventType.RESUMED }, tx);
      });
    }

    const refreshed = await aiTutorRepository.findSessionPlanById(sessionId);
    if (!refreshed) {
      throw new Error('Session not found after resume');
    }
    return this.toSessionResult(refreshed);
  }

  async endSession(input: EndSessionInput): Promise<SessionResult> {
    const { childId, sessionId } = input;

    const session = await aiTutorRepository.findSessionPlanById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    if (session.childId !== childId) {
      throw new Error('Session does not belong to this child');
    }
    if (session.status === SessionStatus.COMPLETED || session.status === SessionStatus.ABANDONED) {
      throw new Error('Session is already ended');
    }

    await prisma.$transaction(async (tx) => {
      // H2: mark remaining PENDING blocks as SKIPPED
      await aiTutorRepository.skipPendingBlocksForSession(sessionId, tx);

      await aiTutorRepository.updateSessionPlan(sessionId, {
        status: SessionStatus.COMPLETED,
        completedAt: new Date(),
      }, tx);

      await aiTutorRepository.createSessionEvent({
        sessionPlanId: sessionId,
        eventType: SessionEventType.COMPLETED,
      }, tx);
    });

    try {
      await skillRoadmapService.refreshRoadmap(childId, 'REVISION_COMPLETED');
    } catch (error) {
      logger.error({ childId, sessionId, error }, 'Failed to refresh roadmap after session end');
    }

    const refreshed = await aiTutorRepository.findSessionPlanById(sessionId);
    if (!refreshed) {
      throw new Error('Session not found after end');
    }
    return this.toSessionResult(refreshed);
  }

  async getNextActivity(sessionId: string, childId: string): Promise<NextActivityResponse | null> {
    const session = await aiTutorRepository.findSessionPlanById(sessionId);
    if (!session || session.childId !== childId) {
      return null;
    }

    const nextBlock = await aiTutorRepository.findNextIncompleteBlock(sessionId);
    if (!nextBlock) {
      return null;
    }

    return {
      blockId: nextBlock.id,
      skillId: nextBlock.skillId,
      skillName: nextBlock.skill?.name ?? null,
      activityType: nextBlock.activityType,
      difficulty: nextBlock.difficulty,
      estimatedMinutes: nextBlock.estimatedMinutes,
      sessionId,
    };
  }

  async recordProgress(input: RecordProgressInput): Promise<ProgressResult> {
    const { childId, sessionId, blockId, skillId, accuracy, responseTime, attempts, retries, engagementScore, helpRequests, sessionDuration } = input;

    const session = await aiTutorRepository.findSessionPlanById(sessionId);
    if (!session || session.childId !== childId) {
      throw new Error('Session not found');
    }
    if (session.status !== SessionStatus.STARTED) {
      throw new Error('Session is not active');
    }

    const block = session.sessionBlocks.find((b) => b.id === blockId);
    if (!block) {
      throw new Error('Block not found in session');
    }

    // M6: idempotent — already-completed block returns early
    if (block.status === SessionBlockStatus.COMPLETED) {
      return {
        blockId,
        blockStatus: SessionBlockStatus.COMPLETED,
        masteryResult: null,
        sessionComplete: false,
      };
    }

    // C3: atomic idempotent completion — updateMany with status=PENDING
    //     prevents double-counting under concurrent load
    const sessionCompleted = await prisma.$transaction(async (tx) => {
      const updated = await aiTutorRepository.completeBlockIfPending(blockId, tx);
      if (updated.count === 0) return false; // already completed by concurrent request

      await aiTutorRepository.createSessionEvent({
        sessionPlanId: sessionId,
        eventType: SessionEventType.BLOCK_COMPLETED,
      }, tx);

      const totalBlocks = await aiTutorRepository.countTotalBlocks(sessionId, tx);
      const completedBlocks = await aiTutorRepository.countCompletedBlocks(sessionId, tx);
      const allComplete = completedBlocks >= totalBlocks;

      if (allComplete) {
        await aiTutorRepository.updateSessionPlan(sessionId, {
          status: SessionStatus.COMPLETED,
          completedAt: new Date(),
        }, tx);
        await aiTutorRepository.createSessionEvent({
          sessionPlanId: sessionId,
          eventType: SessionEventType.COMPLETED,
        }, tx);
      }

      return allComplete;
    });

    // H3: mastery evaluation — log and surface deferred state on failure
    let masteryResult: ProgressResult['masteryResult'] = null;
    try {
      const evalResult = await masteryEngineService.evaluateMastery({
        childId,
        skillId,
        accuracy,
        responseTime,
        attempts,
        retries,
        engagementScore,
        helpRequests,
        sessionDuration,
      });
      masteryResult = {
        skillId: evalResult.skillId,
        masteryState: evalResult.currentState,
        masteryScore: evalResult.masteryScore,
        isNewMastery: evalResult.isNewMastery,
        unlockedSkills: evalResult.unlockedSkills,
      };
    } catch (error) {
      logger.error({ childId, sessionId, blockId, skillId, error }, 'Mastery evaluation failed during progress recording');
      masteryResult = {
        skillId,
        masteryState: 'DEFERRED',
        masteryScore: 0,
        isNewMastery: false,
        unlockedSkills: [],
      };
    }

    // H4: correct roadmap refresh trigger based on actual outcome
    if (sessionCompleted) {
      try {
        await skillRoadmapService.refreshRoadmap(childId, 'REVISION_COMPLETED');
      } catch (error) {
        logger.error({ childId, sessionId, error }, 'Failed to refresh roadmap after session complete');
      }
    } else if (masteryResult.isNewMastery) {
      try {
        await skillRoadmapService.refreshRoadmap(childId, 'SKILL_MASTERED');
      } catch (error) {
        logger.error({ childId, sessionId, error }, 'Failed to refresh roadmap after mastery');
      }
    }

    return {
      blockId,
      blockStatus: SessionBlockStatus.COMPLETED,
      masteryResult,
      sessionComplete: sessionCompleted,
    };
  }

  private findSkillInRoadmap(roadmap: AdaptiveRoadmap, skillId: string): RoadmapSkill | null {
    for (const section of roadmap.sections) {
      const found = section.skills.find((s: RoadmapSkill) => s.skillId === skillId);
      if (found) return found;
    }
    return null;
  }

  private mapDifficulty(difficulty: number): DifficultyLevel {
    if (difficulty <= 2) return DifficultyLevel.EASY;
    if (difficulty <= 4) return DifficultyLevel.MEDIUM;
    return DifficultyLevel.HARD;
  }

  private toSessionResult(session: { id: string; status: string; sessionBlocks?: Array<{ id: string; skillId: string | null; skill?: { name: string } | null; activityType: string; difficulty: string; status: string; position: number; isReinforcement: boolean; estimatedMinutes: number }>; startedAt: Date | null; completedAt: Date | null }): SessionResult {
    return {
      sessionId: session.id,
      status: session.status,
      blocks: session.sessionBlocks?.map((b) => ({
        id: b.id,
        skillId: b.skillId,
        skillName: b.skill?.name ?? null,
        activityType: b.activityType,
        difficulty: b.difficulty,
        status: b.status,
        position: b.position,
        isReinforcement: b.isReinforcement,
        estimatedMinutes: b.estimatedMinutes,
      })) ?? [],
      startedAt: session.startedAt?.toISOString() ?? null,
      completedAt: session.completedAt?.toISOString() ?? null,
    };
  }
}

export const aiTutorService = new AiTutorService();
