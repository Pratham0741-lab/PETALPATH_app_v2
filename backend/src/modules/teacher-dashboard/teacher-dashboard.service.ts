import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../utils/errors.js';
import { curriculumService, curriculumEngineService } from '../curriculum/index.js';
import { storageService } from '../../shared/services/storage.service.js';
import {
  ClassroomOverview,
  ClassroomProgressDetail,
  LearnerProgressSummary,
  ThemeCompletionStats,
  SubjectCompletionStats,
  ClassroomAssessmentSummary,
  ClassroomMasterySummary,
  LearnerAssessmentResult,
  ClassroomAchievementsDetail,
  HighScoreDetail,
  LatestAttemptDetail,
  AssessmentCompletionRate,
  StudentMasteryStats,
  SubjectMasteryStats,
} from './teacher-dashboard.types.js';

export class TeacherDashboardService {
  async getClassroomDashboard(classroomId: string): Promise<ClassroomOverview> {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        learners: {
          include: {
            child: {
              include: {
                lessonProgress: true,
                knowledgeStates: true,
              },
            },
          },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    const learners = classroom.learners;
    if (learners.length === 0) {
      return {
        id: classroom.id,
        name: classroom.name,
        code: classroom.code,
        totalLearners: 0,
        activeLearners: 0,
        classroomCompletionPercentage: 0,
        learners: [],
      };
    }

    let activeCount = 0;
    let completionPercentageSum = 0;
    const learnerSummaries: LearnerProgressSummary[] = [];

    for (const enrollment of learners) {
      const child = enrollment.child;
      const progressList = child.lessonProgress;
      const knowledgeStates = child.knowledgeStates;

      // Active = at least one started or completed lesson progress record
      const isActive = progressList.length > 0;
      if (isActive) {
        activeCount++;
      }

      const gradeId = curriculumService.resolveChildGrade(child);
      const gradeCurriculum = curriculumService.getCurriculumByGrade(gradeId);
      const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId);
      const totalLessons = lessons.length;
      const completedLessons = progressList.filter((p) => p.status === 'COMPLETED').length;
      const childCompletionPct =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      completionPercentageSum += childCompletionPct;

      // Next lesson and theme
      const nextLessonId = curriculumEngineService.determineNextAvailableLesson(
        lessons,
        progressList,
        knowledgeStates
      );
      const nextLessonNode = nextLessonId ? curriculumService.getLessonById(nextLessonId) : null;

      let currentTheme: { id: string; title: string } | null = null;
      if (nextLessonNode && gradeCurriculum) {
        const parentTheme = gradeCurriculum.themes.find((t) =>
          t.nodes.some((n) => n.id === nextLessonNode.id)
        );
        if (parentTheme) {
          currentTheme = { id: parentTheme.id, title: parentTheme.title };
        }
      }

      learnerSummaries.push({
        id: child.id,
        name: child.name,
        currentGrade: gradeCurriculum
          ? { id: gradeCurriculum.grade.id, name: gradeCurriculum.grade.name }
          : null,
        currentTheme,
        currentLesson: nextLessonNode ? { id: nextLessonNode.id, title: nextLessonNode.title } : null,
        completionPercentage: childCompletionPct,
        active: isActive,
      });
    }

    const classroomCompletionPercentage = Math.round(completionPercentageSum / learners.length);

    return {
      id: classroom.id,
      name: classroom.name,
      code: classroom.code,
      totalLearners: learners.length,
      activeLearners: activeCount,
      classroomCompletionPercentage,
      learners: learnerSummaries,
    };
  }

  async getClassroomProgress(classroomId: string): Promise<ClassroomProgressDetail> {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        learners: {
          include: {
            child: {
              include: {
                lessonProgress: true,
              },
            },
          },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    const learners = classroom.learners;
    if (learners.length === 0) {
      return {
        totalLearners: 0,
        activeLearners: 0,
        averageCompletedLessons: 0,
        averageCompletionPercentage: 0,
      };
    }

    let activeCount = 0;
    let completedLessonsSum = 0;
    let completionPercentageSum = 0;

    for (const enrollment of learners) {
      const child = enrollment.child;
      const progressList = child.lessonProgress;
      const isActive = progressList.length > 0;
      if (isActive) {
        activeCount++;
      }

      const completed = progressList.filter((p) => p.status === 'COMPLETED').length;
      completedLessonsSum += completed;

      const gradeId = curriculumService.resolveChildGrade(child);
      const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId);
      const childCompletionPct =
        lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;
      completionPercentageSum += childCompletionPct;
    }

    return {
      totalLearners: learners.length,
      activeLearners: activeCount,
      averageCompletedLessons: Math.round(completedLessonsSum / learners.length),
      averageCompletionPercentage: Math.round(completionPercentageSum / learners.length),
    };
  }

