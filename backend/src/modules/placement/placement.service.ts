import { prisma } from '../../config/database.js';
import { placementRepository } from './placement.repository.js';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { AssessmentAttemptStatus, CurriculumState, MasteryState } from '../../shared/enums.js';
import type {
  PlacementQuestionnaire,
  PlacementQuestion,
  PlacementQuestionConfig,
  PlacementProgress,
  PlacementResult,
  SkillAssessmentResult,
  PrerequisiteGap,
} from './placement.types.js';

export class PlacementService {
  async getQuestionnaire(ageGroup?: string, startFromBeginning?: boolean): Promise<PlacementQuestionnaire> {
    if (startFromBeginning) {
      return {
        assessmentId: 'start_from_beginning',
        title: 'Start from the Beginning',
        description: 'We will initialize your child at the foundational level without assessment.',
        estimatedMinutes: 0,
        totalQuestions: 0,
        questions: [],
      };
    }

    const resolvedAgeGroup = ageGroup ?? 'PRE_NURSERY';

    const assessment = await placementRepository.findAssessmentByAgeGroup(resolvedAgeGroup);
    if (!assessment) {
      throw new NotFoundError(`No placement assessment found for age group: ${resolvedAgeGroup}`);
    }

    const questions: PlacementQuestion[] = assessment.questions.map((q) => {
      const options = q.options as Record<string, unknown> | null;
      const skillId = typeof options?.skillId === 'string' ? options.skillId : '';
      const choices = Array.isArray(options?.choices) ? (options.choices as Array<{ label: string; value: string }>) : undefined;
      return {
        id: q.id,
        prompt: q.prompt,
        questionType: q.questionType,
        config: { skillId, choices },
        order: q.order,
        maxScore: q.maxScore,
      };
    });

    return {
      assessmentId: assessment.id,
      title: assessment.title,
      description: assessment.description,
      estimatedMinutes: assessment.estimatedMinutes,
      totalQuestions: questions.length,
      questions,
    };
  }

  async startPlacement(childId: string, assessmentId: string): Promise<PlacementProgress> {
    const assessment = await placementRepository.findAssessmentById(assessmentId);
    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    // TD-1: Application-level transaction reduces the race window but does not
    // fully eliminate duplicate IN_PROGRESS attempts under READ COMMITTED.
    // A @@unique([childId, assessmentId, status]) constraint on AssessmentAttempt
    // would provide a database-level guarantee. Deferred because schema changes
    // are out of scope for this phase.
    const attempt = await prisma.$transaction(async (tx) => {
      const existing = await tx.assessmentAttempt.findFirst({
        where: { childId, assessmentId, status: AssessmentAttemptStatus.IN_PROGRESS },
        include: {
          assessment: {
            include: { questions: { orderBy: { order: 'asc' } } },
          },
        },
      });

      if (existing) return existing;

      return tx.assessmentAttempt.create({
        data: {
          childId,
          assessmentId,
          status: AssessmentAttemptStatus.IN_PROGRESS,
          startedAt: new Date(),
        },
        include: {
          assessment: {
            include: { questions: { orderBy: { order: 'asc' } } },
          },
        },
      });
    });

    if (!attempt.assessment) {
      throw new NotFoundError('Assessment definition not found');
    }
    return this.buildProgress(attempt.id, attempt.assessment.questions);
  }

