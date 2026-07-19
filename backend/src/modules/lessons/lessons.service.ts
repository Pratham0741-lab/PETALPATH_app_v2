import { prisma } from '../../config/database.js';
import { curriculumService, curriculumEngineService } from '../curriculum/index.js';
import { curriculumLoader } from '../curriculum/curriculum-loader.js';
import { CurriculumNode } from '../curriculum/curriculum.types.js';
import { NotFoundError } from '../../utils/errors.js';

export class LessonsService {
  private getModuleIdForLesson(lessonId: string): string {
    const lessonIndex = curriculumLoader.getLessonIndex(lessonId);
    return lessonIndex ? lessonIndex.themeId : '';
  }

  async getAllLessons(moduleId?: string) {
    if (moduleId) {
      const nodes = curriculumService.getLessonsByTheme(moduleId);
      return Promise.all(nodes.map((node) => this.getLessonById(node.id)));
    }

    const all = curriculumLoader.loadAllCurricula();
    const lessons: any[] = [];
    for (const cur of all.values()) {
      for (const theme of cur.themes) {
        for (const node of theme.nodes) {
          const detailed = await this.getLessonById(node.id);
          if (detailed) {
            lessons.push(detailed);
          }
        }
      }
    }
    return lessons;
  }

  async getLessonById(id: string) {
    const node = curriculumService.getLessonById(id);
    if (!node) return null;

    const gradeId = curriculumService.getGradeOfLesson(node.id);
    const gradeCurriculum = gradeId ? curriculumService.getCurriculumByGrade(gradeId) : null;
    const moduleId = this.getModuleIdForLesson(node.id);
    const theme = gradeCurriculum?.themes.find((t) => t.id === moduleId);

    return {
      id: node.id,
      title: node.title,
      description: node.curriculum.learning_outcome,
      displayOrder: node.order,
      difficulty: node.difficulty,
      activities: node.activities,
      reward: node.reward,
      mastery: node.mastery,
      prerequisites: node.prerequisites,
      subject: node.curriculum.subject,
      theme: theme ? { id: theme.id, title: theme.title } : null,
      grade: gradeCurriculum ? { id: gradeCurriculum.grade.id, name: gradeCurriculum.grade.name } : null,
      month: node.curriculum.month,
    };
  }

  async getUnlockedLessons(childId: string) {
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) {
      throw new NotFoundError('Child profile not found');
    }

    const gradeId = curriculumService.resolveChildGrade(child);
    const gradeLessons = curriculumService.getLessonsInCurriculumOrder(gradeId);

    const progressList = await prisma.lessonProgress.findMany({
      where: { childId },
    });
    const knowledgeStates = await prisma.knowledgeState.findMany({
      where: { childId },
    });

    const unlockedNodes = gradeLessons.filter((node) =>
      curriculumEngineService.isLessonUnlocked(
        node.id,
        gradeLessons,
        progressList,
        knowledgeStates
      )
    );

    const mapped = await Promise.all(unlockedNodes.map((n) => this.getLessonById(n.id)));
    return mapped.filter(Boolean);
  }

  async createLesson(data: any) {
    throw new Error('Curriculum metadata is read-only. Database write not permitted.');
  }

  async updateLesson(id: string, data: any) {
    throw new Error('Curriculum metadata is read-only. Database write not permitted.');
  }

  async deleteLesson(id: string) {
    throw new Error('Curriculum metadata is read-only. Database write not permitted.');
  }
}

export const lessonsService = new LessonsService();
