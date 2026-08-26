import { prisma } from '../../config/database.js';
import { skillRoadmapRepository } from './skill-roadmap.repository.js';
import { logger } from '../../utils/logger.js';
import type {
  AdaptiveRoadmap,
  RoadmapSection,
  RoadmapSkill,
  RoadmapMetadata,
  NextSkillResponse,
  DailyQueueItem,
  NextSkillInfo,
  RefreshTrigger,
} from './skill-roadmap.types.js';

export class SkillRoadmapService {
  async generateRoadmap(childId: string): Promise<AdaptiveRoadmap> {
    const [curriculums, healths, allSkills, allDeps, pendingReinforcements] = await Promise.all([
      skillRoadmapRepository.findChildCurriculums(childId),
      skillRoadmapRepository.findSkillHealths(childId),
      skillRoadmapRepository.findAllSkills(),
      skillRoadmapRepository.findAllDependencies(),
      skillRoadmapRepository.findPendingReinforcements(childId),
    ]);

    const healthMap = new Map(healths.map((h) => [h.skillId, h]));
    const skillDetails = new Map(allSkills.map((s) => [s.id, s]));

    const prereqMap = new Map<string, string[]>();
    const dependentMap = new Map<string, string[]>();
    for (const dep of allDeps) {
      const prereqs = prereqMap.get(dep.childSkillId) ?? [];
      prereqs.push(dep.parentSkillId);
      prereqMap.set(dep.childSkillId, prereqs);

      const dependents = dependentMap.get(dep.parentSkillId) ?? [];
      dependents.push(dep.childSkillId);
      dependentMap.set(dep.parentSkillId, dependents);
    }

    const reviewSkillIds = new Set(pendingReinforcements.map((r) => r.skillId));

    const masteredSection: RoadmapSkill[] = [];
    const reviewSection: RoadmapSkill[] = [];
    const availableSection: RoadmapSkill[] = [];
    const lockedSection: RoadmapSkill[] = [];
    const futureSection: RoadmapSkill[] = [];

    const processedSkillIds = new Set<string>();

    for (const curriculum of curriculums) {
      const skillId = curriculum.skillId;
      processedSkillIds.add(skillId);
      const health = healthMap.get(skillId);
      const skill = skillDetails.get(skillId);
      const depth = this.computeDependencyDepth(skillId, prereqMap, new Set());

      const isOptional = skill?.isOptionalSkill ?? false;
      const curriculumState = curriculum.state;

      const reviewUrgency = this.computeReviewUrgency(
        curriculumState,
        reviewSkillIds.has(skillId),
        health?.nextReviewDate ?? null,
      );

      const priorityScore = this.computePriorityScore({
        curriculumState,
        masteryState: health?.masteryState ?? 'NEW',
        difficulty: skill?.difficulty ?? 1,
        displayOrder: skill?.displayOrder ?? 0,
        depth,
        reviewUrgency,
        curriculumPriority: curriculum.priority,
        knowledgeScore: health?.knowledgeScore ?? 0,
        confidenceScore: health?.confidenceScore ?? 0,
        retentionScore: health?.retentionScore ?? 0,
      });

      const roadmapSkill: RoadmapSkill = {
        skillId,
        name: curriculum.skill?.name ?? skill?.name ?? 'Unknown',
        skillCode: curriculum.skill?.skillCode ?? skill?.skillCode ?? '',
        subjectId: curriculum.skill?.subjectId ?? skill?.subjectId ?? '',
        difficulty: curriculum.skill?.difficulty ?? skill?.difficulty ?? 1,
        displayOrder: curriculum.skill?.displayOrder ?? skill?.displayOrder ?? 0,
        estimatedDuration: curriculum.skill?.estimatedDuration ?? skill?.estimatedDuration ?? 10,
        isCoreSkill: curriculum.skill?.isCoreSkill ?? skill?.isCoreSkill ?? false,
        isOptionalSkill: isOptional,
        masteryState: health?.masteryState ?? 'NEW',
        knowledgeScore: health?.knowledgeScore ?? 0,
        confidenceScore: health?.confidenceScore ?? 0,
        retentionScore: health?.retentionScore ?? 0,
        masteryScore: health?.masteryScore ?? 0,
        priorityScore,
        unlockRatio: curriculum.unlockRatio,
        dependencyDepth: depth,
        prerequisites: prereqMap.get(skillId) ?? [],
        nextReviewDate: health?.nextReviewDate?.toISOString() ?? null,
        lastPracticed: health?.lastPracticed?.toISOString() ?? null,
      };

      if (curriculumState === 'COMPLETED') {
        if (reviewUrgency > 0 || reviewSkillIds.has(skillId)) {
          roadmapSkill.reason = this.computeReviewReason(health, reviewSkillIds.has(skillId));
          reviewSection.push(roadmapSkill);
        } else {
          masteredSection.push(roadmapSkill);
        }
      } else if (
        reviewSkillIds.has(skillId) ||
        /*
         * Both of the bands below the pass mark, not just WEAK. LEARNING is
         * under 40 and WEAK is 40-59 — so testing WEAK alone sent a skill the
         * child was scoring 50 on into the review section while one they were
         * scoring 30 on was left in "available" as though it were untouched.
         * NEW is deliberately not here: it means nothing has been measured yet,
         * which is a lesson to start rather than a result to revisit.
         */
        health?.masteryState === 'LEARNING' ||
        health?.masteryState === 'WEAK'
      ) {
        roadmapSkill.reason = this.computeReviewReason(health, reviewSkillIds.has(skillId));
        reviewSection.push(roadmapSkill);
      } else if (curriculumState === 'AVAILABLE') {
        availableSection.push(roadmapSkill);
      } else if (curriculumState === 'ACTIVE') {
        availableSection.push(roadmapSkill);
      } else {
        if (isOptional) {
          futureSection.push(roadmapSkill);
        } else {
          lockedSection.push(roadmapSkill);
        }
      }
    }

    for (const skill of allSkills) {
      if (!processedSkillIds.has(skill.id)) {
        const prereqs = prereqMap.get(skill.id) ?? [];
        const depth = this.computeDependencyDepth(skill.id, prereqMap, new Set());
        const priorityScore = this.computePriorityScore({
          curriculumState: 'LOCKED',
          masteryState: 'NEW',
          difficulty: skill.difficulty,
          displayOrder: skill.displayOrder,
          depth,
          reviewUrgency: 0,
          curriculumPriority: 0,
          knowledgeScore: 0,
          confidenceScore: 0,
          retentionScore: 0,
        });

        const roadmapSkill: RoadmapSkill = {
          skillId: skill.id,
          name: skill.name,
          skillCode: skill.skillCode,
          subjectId: skill.subjectId,
          difficulty: skill.difficulty,
          displayOrder: skill.displayOrder,
          estimatedDuration: skill.estimatedDuration,
          isCoreSkill: skill.isCoreSkill,
          isOptionalSkill: skill.isOptionalSkill,
          masteryState: 'NEW',
          knowledgeScore: 0,
          confidenceScore: 0,
          retentionScore: 0,
          masteryScore: 0,
          priorityScore,
          unlockRatio: 0,
          dependencyDepth: depth,
          prerequisites: prereqs,
          nextReviewDate: null,
          lastPracticed: null,
        };

        if (skill.isOptionalSkill) {
          futureSection.push(roadmapSkill);
        } else {
          lockedSection.push(roadmapSkill);
        }
      }
    }

    const sortByPriorityDesc = (a: RoadmapSkill, b: RoadmapSkill) => b.priorityScore - a.priorityScore;

    masteredSection.sort(sortByPriorityDesc);
    reviewSection.sort(sortByPriorityDesc);
    availableSection.sort(sortByPriorityDesc);
    lockedSection.sort(sortByPriorityDesc);
    futureSection.sort(sortByPriorityDesc);

    const sections: RoadmapSection[] = [];
    if (masteredSection.length > 0) {
      sections.push({ type: 'MASTERED', title: 'Mastered Skills', skills: masteredSection });
    }
    if (reviewSection.length > 0) {
      sections.push({ type: 'REVIEW', title: 'Needs Review', skills: reviewSection });
    }
    if (availableSection.length > 0) {
      sections.push({ type: 'AVAILABLE', title: 'Ready to Learn', skills: availableSection });
    }
    if (lockedSection.length > 0) {
      sections.push({ type: 'LOCKED', title: 'Locked Skills', skills: lockedSection });
    }
    if (futureSection.length > 0) {
      sections.push({ type: 'FUTURE', title: 'Future Skills', skills: futureSection });
    }

    const dailyQueue = this.buildDailyQueue(reviewSection, availableSection, futureSection, 5);
    const nextSkill = this.findNextSkill(reviewSection, availableSection, dailyQueue);

    const metadata: RoadmapMetadata = {
      totalSkills: masteredSection.length + reviewSection.length + availableSection.length + lockedSection.length + futureSection.length,
      masteredCount: masteredSection.length,
      reviewCount: reviewSection.length,
      availableCount: availableSection.length,
      lockedCount: lockedSection.length,
      futureCount: futureSection.length,
      dailyQueue,
      nextSkill,
    };

    const roadmap: AdaptiveRoadmap = {
      childId,
      generatedAt: new Date().toISOString(),
      version: 1,
      sections,
      metadata,
    };

    try {
      await skillRoadmapRepository.upsertDynamicRoadmap(childId, roadmap as any);
    } catch (error) {
      logger.error({ childId, error }, 'Failed to persist adaptive roadmap');
    }

    return roadmap;
  }

