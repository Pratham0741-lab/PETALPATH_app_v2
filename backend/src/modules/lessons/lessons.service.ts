import { lessonsRepository } from './lessons.repository.js';
import { Prisma } from '@prisma/client';

export class LessonsService {
  async getAllLessons(moduleId?: string) {
    if (moduleId) {
      return lessonsRepository.findByModuleId(moduleId);
    }
    return lessonsRepository.findAll();
  }

  async getLessonById(id: string) {
    return lessonsRepository.findById(id);
  }

  async createLesson(data: Prisma.LessonUncheckedCreateInput) {
    return lessonsRepository.create(data);
  }

  async updateLesson(id: string, data: Prisma.LessonUncheckedUpdateInput) {
    return lessonsRepository.update(id, data);
  }

  async deleteLesson(id: string) {
    return lessonsRepository.delete(id);
  }
}

export const lessonsService = new LessonsService();