  async startFromBeginning(childId: string): Promise<{ result: PlacementResult }> {
    const rootSkills = await placementRepository.findRootSkills();
    if (rootSkills.length === 0) {
      throw new NotFoundError('No root skills found in the curriculum');
    }

    const now = new Date();

    const skillEntries = rootSkills.map((s) => ({
      skillId: s.id,
      state: CurriculumState.AVAILABLE,
      unlockRatio: 1,
      priority: 1,
    }));

    await prisma.$transaction(async (tx) => {
      for (const entry of skillEntries) {
        await tx.childSkillCurriculum.upsert({
          where: { childId_skillId: { childId, skillId: entry.skillId } },
          create: {
            childId,
            skillId: entry.skillId,
            state: CurriculumState.AVAILABLE,
            unlockRatio: 1,
            priority: 1,
          },
          update: {
            state: CurriculumState.AVAILABLE,
            unlockRatio: 1,
            priority: 1,
          },
        });

        await tx.skillHealth.upsert({
          where: { childId_skillId: { childId, skillId: entry.skillId } },
          create: {
            childId,
            skillId: entry.skillId,
            masteryState: MasteryState.NEW,
            knowledgeScore: 0,
            confidenceScore: 0,
            retentionScore: 0,
            engagementScore: 0,
            consistencyScore: 0,
            masteryScore: 0,
            lastPracticed: now,
            nextReviewDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            reviewCount: 0,
            attemptCount: 0,
            retryCount: 0,
            decayFactor: 0.9,
            frequencyDays: 7,
          },
          update: {
            masteryState: MasteryState.NEW,
            knowledgeScore: 0,
            confidenceScore: 0,
            masteryScore: 0,
            lastPracticed: now,
            nextReviewDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            reviewCount: 0,
            attemptCount: 0,
            retryCount: 0,
            decayFactor: 0.9,
            frequencyDays: 7,
          },
        });
      }
    });

    const result: PlacementResult = {
      childId,
      assessmentId: 'start_from_beginning',
      attemptId: 'none',
      assessedSkills: [],
      prerequisiteGaps: [],
      masteredCount: 0,
      weakCount: 0,
      learningCount: 0,
      startingSkillId: rootSkills[0]?.id ?? null,
      startingSkillName: rootSkills[0]?.name ?? null,
      revisionQueueCount: 0,
      curriculumInitialized: true,
      roadmapGenerated: false,
    };

    const roadmapJson = this.buildRoadmapJson(childId, rootSkills.map((s) => ({ id: s.id, name: s.name, state: 'AVAILABLE', subjectId: s.subjectId })), []);

    await placementRepository.upsertDynamicRoadmap(childId, roadmapJson as any);

    result.roadmapGenerated = true;

    return { result };
  }

  async submitAnswer(
    childId: string,
    attemptId: string,
    questionId: string,
    answer: string
  ): Promise<{ progress: PlacementProgress; correct: boolean }> {
    const attempt = await placementRepository.findAttemptById(attemptId);
    if (!attempt) {
      throw new NotFoundError('Placement attempt not found');
    }
    if (attempt.childId !== childId) {
      throw new ValidationError('Attempt does not belong to this child');
    }
    if (attempt.status !== AssessmentAttemptStatus.IN_PROGRESS) {
      throw new ValidationError('Placement attempt is already completed');
    }

    if (!attempt.assessment) {
      throw new NotFoundError('Assessment definition not found');
    }
    const existingResponses = (attempt.rawResponses as Array<Record<string, unknown>>) ?? [];
    if (existingResponses.length >= attempt.assessment.questions.length) {
      throw new ConflictError('All questions have already been answered; complete the attempt first');
    }

    const question = attempt.assessment.questions.find((q) => q.id === questionId);
    if (!question) {
      throw new NotFoundError('Question not found in this assessment');
    }

    const correct = question.correctAnswer !== null && question.correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase();
    const scorePerQuestion = question.maxScore;

    const existingIndex = existingResponses.findIndex((r) => r.questionId === questionId);

    const responseEntry = {
      questionId,
      answer,
      correct,
      score: correct ? scorePerQuestion : 0,
      maxScore: scorePerQuestion,
    };

    let updatedResponses: Array<Record<string, unknown>>;
    if (existingIndex >= 0) {
      updatedResponses = [...existingResponses];
      updatedResponses[existingIndex] = responseEntry;
    } else {
      updatedResponses = [...existingResponses, responseEntry];
    }

    const totalScore = updatedResponses.reduce((sum, r) => sum + ((r.score as number) ?? 0), 0);
    const totalMaxScore = updatedResponses.reduce((sum, r) => sum + ((r.maxScore as number) ?? 0), 0);
    const percentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    await placementRepository.completeAttempt(attemptId, {
      status: AssessmentAttemptStatus.IN_PROGRESS,
      completedAt: new Date(),
      rawResponses: updatedResponses as any,
      score: totalScore,
      maxScore: totalMaxScore,
      percentage,
    });

    const progress = this.buildProgress(attemptId, attempt.assessment!.questions, updatedResponses);

    return { progress, correct };
  }