  async getRoadmap(childId: string): Promise<AdaptiveRoadmap> {
    const existing = await skillRoadmapRepository.findDynamicRoadmap(childId);
    if (!existing) {
      return this.generateRoadmap(childId);
    }
    return existing.roadmapJson as unknown as AdaptiveRoadmap;
  }

  async refreshRoadmap(childId: string, trigger?: RefreshTrigger['trigger']): Promise<AdaptiveRoadmap> {
    logger.info({ childId, trigger }, 'Refreshing adaptive roadmap');
    return this.generateRoadmap(childId);
  }

  async getSection(childId: string, sectionType: string): Promise<RoadmapSection | null> {
    const roadmap = await this.getRoadmap(childId);
    return roadmap.sections.find((s) => s.type === sectionType) ?? null;
  }

  async getUnlockedSkills(childId: string, page = 1, pageSize = 20): Promise<{ skills: RoadmapSkill[]; total: number }> {
    const roadmap = await this.getRoadmap(childId);
    const unlocked = roadmap.sections
      .filter((s) => s.type === 'AVAILABLE' || s.type === 'REVIEW' || s.type === 'MASTERED')
      .flatMap((s) => s.skills);
    const start = (page - 1) * pageSize;
    return {
      skills: unlocked.slice(start, start + pageSize),
      total: unlocked.length,
    };
  }

