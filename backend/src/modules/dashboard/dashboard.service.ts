import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../utils/errors.js';
import { curriculumService, curriculumEngineService } from '../curriculum/index.js';
import { storageService } from '../../shared/services/storage.service.js';
import {
  DashboardOverview,
  ProgressOverview,
  ThemeProgressDetail,
  SubjectProgress,
  AssessmentSummary,
  MasterySummary,
  LearningHistory,
  RewardItem,
  AchievementSummary,
  SubjectMastery,
  LessonMastery,
  LatestAssessmentInfo,
  LearningHistoryEvent,
} from './dashboard.types.js';

export class DashboardService {
  async getDashboardOverview(childId: string): Promise<DashboardOverview> {
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) {
      throw new NotFoundError('Child not found');
    }

    const gradeId = curriculumService.resolveChildGrade(child);
    const gradeCurriculum = curriculumService.getCurriculumByGrade(gradeId);
    if (!gradeCurriculum) {
      throw new NotFoundError(`Curriculum not found for grade: ${gradeId}`);
    }

    const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId);
    const lessonIds = lessons.map((l) => l.id);

    // Fetch child progress, knowledge states, rewards, attempts
    const progressList = await prisma.lessonProgress.findMany({
      where: { childId, lessonId: { in: lessonIds } },
    });
    const progressMap = new Map<string, any>(progressList.map((p) => [p.lessonId, p]));

    const knowledgeStates = await prisma.knowledgeState.findMany({
      where: { childId },
    });

    const rewards = await prisma.reward.findMany({
      where: { childId },
    });

    const completedAttempts = await prisma.assessmentAttempt.findMany({
      where: { childId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
    });

    // 1. Current Lesson
    const nextLessonId = curriculumEngineService.determineNextAvailableLesson(
      lessons,
      progressList,
      knowledgeStates
    );
    const nextLessonNode = nextLessonId ? curriculumService.getLessonById(nextLessonId) : null;

    // 2. Current Theme
    let currentTheme: { id: string; title: string } | null = null;
    if (nextLessonNode) {
      const parentTheme = gradeCurriculum.themes.find((t) =>
        t.nodes.some((n) => n.id === nextLessonNode.id)
      );
      if (parentTheme) {
        currentTheme = { id: parentTheme.id, title: parentTheme.title };
      }
    }

    // 3. Progress Overview stats
    const completedLessons = progressList.filter((p) => p.status === 'COMPLETED').length;
    const totalLessons = lessons.length;
    const lessonCompletionPercentage =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    let completedThemesCount = 0;
    for (const theme of gradeCurriculum.themes) {
      const themeLessonIds = theme.nodes.map((n) => n.id);
      const themeCompletedCount = progressList.filter(
        (p) => themeLessonIds.includes(p.lessonId) && p.status === 'COMPLETED'
      ).length;
      if (themeCompletedCount === theme.nodes.length && theme.nodes.length > 0) {
        completedThemesCount++;
      }
    }
    const totalThemes = gradeCurriculum.themes.length;
    const themeCompletionPercentage =
      totalThemes > 0 ? Math.round((completedThemesCount / totalThemes) * 100) : 0;

    const earnedXP = rewards.reduce((sum, r) => sum + r.points, 0);
    const earnedStars = progressList.reduce((sum, p) => sum + (p.totalStars ?? 0), 0);

    const progressOverview: ProgressOverview = {
      completedLessons,
      totalLessons,
      lessonCompletionPercentage,
      completedThemes: completedThemesCount,
      totalThemes,
      themeCompletionPercentage,
      earnedXP,
      earnedStars,
    };

    // 4. Subject Progress
    const subjectsMap = new Map<string, { completed: number; total: number }>();
    for (const node of lessons) {
      const subject = node.curriculum.subject || 'Other';
      const stats = subjectsMap.get(subject) || { completed: 0, total: 0 };
      stats.total++;
      if (progressMap.get(node.id)?.status === 'COMPLETED') {
        stats.completed++;
      }
      subjectsMap.set(subject, stats);
    }
    const subjectProgressList: SubjectProgress[] = Array.from(subjectsMap.entries()).map(
      ([subject, stats]) => ({
        subject,
        completedLessons: stats.completed,
        totalLessons: stats.total,
        percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      })
    );

    // 5. Latest Assessment
    let latestAssessment: LatestAssessmentInfo | null = null;
    if (completedAttempts.length > 0) {
      const latest = completedAttempts[0];
      const lessonAssessment = curriculumService.getAssessment(latest.assessmentId);
      const title = lessonAssessment ? lessonAssessment.title : 'Placement Assessment';
      latestAssessment = {
        id: latest.id,
        assessmentId: latest.assessmentId,
        title,
        score: latest.score ?? 0,
        maxScore: latest.maxScore ?? 0,
        percentage: latest.percentage ?? 0,
        completedAt: latest.completedAt!,
      };
    }

    return {
      grade: {
        id: gradeCurriculum.grade.id,
        name: gradeCurriculum.grade.name,
        description: gradeCurriculum.grade.description,
      },
      currentTheme,
      currentLesson: nextLessonNode ? { id: nextLessonNode.id, title: nextLessonNode.title } : null,
      progressOverview,
      subjectProgress: subjectProgressList,
      latestAssessment,
    };
  }

  async getCurriculumProgress(childId: string) {
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) {
      throw new NotFoundError('Child not found');
    }

    const gradeId = curriculumService.resolveChildGrade(child);
    const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId);
    const lessonIds = lessons.map((l) => l.id);

    const progressList = await prisma.lessonProgress.findMany({
      where: { childId, lessonId: { in: lessonIds } },
    });

    const completedLessons = progressList.filter((p) => p.status === 'COMPLETED').length;
    const totalLessons = lessons.length;
    const remainingLessons = totalLessons - completedLessons;
    const lessonCompletionPercentage =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      gradeId,
      completedLessons,
      totalLessons,
      remainingLessons,
      lessonCompletionPercentage,
    };
  }

  async getThemeProgress(childId: string): Promise<ThemeProgressDetail[]> {
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) {
      throw new NotFoundError('Child not found');
    }

    const gradeId = curriculumService.resolveChildGrade(child);
    const gradeCurriculum = curriculumService.getCurriculumByGrade(gradeId);
    if (!gradeCurriculum) {
      throw new NotFoundError(`Curriculum not found for grade: ${gradeId}`);
    }

    const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId);
    const lessonIds = lessons.map((l) => l.id);

    const progressList = await prisma.lessonProgress.findMany({
      where: { childId, lessonId: { in: lessonIds } },
    });

    return gradeCurriculum.themes.map((theme) => {
      const themeLessonIds = theme.nodes.map((n) => n.id);
      const completedCount = progressList.filter(
        (p) => themeLessonIds.includes(p.lessonId) && p.status === 'COMPLETED'
      ).length;
      const totalCount = theme.nodes.length;
      return {
        id: theme.id,
        title: theme.title,
        order: theme.order,
        completedLessons: completedCount,
        totalLessons: totalCount,
        percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
        isCompleted: completedCount === totalCount && totalCount > 0,
      };
    });
  }

  async getSubjectProgress(childId: string): Promise<SubjectProgress[]> {
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) {
      throw new NotFoundError('Child not found');
    }

    const gradeId = curriculumService.resolveChildGrade(child);
    const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId);
    const lessonIds = lessons.map((l) => l.id);

    const progressList = await prisma.lessonProgress.findMany({
      where: { childId, lessonId: { in: lessonIds } },
    });

    const subjectsMap = new Map<string, { completed: number; total: number }>();
    for (const node of lessons) {
      const subject = node.curriculum.subject || 'Other';
      const stats = subjectsMap.get(subject) || { completed: 0, total: 0 };
      stats.total++;
      if (progressList.some((p) => p.lessonId === node.id && p.status === 'COMPLETED')) {
        stats.completed++;
      }
      subjectsMap.set(subject, stats);
    }

    return Array.from(subjectsMap.entries()).map(([subject, stats]) => ({
      subject,
      completedLessons: stats.completed,
      totalLessons: stats.total,
      percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    }));
  }

  async getAssessmentSummary(childId: string): Promise<AssessmentSummary> {
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) {
      throw new NotFoundError('Child not found');
    }

    const gradeId = curriculumService.resolveChildGrade(child);
    const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId);

    // List lessons containing assessments
    const assessmentsInGrade = lessons.filter((l) => l.assessment !== undefined);
    const totalAssessments = assessmentsInGrade.length;

    const completedAttempts = await prisma.assessmentAttempt.findMany({
      where: { childId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
    });

    // Count distinct assessments in grade completed by the child
    const completedGradeAssessments = new Set<string>();
    let highestMasteryPercentage = 0;

    for (const attempt of completedAttempts) {
      const percentage = attempt.percentage ?? 0;
      if (percentage > highestMasteryPercentage) {
        highestMasteryPercentage = percentage;
      }
      if (assessmentsInGrade.some((a) => a.id === attempt.assessmentId)) {
        completedGradeAssessments.add(attempt.assessmentId);
      }
    }

    const completedAssessmentsCount = completedGradeAssessments.size;
    const assessmentCompletionPercentage =
      totalAssessments > 0 ? Math.round((completedAssessmentsCount / totalAssessments) * 100) : 0;

    let latestAssessment: LatestAssessmentInfo | null = null;
    if (completedAttempts.length > 0) {
      const latest = completedAttempts[0];
      const lessonAssessment = curriculumService.getAssessment(latest.assessmentId);
      const title = lessonAssessment ? lessonAssessment.title : 'Placement Assessment';
      latestAssessment = {
        id: latest.id,
        assessmentId: latest.assessmentId,
        title,
        score: latest.score ?? 0,
        maxScore: latest.maxScore ?? 0,
        percentage: latest.percentage ?? 0,
        completedAt: latest.completedAt!,
      };
    }

    return {
      completedAssessments: completedAssessmentsCount,
      totalAssessments,
      assessmentCompletionPercentage,
      latestAssessment,
      highestMasteryPercentage,
    };
  }

  async getMasterySummary(childId: string): Promise<MasterySummary> {
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) {
      throw new NotFoundError('Child not found');
    }

    const gradeId = curriculumService.resolveChildGrade(child);
    const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId);

    const knowledgeStates = await prisma.knowledgeState.findMany({
      where: { childId },
    });
    const knowledgeMap = new Map<string, any>(knowledgeStates.map((k) => [k.topicId, k]));

    // 1. Mastery by lesson
    const lessonMasteries: LessonMastery[] = lessons.map((lesson) => {
      const ks = knowledgeMap.get(lesson.id);
      return {
        lessonId: lesson.id,
        title: lesson.title,
        mastery: ks?.mastery ?? 0,
        state: ks?.state ?? 'NOT_STARTED',
      };
    });

    // 2. Mastery by subject
    const subjectMasteryMap = new Map<string, { total: number; count: number }>();
    let overallSum = 0;

    for (const node of lessons) {
      const ks = knowledgeMap.get(node.id);
      const masteryValue = ks?.mastery ?? 0;
      overallSum += masteryValue;

      const subject = node.curriculum.subject || 'Other';
      const stats = subjectMasteryMap.get(subject) || { total: 0, count: 0 };
      stats.total += masteryValue;
      stats.count++;
      subjectMasteryMap.set(subject, stats);
    }

    const subjectMasteryList: SubjectMastery[] = Array.from(subjectMasteryMap.entries()).map(
      ([subject, stats]) => ({
        subject,
        averageMastery: stats.count > 0 ? Math.round(stats.total / stats.count) : 0,
      })
    );

    // 3. Overall average mastery
    const overallMastery = lessons.length > 0 ? Math.round(overallSum / lessons.length) : 0;

    return {
      overallMastery,
      subjectMastery: subjectMasteryList,
      lessonMastery: lessonMasteries,
    };
  }

  async getLearningHistory(childId: string): Promise<LearningHistory> {
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) {
      throw new NotFoundError('Child not found');
    }

    const gradeId = curriculumService.resolveChildGrade(child);
    const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId);
    const lessonMap = new Map<string, string>(lessons.map((l) => [l.id, l.title]));

    // Fetch completions
    const completedProgressList = await prisma.lessonProgress.findMany({
      where: { childId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
    });

    const completedAttempts = await prisma.assessmentAttempt.findMany({
      where: { childId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
    });

    const rewards = await prisma.reward.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
    });

    // Assemble unified history timeline
    const events: LearningHistoryEvent[] = [];

    completedProgressList.forEach((p) => {
      const title = lessonMap.get(p.lessonId) || 'Lesson';
      events.push({
        type: 'LESSON_COMPLETED',
        id: p.id,
        title: `Completed Lesson: ${title}`,
        description: `Successfully completed all standard activities for "${title}".`,
        detail: p.totalStars ?? 0,
        timestamp: p.completedAt!,
      });
    });

    completedAttempts.forEach((a) => {
      const lessonAssessment = curriculumService.getAssessment(a.assessmentId);
      const title = lessonAssessment ? lessonAssessment.title : 'Placement Assessment';
      events.push({
        type: 'ASSESSMENT_COMPLETED',
        id: a.id,
        title: `Finished Assessment: ${title}`,
        description: `Scored ${a.score}/${a.maxScore} (${a.percentage}%).`,
        detail: `${a.percentage ?? 0}%`,
        timestamp: a.completedAt!,
      });
    });

    rewards.forEach((r) => {
      events.push({
        type: 'REWARD_EARNED',
        id: r.id,
        title: `Earned Reward: ${r.title}`,
        description: r.description ?? '',
        detail: r.points,
        timestamp: r.createdAt,
      });
    });

    // Sort unified list descending
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return { history: events };
  }

  async getEarnedRewards(childId: string): Promise<RewardItem[]> {
    const rewards = await prisma.reward.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
    });

    return rewards.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description ?? '',
      points: r.points,
      createdAt: r.createdAt,
    }));
  }

  async getAchievements(childId: string): Promise<AchievementSummary> {
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) {
      throw new NotFoundError('Child not found');
    }

    const gradeId = curriculumService.resolveChildGrade(child);
    const gradeCurriculum = curriculumService.getCurriculumByGrade(gradeId);
    if (!gradeCurriculum) {
      throw new NotFoundError(`Curriculum not found for grade: ${gradeId}`);
    }

    const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId);
    const lessonIds = lessons.map((l) => l.id);

    // Lessons and Stars
    const progressList = await prisma.lessonProgress.findMany({
      where: { childId, lessonId: { in: lessonIds } },
    });
    const completedLessons = progressList.filter((p) => p.status === 'COMPLETED').length;
    const earnedStars = progressList.reduce((sum, p) => sum + (p.totalStars ?? 0), 0);

    // XP
    const rewards = await prisma.reward.findMany({ where: { childId } });
    const earnedXP = rewards.reduce((sum, r) => sum + r.points, 0);

    // Completed Themes
    let completedThemesCount = 0;
    for (const theme of gradeCurriculum.themes) {
      const themeLessonIds = theme.nodes.map((n) => n.id);
      const themeCompletedCount = progressList.filter(
        (p) => themeLessonIds.includes(p.lessonId) && p.status === 'COMPLETED'
      ).length;
      if (themeCompletedCount === theme.nodes.length && theme.nodes.length > 0) {
        completedThemesCount++;
      }
    }

    // Completed Grades
    const completedGradesCount = completedLessons === lessons.length && lessons.length > 0 ? 1 : 0;

    // Badges
    const childBadges = await prisma.childBadge.findMany({
      where: { childId },
      include: { badge: true },
    });
    const badges = childBadges.map((cb) => ({
      id: cb.badge.id,
      name: cb.badge.name,
      description: cb.badge.description ?? '',
      imagePath: storageService.getPublicUrl(cb.badge.iconKey),
      earnedAt: cb.earnedAt,
    }));

    // Stickers
    const childStickers = await prisma.childSticker.findMany({
      where: { childId },
      include: { sticker: true },
    });
    const stickers = childStickers.map((cs) => ({
      id: cs.sticker.id,
      name: cs.sticker.name,
      description: cs.sticker.description ?? '',
      imagePath: storageService.getPublicUrl(cs.sticker.iconKey),
      earnedAt: cs.unlockedAt, // Join model ChildSticker uses unlockedAt column name
    }));

    return {
      earnedXP,
      earnedStars,
      completedLessons,
      completedThemes: completedThemesCount,
      completedGrades: completedGradesCount,
      badges,
      stickers,
    };
  }
}

export const dashboardService = new DashboardService();