  async getLearnerProgress(classroomId: string, childId: string) {
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) {
      throw new NotFoundError('Learner profile not found');
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

    const knowledgeStates = await prisma.knowledgeState.findMany({
      where: { childId },
    });

    const nextLessonId = curriculumEngineService.determineNextAvailableLesson(
      lessons,
      progressList,
      knowledgeStates
    );
    const nextLessonNode = nextLessonId ? curriculumService.getLessonById(nextLessonId) : null;

    const completedLessons = progressList.filter((p) => p.status === 'COMPLETED').length;
    const totalLessons = lessons.length;
    const remainingLessons = totalLessons - completedLessons;
    const completionPercentage =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      id: child.id,
      name: child.name,
      grade: {
        id: gradeCurriculum.grade.id,
        name: gradeCurriculum.grade.name,
      },
      currentLesson: nextLessonNode ? { id: nextLessonNode.id, title: nextLessonNode.title } : null,
      completedLessons,
      totalLessons,
      remainingLessons,
      completionPercentage,
    };
  }

  async getClassroomThemeProgress(classroomId: string): Promise<ThemeCompletionStats[]> {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        learners: {
          include: {
            child: true,
          },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    const learners = classroom.learners;
    if (learners.length === 0) {
      return [];
    }

    // Accumulate theme statistics across learners
    const themeMap = new Map<string, { title: string; order: number; percentageSum: number; count: number }>();

    for (const enrollment of learners) {
      const child = enrollment.child;
      const gradeId = curriculumService.resolveChildGrade(child);
      const gradeCurriculum = curriculumService.getCurriculumByGrade(gradeId);
      if (!gradeCurriculum) continue;

      const progressList = await prisma.lessonProgress.findMany({
        where: { childId: child.id, lessonId: { in: gradeCurriculum.themes.flatMap((t) => t.nodes.map((n) => n.id)) } },
      });

      for (const theme of gradeCurriculum.themes) {
        const themeLessonIds = theme.nodes.map((n) => n.id);
        const completedCount = progressList.filter(
          (p) => themeLessonIds.includes(p.lessonId) && p.status === 'COMPLETED'
        ).length;
        const totalCount = theme.nodes.length;
        const childThemePercentage =
          totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        const existing = themeMap.get(theme.id) || {
          title: theme.title,
          order: theme.order,
          percentageSum: 0,
          count: 0,
        };
        existing.percentageSum += childThemePercentage;
        existing.count++;
        themeMap.set(theme.id, existing);
      }
    }

    return Array.from(themeMap.entries()).map(([id, val]) => ({
      id,
      title: val.title,
      order: val.order,
      averageCompletionPercentage: val.count > 0 ? Math.round(val.percentageSum / val.count) : 0,
    })).sort((a, b) => a.order - b.order);
  }

  async getClassroomSubjectProgress(classroomId: string): Promise<SubjectCompletionStats[]> {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        learners: {
          include: {
            child: true,
          },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    const learners = classroom.learners;
    if (learners.length === 0) {
      return [];
    }

    const subjectMap = new Map<string, { percentageSum: number; count: number }>();

    for (const enrollment of learners) {
      const child = enrollment.child;
      const gradeId = curriculumService.resolveChildGrade(child);
      const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId);
      const lessonIds = lessons.map((l) => l.id);

      const progressList = await prisma.lessonProgress.findMany({
        where: { childId: child.id, lessonId: { in: lessonIds } },
      });

      const childSubjects = new Map<string, { completed: number; total: number }>();
      for (const node of lessons) {
        const subject = node.curriculum.subject || 'Other';
        const stats = childSubjects.get(subject) || { completed: 0, total: 0 };
        stats.total++;
        if (progressList.some((p) => p.lessonId === node.id && p.status === 'COMPLETED')) {
          stats.completed++;
        }
        childSubjects.set(subject, stats);
      }

      for (const [subject, stats] of childSubjects.entries()) {
        const percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
        const existing = subjectMap.get(subject) || { percentageSum: 0, count: 0 };
        existing.percentageSum += percentage;
        existing.count++;
        subjectMap.set(subject, existing);
      }
    }

    return Array.from(subjectMap.entries()).map(([subject, val]) => ({
      subject,
      averageCompletionPercentage: val.count > 0 ? Math.round(val.percentageSum / val.count) : 0,
    }));
  }

  async getClassroomAssessmentSummary(classroomId: string): Promise<ClassroomAssessmentSummary> {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        learners: {
          include: {
            child: true,
          },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    const learners = classroom.learners;
    if (learners.length === 0) {
      return {
        overallAssessmentCompletionPercentage: 0,
        classroomAverageScorePercentage: 0,
        completionRates: [],
        highestScores: [],
        latestScores: [],
      };
    }

    const childIds = learners.map((l) => l.child.id);

    // Fetch all completed attempts for students in this classroom
    const completedAttempts = await prisma.assessmentAttempt.findMany({
      where: { childId: { in: childIds }, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      include: { child: true },
    });

    // 1. Overall assessment completion percentage per student
    let completionPctSum = 0;
    const assessmentRatesMap = new Map<string, { title: string; completedCount: number }>();

    for (const enrollment of learners) {
      const child = enrollment.child;
      const gradeId = curriculumService.resolveChildGrade(child);
      const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId);
      const assessmentsInGrade = lessons.filter((l) => l.assessment !== undefined);
      const totalAssessments = assessmentsInGrade.length;

      const childAttempts = completedAttempts.filter((a) => a.childId === child.id);
      const completedAssessmentsSet = new Set<string>();

      for (const a of childAttempts) {
        if (assessmentsInGrade.some((ag) => ag.id === a.assessmentId)) {
          completedAssessmentsSet.add(a.assessmentId);
        }
      }

      const completedCount = completedAssessmentsSet.size;
      const childPct = totalAssessments > 0 ? Math.round((completedCount / totalAssessments) * 100) : 0;
      completionPctSum += childPct;

      // Track rates for class-wide assessment coverage
      for (const node of assessmentsInGrade) {
        const existing = assessmentRatesMap.get(node.id) || {
          title: node.assessment?.title || node.title || 'Assessment',
          completedCount: 0,
        };
        if (completedAssessmentsSet.has(node.id)) {
          existing.completedCount++;
        }
        assessmentRatesMap.set(node.id, existing);
      }
    }

    const overallAssessmentCompletionPercentage = Math.round(completionPctSum / learners.length);

    // 2. Classroom Average Score
    const scoredAttempts = completedAttempts.filter((a) => a.percentage !== null);
    const scoreSum = scoredAttempts.reduce((sum, a) => sum + (a.percentage ?? 0), 0);
    const classroomAverageScorePercentage = scoredAttempts.length > 0 ? Math.round(scoreSum / scoredAttempts.length) : 0;

    // 3. Completion Rates
    const completionRates: AssessmentCompletionRate[] = Array.from(assessmentRatesMap.entries()).map(
      ([assessmentId, val]) => ({
        assessmentId,
        title: val.title,
        completionRatePercentage: Math.round((val.completedCount / learners.length) * 100),
      })
    );

    // 4. Highest Scores per assessment
    const highestScoresMap = new Map<string, HighScoreDetail>();
    completedAttempts.forEach((a) => {
      const currentHighest = highestScoresMap.get(a.assessmentId);
      const percentage = a.percentage ?? 0;
      if (!currentHighest || percentage > currentHighest.percentage) {
        highestScoresMap.set(a.assessmentId, {
          childId: a.childId,
          childName: a.child.name,
          score: a.score ?? 0,
          maxScore: a.maxScore ?? 0,
          percentage,
        });
      }
    });
    const highestScores = Array.from(highestScoresMap.values());

    // 5. Latest attempts
    const latestScores: LatestAttemptDetail[] = completedAttempts.slice(0, 10).map((a) => {
      const lessonAssessment = curriculumService.getAssessment(a.assessmentId);
      const title = lessonAssessment ? lessonAssessment.title : 'Placement Assessment';
      return {
        childId: a.childId,
        childName: a.child.name,
        assessmentId: a.assessmentId,
        title,
        percentage: a.percentage ?? 0,
        completedAt: a.completedAt!,
      };
    });

    return {
      overallAssessmentCompletionPercentage,
      classroomAverageScorePercentage,
      completionRates,
      highestScores,
      latestScores,
    };
  }

  async getClassroomMasterySummary(classroomId: string): Promise<ClassroomMasterySummary> {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        learners: {
          include: {
            child: true,
          },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    const learners = classroom.learners;
    if (learners.length === 0) {
      return {
        overallClassroomMastery: 0,
        subjectMastery: [],
        studentMastery: [],
      };
    }

    const childIds = learners.map((l) => l.child.id);

    const knowledgeStates = await prisma.knowledgeState.findMany({
      where: { childId: { in: childIds } },
    });

    let overallSum = 0;
    let overallCount = 0;
    const studentMasteryList: StudentMasteryStats[] = [];
    const subjectMasteryAccumulator = new Map<string, { total: number; count: number }>();

    for (const enrollment of learners) {
      const child = enrollment.child;
      const gradeId = curriculumService.resolveChildGrade(child);
      const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId);

      const childKnowledge = knowledgeStates.filter((k) => k.childId === child.id);
      const childKnowledgeMap = new Map(childKnowledge.map((k) => [k.topicId, k]));

      let childMasterySum = 0;

      for (const node of lessons) {
        const masteryValue = childKnowledgeMap.get(node.id)?.mastery ?? 0;
        childMasterySum += masteryValue;
        overallSum += masteryValue;
        overallCount++;

        const subject = node.curriculum.subject || 'Other';
        const stats = subjectMasteryAccumulator.get(subject) || { total: 0, count: 0 };
        stats.total += masteryValue;
        stats.count++;
        subjectMasteryAccumulator.set(subject, stats);
      }

      const childAverageMastery = lessons.length > 0 ? Math.round(childMasterySum / lessons.length) : 0;
      studentMasteryList.push({
        childId: child.id,
        childName: child.name,
        overallMastery: childAverageMastery,
      });
    }

    const overallClassroomMastery = overallCount > 0 ? Math.round(overallSum / overallCount) : 0;

    const subjectMasteryList: SubjectMasteryStats[] = Array.from(subjectMasteryAccumulator.entries()).map(
      ([subject, val]) => ({
        subject,
        averageMastery: val.count > 0 ? Math.round(val.total / val.count) : 0,
      })
    );

    return {
      overallClassroomMastery,
      subjectMastery: subjectMasteryList,
      studentMastery: studentMasteryList,
    };
  }

  async getLearnerAssessmentSummary(classroomId: string, childId: string): Promise<LearnerAssessmentResult[]> {
    const child = await prisma.child.findUnique({
      where: { id: childId, deletedAt: null },
    });
    if (!child) {
      throw new NotFoundError('Learner profile not found');
    }

    const attempts = await prisma.assessmentAttempt.findMany({
      where: { childId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
    });

    return attempts.map((a) => {
      const lessonAssessment = curriculumService.getAssessment(a.assessmentId);
      const title = lessonAssessment ? lessonAssessment.title : 'Placement Assessment';
      return {
        attemptId: a.id,
        assessmentId: a.assessmentId,
        title,
        score: a.score ?? 0,
        maxScore: a.maxScore ?? 0,
        percentage: a.percentage ?? 0,
        completedAt: a.completedAt!,
      };
    });
  }

  async getClassroomAchievements(classroomId: string): Promise<ClassroomAchievementsDetail> {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        learners: {
          include: {
            child: true,
          },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    const learners = classroom.learners;
    if (learners.length === 0) {
      return {
        totalXP: 0,
        totalStars: 0,
        totalBadges: 0,
        totalStickers: 0,
        totalCompletedLessons: 0,
        totalCompletedThemes: 0,
        totalCompletedGrades: 0,
      };
    }

    const childIds = learners.map((l) => l.child.id);

    // 1. XP
    const rewards = await prisma.reward.findMany({
      where: { childId: { in: childIds } },
    });
    const totalXP = rewards.reduce((sum, r) => sum + r.points, 0);

    // 2. Stars and Lesson Progress completions
    const progressList = await prisma.lessonProgress.findMany({
      where: { childId: { in: childIds } },
    });
    const totalStars = progressList.reduce((sum, p) => sum + (p.totalStars ?? 0), 0);
    const totalCompletedLessons = progressList.filter((p) => p.status === 'COMPLETED').length;

    // 3. Badges and Stickers
    const totalBadges = await prisma.childBadge.count({
      where: { childId: { in: childIds } },
    });
    const totalStickers = await prisma.childSticker.count({
      where: { childId: { in: childIds } },
    });

    // 4. Themes and Grades completions
    let totalCompletedThemes = 0;
    let totalCompletedGrades = 0;

    for (const enrollment of learners) {
      const child = enrollment.child;
      const gradeId = curriculumService.resolveChildGrade(child);
      const gradeCurriculum = curriculumService.getCurriculumByGrade(gradeId);
      if (!gradeCurriculum) continue;

      const childProgress = progressList.filter((p) => p.childId === child.id);
      const childCompletedCount = childProgress.filter((p) => p.status === 'COMPLETED').length;

      const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId);
      if (childCompletedCount === lessons.length && lessons.length > 0) {
        totalCompletedGrades++;
      }

      for (const theme of gradeCurriculum.themes) {
        const themeLessonIds = theme.nodes.map((n) => n.id);
        const completedCount = childProgress.filter(
          (p) => themeLessonIds.includes(p.lessonId) && p.status === 'COMPLETED'
        ).length;
        if (completedCount === theme.nodes.length && theme.nodes.length > 0) {
          totalCompletedThemes++;
        }
      }
    }

    return {
      totalXP,
      totalStars,
      totalBadges,
      totalStickers,
      totalCompletedLessons,
      totalCompletedThemes,
      totalCompletedGrades,
    };
  }
}

export const teacherDashboardService = new TeacherDashboardService();