  async getLockedSkills(childId: string, page = 1, pageSize = 20): Promise<{ skills: RoadmapSkill[]; total: number }> {
    const roadmap = await this.getRoadmap(childId);
    const locked = roadmap.sections
      .filter((s) => s.type === 'LOCKED' || s.type === 'FUTURE')
      .flatMap((s) => s.skills);
    const start = (page - 1) * pageSize;
    return {
      skills: locked.slice(start, start + pageSize),
      total: locked.length,
    };
  }

  async getReviewSkills(childId: string, page = 1, pageSize = 20): Promise<{ skills: RoadmapSkill[]; total: number }> {
    const roadmap = await this.getRoadmap(childId);
    const review = roadmap.sections
      .filter((s) => s.type === 'REVIEW')
      .flatMap((s) => s.skills);
    const start = (page - 1) * pageSize;
    return {
      skills: review.slice(start, start + pageSize),
      total: review.length,
    };
  }

  async getNextSkill(childId: string): Promise<NextSkillResponse | null> {
    const roadmap = await this.getRoadmap(childId);
    const next = roadmap.metadata.nextSkill;
    if (!next) return null;

    const allSkills = roadmap.sections.flatMap((s) => s.skills);
    const skill = allSkills.find((s) => s.skillId === next.skillId);
    if (!skill) return null;

    return {
      skillId: skill.skillId,
      name: skill.name,
      skillCode: skill.skillCode,
      reason: next.reason,
      priorityScore: skill.priorityScore,
      estimatedDuration: skill.estimatedDuration,
      prerequisites: skill.prerequisites,
      subjectId: skill.subjectId,
      masteryState: skill.masteryState,
      knowledgeScore: skill.knowledgeScore,
    };
  }