  async completePlacement(childId: string, attemptId: string): Promise<PlacementResult> {
    const attempt = await placementRepository.findAttemptById(attemptId);
    if (!attempt) {
      throw new NotFoundError('Placement attempt not found');
    }
    if (attempt.childId !== childId) {
      throw new ValidationError('Attempt does not belong to this child');
    }
    if (attempt.status === AssessmentAttemptStatus.COMPLETED) {
      throw new ConflictError('Placement assessment is already completed');
    }

    if (!attempt.assessment) {
      throw new NotFoundError('Assessment definition not found');
    }
    const responses = (attempt.rawResponses as Array<Record<string, unknown>>) ?? [];
    const questions = attempt.assessment.questions;

    const totalScore = responses.reduce((sum, r) => sum + ((r.score as number) ?? 0), 0);
    const totalMaxScore = responses.reduce((sum, r) => sum + ((r.maxScore as number) ?? 0), 0);
    const percentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    await placementRepository.completeAttempt(attemptId, {
      status: AssessmentAttemptStatus.COMPLETED,
      completedAt: new Date(),
      rawResponses: responses as any,
      score: totalScore,
      maxScore: totalMaxScore,
      percentage,
    });

    const questionSkillMap = new Map<string, string>();
    for (const q of questions) {
      const options = q.options as Record<string, unknown> | null;
      const skillId = typeof options?.skillId === 'string' ? options.skillId : undefined;
      if (skillId) {
        questionSkillMap.set(q.id, skillId);
      }
    }

    const skillScores = new Map<string, { correct: number; total: number }>();
    for (const r of responses) {
      const skillId = questionSkillMap.get(r.questionId as string);
      if (!skillId) continue;
      const existing = skillScores.get(skillId) ?? { correct: 0, total: 0 };
      existing.total += (r.maxScore as number) ?? 1;
      if (r.correct) {
        existing.correct += (r.maxScore as number) ?? 1;
      }
      skillScores.set(skillId, existing);
    }

    const assessedSkills: SkillAssessmentResult[] = [];
    const skillIdSet = new Set<string>();
    for (const skillId of skillScores.keys()) {
      skillIdSet.add(skillId);
    }

    const skillBatch = await prisma.skill.findMany({
      where: { id: { in: [...skillIdSet] } },
      select: { id: true, name: true, skillCode: true },
    });
    const skillMap = new Map(skillBatch.map((s) => [s.id, s]));

    for (const [skillId, scores] of skillScores) {
      const accuracy = scores.total > 0 ? Math.round((scores.correct / scores.total) * 100) : 0;
      let mastery: SkillAssessmentResult['mastery'] = 'NOT_ASSESSED';
      if (accuracy >= 80) mastery = 'MASTERED';
      else if (accuracy >= 50) mastery = 'LEARNING';
      else mastery = 'WEAK';

      const skill = skillMap.get(skillId);

      assessedSkills.push({
        skillId,
        skillName: skill?.name ?? 'Unknown',
        skillCode: skill?.skillCode ?? '',
        correctCount: scores.correct,
        totalCount: scores.total,
        accuracy,
        mastery,
      });
    }

    const masteredSkillIds = assessedSkills.filter((s) => s.mastery === 'MASTERED').map((s) => s.skillId);
    const weakSkillIds = assessedSkills.filter((s) => s.mastery === 'WEAK').map((s) => s.skillId);
    const learningSkillIds = assessedSkills.filter((s) => s.mastery === 'LEARNING').map((s) => s.skillId);

    const allAssessedSkillIds = [...skillIdSet];
    const prerequisiteGaps = await this.findPrerequisiteGaps(allAssessedSkillIds, skillIdSet);

    const now = new Date();

    const allRelevantSkillIds = new Set([
      ...masteredSkillIds,
      ...weakSkillIds,
      ...learningSkillIds,
      ...prerequisiteGaps.map((g) => g.skillId),
    ]);

    const allSkillsInSystem = await prisma.skill.findMany({ select: { id: true } });
    const lockedSkillIds = allSkillsInSystem
      .filter((s) => !allRelevantSkillIds.has(s.id))
      .map((s) => s.id);

    await prisma.$transaction(async (tx) => {
      for (const skillId of allRelevantSkillIds) {
        const isMastered = masteredSkillIds.includes(skillId);
        const isWeak = weakSkillIds.includes(skillId);
        const isLearning = learningSkillIds.includes(skillId);
        const isGap = prerequisiteGaps.some((g) => g.skillId === skillId);

        let state: CurriculumState;
        let priority: number;

        if (isMastered) {
          state = CurriculumState.COMPLETED;
          priority = 0;
        } else if (isGap) {
          state = CurriculumState.AVAILABLE;
          priority = 5;
        } else if (isWeak) {
          state = CurriculumState.AVAILABLE;
          priority = 3;
        } else if (isLearning) {
          state = CurriculumState.AVAILABLE;
          priority = 2;
        } else {
          state = CurriculumState.LOCKED;
          priority = 1;
        }

        await tx.childSkillCurriculum.upsert({
          where: { childId_skillId: { childId, skillId } },
          create: {
            childId,
            skillId,
            state,
            unlockRatio: isMastered ? 1 : 0,
            priority,
            activatedAt: isMastered ? now : undefined,
            completedAt: isMastered ? now : undefined,
          },
          update: {
            state,
            unlockRatio: isMastered ? 1 : 0,
            priority,
            activatedAt: isMastered ? now : undefined,
            completedAt: isMastered ? now : undefined,
          },
        });

        let masteryState: MasteryState;
        let masteryScore: number;
        let knowledgeScore: number;
        let frequencyDays: number;

        if (isMastered) {
          masteryState = MasteryState.MASTERED;
          masteryScore = 85;
          knowledgeScore = 85;
          frequencyDays = 30;
        } else if (isWeak) {
          masteryState = MasteryState.WEAK;
          masteryScore = 35;
          knowledgeScore = 35;
          frequencyDays = 3;
        } else if (isLearning) {
          masteryState = MasteryState.LEARNING;
          masteryScore = 60;
          knowledgeScore = 60;
          frequencyDays = 7;
        } else {
          masteryState = MasteryState.NEW;
          masteryScore = 0;
          knowledgeScore = 0;
          frequencyDays = 7;
        }

        await tx.skillHealth.upsert({
          where: { childId_skillId: { childId, skillId } },
          create: {
            childId,
            skillId,
            masteryState,
            knowledgeScore,
            confidenceScore: isMastered ? 80 : 30,
            retentionScore: isMastered ? 80 : 30,
            engagementScore: 50,
            consistencyScore: isMastered ? 80 : 30,
            masteryScore,
            lastPracticed: now,
            nextReviewDate: new Date(now.getTime() + frequencyDays * 24 * 60 * 60 * 1000),
            reviewCount: isMastered ? 3 : 0,
            attemptCount: 1,
            retryCount: isWeak ? 1 : 0,
            decayFactor: 0.9,
            frequencyDays,
          },
          update: {
            masteryState,
            knowledgeScore,
            confidenceScore: isMastered ? 80 : 30,
            masteryScore,
            lastPracticed: now,
            nextReviewDate: new Date(now.getTime() + frequencyDays * 24 * 60 * 60 * 1000),
            reviewCount: isMastered ? 3 : 0,
            attemptCount: 1,
            retryCount: isWeak ? 1 : 0,
            decayFactor: 0.9,
            frequencyDays,
          },
        });

        if (isWeak || isGap) {
          const reason = isWeak ? 'Weak skill detected during placement' : 'Prerequisite gap detected during placement';
          const queuePriority = isGap ? 5 : 3;

          await tx.reinforcementQueue.upsert({
            where: { childId_skillId: { childId, skillId } },
            create: {
              childId,
              skillId,
              priority: queuePriority,
              masteryState: MasteryState.LEARNING,
              reason,
              isCompleted: false,
              nextReviewDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            },
            update: {
              priority: queuePriority,
              reason,
              isCompleted: false,
              nextReviewDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            },
          });
        }
      }

      for (const skillId of lockedSkillIds) {
        await tx.childSkillCurriculum.upsert({
          where: { childId_skillId: { childId, skillId } },
          create: {
            childId,
            skillId,
            state: CurriculumState.LOCKED,
            unlockRatio: 0,
            priority: 0,
          },
          update: {
            state: CurriculumState.LOCKED,
            unlockRatio: 0,
            priority: 0,
          },
        });

        await tx.skillHealth.upsert({
          where: { childId_skillId: { childId, skillId } },
          create: {
            childId,
            skillId,
            masteryState: MasteryState.NEW,
            knowledgeScore: 0,
            confidenceScore: 0,
            retentionScore: 0,
            engagementScore: 0,
            consistencyScore: 0,
            masteryScore: 0,
            lastPracticed: now,
            nextReviewDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            reviewCount: 0,
            attemptCount: 0,
            retryCount: 0,
            decayFactor: 0.9,
            frequencyDays: 7,
          },
          update: {},
        });
      }
    });

    const revisionQueueCount = weakSkillIds.length + prerequisiteGaps.length;

    const startingSkill = this.findStartingSkill(assessedSkills, prerequisiteGaps);

    const skillStates = [...allRelevantSkillIds].map((id) => {
      const assessed = assessedSkills.find((s) => s.skillId === id);
      return {
        id,
        name: assessed?.skillName ?? 'Unknown',
        state: masteredSkillIds.includes(id) ? 'COMPLETED' as const : 'AVAILABLE' as const,
        subjectId: '',
      };
    });

    try {
      const roadmapJson = this.buildRoadmapJson(childId, skillStates, prerequisiteGaps);
      await placementRepository.upsertDynamicRoadmap(childId, roadmapJson as any);
    } catch (error) {
      logger.error({ childId, attemptId, error }, 'Roadmap generation failed after placement; placement result is still valid');
    }

    return {
      childId,
      assessmentId: attempt.assessmentId,
      attemptId,
      assessedSkills,
      prerequisiteGaps,
      masteredCount: masteredSkillIds.length,
      weakCount: weakSkillIds.length,
      learningCount: learningSkillIds.length,
      startingSkillId: startingSkill?.skillId ?? null,
      startingSkillName: startingSkill?.skillName ?? null,
      revisionQueueCount,
      curriculumInitialized: true,
      roadmapGenerated: true,
    };
  }

