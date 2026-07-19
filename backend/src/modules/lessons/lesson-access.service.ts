import { prisma } from '../../config/database.js';
import { curriculumService, curriculumEngineService } from '../curriculum/index.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';

export class LessonAccessService {
  async validateLessonAccess(childId: string, lessonId: string): Promise<void> {
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) {
      throw new NotFoundError('Child profile not found');
    }

    const node = curriculumService.getLessonById(lessonId);
    if (!node) {
      throw new NotFoundError('Lesson not found in curriculum');
    }

    const childGradeId = curriculumService.resolveChildGrade(child);
    const lessonGradeId = curriculumService.getGradeOfLesson(lessonId);

    if (lessonGradeId !== childGradeId) {
      throw new ForbiddenError("Access denied: lesson is outside the learner's grade");
    }

    // Check unlock status
    const gradeLessons = curriculumService.getLessonsInCurriculumOrder(childGradeId);
    const progressList = await prisma.lessonProgress.findMany({
      where: { childId },
    });
    const knowledgeStates = await prisma.knowledgeState.findMany({
      where: { childId },
    });

    const isUnlocked = curriculumEngineService.isLessonUnlocked(
      lessonId,
      gradeLessons,
      progressList,
      knowledgeStates
    );

    if (!isUnlocked) {
      throw new ForbiddenError('Access denied: lesson is currently locked');
    }
  }
}

export const lessonAccessService = new LessonAccessService();