  async getDailyQueue(childId: string, maxItems = 5): Promise<DailyQueueItem[]> {
    const roadmap = await this.getRoadmap(childId);
    if (roadmap.metadata.dailyQueue.length > 0) {
      return roadmap.metadata.dailyQueue.slice(0, maxItems);
    }

    const reviewSection = roadmap.sections.find((s) => s.type === 'REVIEW');
    const availableSection = roadmap.sections.find((s) => s.type === 'AVAILABLE');
    const futureSection = roadmap.sections.find((s) => s.type === 'FUTURE');

    return this.buildDailyQueue(
      reviewSection?.skills ?? [],
      availableSection?.skills ?? [],
      futureSection?.skills ?? [],
      maxItems,
    );
  }

  async unlockDownstream(childId: string, masteredSkillId: string): Promise<string[]> {
    const unlocked: string[] = [];
    const downstreamIds = await skillRoadmapRepository.findDownstreamSkillIds(masteredSkillId);

    for (const childSkillId of downstreamIds) {
      const prereqIds = await skillRoadmapRepository.findPrerequisiteSkillIds(childSkillId);
      const allMastered = await this.areAllPrerequisitesMastered(childId, prereqIds);

      if (allMastered) {
        await skillRoadmapRepository.updateCurriculumState(childId, childSkillId, 'AVAILABLE', 1);
        unlocked.push(childSkillId);
      }
    }

    return unlocked;
  }

  private async areAllPrerequisitesMastered(childId: string, prereqIds: string[]): Promise<boolean> {
    if (prereqIds.length === 0) return true;

    const curriculums = await prisma.childSkillCurriculum.findMany({
      where: {
        childId,
        skillId: { in: prereqIds },
        state: 'COMPLETED',
      },
      select: { skillId: true },
    });

    const masteredSet = new Set(curriculums.map((c) => c.skillId));
    return prereqIds.every((id) => masteredSet.has(id));
  }

  private computeReviewUrgency(
    curriculumState: string,
    inReinforcementQueue: boolean,
    nextReviewDate: Date | null,
  ): number {
    if (inReinforcementQueue) return 50;
    if (curriculumState === 'COMPLETED' && nextReviewDate) {
      const now = Date.now();
      const reviewTime = nextReviewDate.getTime();
      if (reviewTime < now) return 40;
      const diffDays = (reviewTime - now) / (1000 * 60 * 60 * 24);
      if (diffDays < 1) return 30;
      if (diffDays < 3) return 20;
      if (diffDays < 7) return 10;
    }
    return 0;
  }

  private computeReviewReason(
    health: { masteryState: string; knowledgeScore: number } | undefined,
    inQueue: boolean,
  ): string {
    if (inQueue) return 'Pending revision — reinforcement scheduled';
    if (!health) return 'Unknown state';
    /*
     * Worst first, and worded that way round. LEARNING is the band below WEAK,
     * so "still learning — continued practice recommended" was the gentlest
     * sentence in this function attached to its most worrying score.
     */
    if (health.masteryState === 'LEARNING') return 'Well below the pass mark — needs teaching again';
    if (health.masteryState === 'WEAK') return 'Weak mastery — needs practice';
    if (health.masteryState === 'STRONG' || health.masteryState === 'MASTERED') return 'Due for maintenance review';
    return 'Review recommended';
  }

  private computeDependencyDepth(
    skillId: string,
    prereqMap: Map<string, string[]>,
    visited: Set<string>,
  ): number {
    if (visited.has(skillId)) return 0;
    visited.add(skillId);
    const prereqs = prereqMap.get(skillId);
    if (!prereqs || prereqs.length === 0) return 0;
    let maxDepth = 0;
    for (const prereqId of prereqs) {
      const depth = this.computeDependencyDepth(prereqId, prereqMap, visited) + 1;
      if (depth > maxDepth) maxDepth = depth;
    }
    return maxDepth;
  }