  async getPlacementResult(childId: string, attemptId: string): Promise<PlacementResult> {
    const attempt = await placementRepository.findAttemptById(attemptId);
    if (!attempt) {
      throw new NotFoundError('Placement attempt not found');
    }
    if (attempt.childId !== childId) {
      throw new ValidationError('Attempt does not belong to this child');
    }

    const existingCurriculum = await placementRepository.findChildSkillCurriculums(childId);

    const assessedSkills: SkillAssessmentResult[] = [];
    const masteredCount = existingCurriculum.filter((c) => c.state === CurriculumState.COMPLETED).length;
    const weakCount = existingCurriculum.filter((c) => c.state === CurriculumState.AVAILABLE).length;
    const learningCount = 0;

    const queues = await placementRepository.findReinforcementQueues(childId);

    return {
      childId,
      assessmentId: attempt.assessmentId,
      attemptId,
      assessedSkills,
      prerequisiteGaps: [],
      masteredCount,
      weakCount,
      learningCount,
      startingSkillId: null,
      startingSkillName: null,
      revisionQueueCount: queues.length,
      curriculumInitialized: existingCurriculum.length > 0,
      roadmapGenerated: !!(await placementRepository.findDynamicRoadmap(childId)),
    };
  }

  async restartPlacement(childId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.childSkillCurriculum.deleteMany({ where: { childId } });
      await tx.skillHealth.deleteMany({ where: { childId } });
      await tx.reinforcementQueue.deleteMany({ where: { childId } });
      await tx.dynamicRoadmap.deleteMany({ where: { childId } });
      await tx.assessmentAttempt.updateMany({
        where: { childId, status: AssessmentAttemptStatus.IN_PROGRESS },
        data: { status: AssessmentAttemptStatus.ABANDONED },
      });
    });
  }

  private async findPrerequisiteGaps(
    assessedSkillIds: string[],
    assessedSkillIdSet: Set<string>
  ): Promise<PrerequisiteGap[]> {
    const gaps: PrerequisiteGap[] = [];
    const allPrereqIds = new Set<string>();
    const prereqCache = new Map<string, string[]>();

    for (const skillId of assessedSkillIds) {
      const prereqIds = await placementRepository.findPrerequisiteSkillIds(skillId);
      prereqCache.set(skillId, prereqIds);
      for (const prereqId of prereqIds) {
        if (!assessedSkillIdSet.has(prereqId)) {
          allPrereqIds.add(prereqId);
        }
      }
    }

    const prereqBatch = allPrereqIds.size > 0
      ? await prisma.skill.findMany({
          where: { id: { in: [...allPrereqIds] } },
          select: { id: true, name: true, skillCode: true },
        })
      : [];
    const prereqMap = new Map(prereqBatch.map((s) => [s.id, s]));

    for (const skillId of assessedSkillIds) {
      const prereqIds = prereqCache.get(skillId) ?? [];
      for (const prereqId of prereqIds) {
        if (!assessedSkillIdSet.has(prereqId)) {
          const existingGap = gaps.find((g) => g.skillId === prereqId);
          const skill = prereqMap.get(prereqId);

          if (existingGap) {
            existingGap.dependentOn.push({
              skillId,
              skillName: '',
              skillCode: '',
            });
          } else {
            gaps.push({
              skillId: prereqId,
              skillName: skill?.name ?? 'Unknown',
              skillCode: skill?.skillCode ?? '',
              dependentOn: [{ skillId, skillName: '', skillCode: '' }],
            });
          }
        }
      }
    }

    return gaps;
  }

  private findStartingSkill(
    assessedSkills: SkillAssessmentResult[],
    prerequisiteGaps: PrerequisiteGap[]
  ): SkillAssessmentResult | null {
    const notMastered = assessedSkills
      .filter((s) => s.mastery !== 'MASTERED')
      .sort((a, b) => b.accuracy - a.accuracy);

    if (notMastered.length > 0) {
      return notMastered[0];
    }

    const firstAvailable = assessedSkills.sort((a, b) => a.accuracy - b.accuracy);
    return firstAvailable[0] ?? null;
  }

  private buildProgress(
    attemptId: string,
    questions: Array<{ id: string; prompt: string; questionType: string; options: unknown; order: number; maxScore: number }>,
    responses?: Array<Record<string, unknown>>
  ): PlacementProgress {
    const answeredIds = new Set((responses ?? []).map((r) => r.questionId as string));
    const answeredCount = answeredIds.size;

    let currentIndex = 0;
    for (let i = 0; i < questions.length; i++) {
      if (!answeredIds.has(questions[i].id)) {
        currentIndex = i;
        break;
      }
      currentIndex = i + 1;
    }

    const isComplete = currentIndex >= questions.length;

    const currentQuestion = !isComplete && questions[currentIndex]
      ? this.toPlacementQuestion(questions[currentIndex])
      : null;

    return {
      attemptId,
      assessmentId: '',
      totalQuestions: questions.length,
      answeredQuestions: answeredCount,
      currentQuestionIndex: currentIndex,
      currentQuestion,
      isComplete,
    };
  }

  private toPlacementQuestion(q: {
    id: string;
    prompt: string;
    questionType: string;
    options: unknown;
    order: number;
    maxScore: number;
  }): PlacementQuestion {
    const options = q.options as Record<string, unknown> | null;
    const skillId = typeof options?.skillId === 'string' ? options.skillId : '';
    const choices = Array.isArray(options?.choices) ? (options.choices as Array<{ label: string; value: string }>) : undefined;
    return {
      id: q.id,
      prompt: q.prompt,
      questionType: q.questionType,
      config: { skillId, choices },
      order: q.order,
      maxScore: q.maxScore,
    };
  }

  private buildRoadmapJson(
    childId: string,
    skillStates: Array<{ id: string; name: string; state: 'AVAILABLE' | 'COMPLETED' | 'LOCKED'; subjectId: string }>,
    prerequisiteGaps: PrerequisiteGap[]
  ): Record<string, unknown> {
    const sections: Array<{ type: string; title: string; skills: Array<Record<string, unknown>> }> = [];

    const mastered = skillStates.filter((s) => s.state === 'COMPLETED');
    if (mastered.length > 0) {
      sections.push({
        type: 'COMPLETED',
        title: 'Mastered Skills',
        skills: mastered.map((s) => ({ id: s.id, name: s.name, status: 'COMPLETED' })),
      });
    }

    const available = skillStates.filter((s) => s.state === 'AVAILABLE');
    if (available.length > 0) {
      sections.push({
        type: 'NEW_LEARNING',
        title: 'Current Learning',
        skills: available.map((s) => ({ id: s.id, name: s.name, status: 'AVAILABLE' })),
      });
    }

    if (prerequisiteGaps.length > 0) {
      sections.push({
        type: 'REVIEW',
        title: 'Needs Review',
        skills: prerequisiteGaps.map((g) => ({
          id: g.skillId,
          name: g.skillName,
          status: 'REVIEW',
          reason: 'Prerequisite gap',
        })),
      });
    }

    return {
      childId,
      generatedAt: new Date().toISOString(),
      version: 1,
      sections,
      totalSkills: skillStates.length,
      totalMastered: mastered.length,
      totalAvailable: available.length,
      totalGaps: prerequisiteGaps.length,
    };
  }
}

export const placementService = new PlacementService();