  private computePriorityScore(params: {
    curriculumState: string;
    masteryState: string;
    difficulty: number;
    displayOrder: number;
    depth: number;
    reviewUrgency: number;
    curriculumPriority: number;
    knowledgeScore: number;
    confidenceScore: number;
    retentionScore: number;
  }): number {
    let score = 0;

    /*
     * Band weights, worst first. LEARNING outranks WEAK because it is the lower
     * band, not the milder-sounding one: `masteryStateFor` puts everything below
     * 40 in LEARNING and 40-59 in WEAK. This ladder had the two the other way
     * round, so the skills a child was struggling with most sorted *below* the
     * ones they were merely shaky on. WEAK keeps its 200 and LEARNING takes the
     * step above it, so only the relative order changes and nothing that was
     * already tuned against these numbers moves.
     */
    if (params.curriculumState === 'COMPLETED') {
      score += params.reviewUrgency;
    } else if (params.masteryState === 'LEARNING') {
      score += 250;
    } else if (params.masteryState === 'WEAK') {
      score += 200;
    } else if (params.masteryState === 'STRONG') {
      score += 50;
    } else if (params.masteryState === 'MASTERED') {
      score += 10;
    }

    score += params.reviewUrgency;

    score += params.depth * 5;

    const diffScore = Math.max(0, 10 - params.difficulty) * 2;
    score += diffScore;

    const orderScore = Math.max(0, 100 - params.displayOrder);
    score += orderScore;

    score += params.curriculumPriority * 10;

    if (params.confidenceScore < 40) score += 30;
    if (params.retentionScore < 40) score += 30;

    return score;
  }

  private buildDailyQueue(
    reviewSkills: RoadmapSkill[],
    availableSkills: RoadmapSkill[],
    futureSkills: RoadmapSkill[],
    maxItems: number,
  ): DailyQueueItem[] {
    const queue: DailyQueueItem[] = [];

    const urgentReviews = reviewSkills
      .filter((s) => s.reason && s.reason.includes('revision') || s.reason?.includes('Weak'))
      .sort((a, b) => b.priorityScore - a.priorityScore);

    for (const skill of urgentReviews) {
      if (queue.length >= maxItems) break;
      queue.push({ skillId: skill.skillId, name: skill.name, section: 'REVIEW', priorityScore: skill.priorityScore });
    }

    const otherReviews = reviewSkills
      .filter((s) => !urgentReviews.includes(s))
      .sort((a, b) => b.priorityScore - a.priorityScore);

    for (const skill of otherReviews) {
      if (queue.length >= maxItems) break;
      queue.push({ skillId: skill.skillId, name: skill.name, section: 'REVIEW', priorityScore: skill.priorityScore });
    }

    const coreAvailable = availableSkills
      .filter((s) => s.isCoreSkill)
      .sort((a, b) => b.priorityScore - a.priorityScore);

    for (const skill of coreAvailable) {
      if (queue.length >= maxItems) break;
      queue.push({ skillId: skill.skillId, name: skill.name, section: 'AVAILABLE', priorityScore: skill.priorityScore });
    }

    const otherAvailable = availableSkills
      .filter((s) => !s.isCoreSkill)
      .sort((a, b) => b.priorityScore - a.priorityScore);

    for (const skill of otherAvailable) {
      if (queue.length >= maxItems) break;
      queue.push({ skillId: skill.skillId, name: skill.name, section: 'AVAILABLE', priorityScore: skill.priorityScore });
    }

    if (queue.length < maxItems) {
      const optionalSkills = futureSkills
        .filter((s) => s.isOptionalSkill)
        .sort((a, b) => b.priorityScore - a.priorityScore);

      for (const skill of optionalSkills) {
        if (queue.length >= maxItems) break;
        queue.push({ skillId: skill.skillId, name: skill.name, section: 'FUTURE', priorityScore: skill.priorityScore });
      }
    }

    return queue;
  }

  private findNextSkill(
    reviewSection: RoadmapSkill[],
    availableSection: RoadmapSkill[],
    dailyQueue: DailyQueueItem[],
  ): NextSkillInfo | null {
    if (reviewSection.length > 0) {
      const topReview = reviewSection[0];
      return {
        skillId: topReview.skillId,
        name: topReview.name,
        reason: topReview.reason ?? 'High-priority review',
      };
    }

    if (availableSection.length > 0) {
      const topAvailable = availableSection[0];
      return {
        skillId: topAvailable.skillId,
        name: topAvailable.name,
        reason: 'Highest priority available skill',
      };
    }

    if (dailyQueue.length > 0) {
      return {
        skillId: dailyQueue[0].skillId,
        name: dailyQueue[0].name,
        reason: 'Next item in daily queue',
      };
    }

    return null;
  }
}

export const skillRoadmapService = new SkillRoadmapService();
