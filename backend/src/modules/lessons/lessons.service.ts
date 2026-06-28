import { lessonsRepository } from './lessons.repository.js';

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

  async createLesson(data: any) {
    return lessonsRepository.create(data);
  }

  async updateLesson(id: string, data: any) {
    return lessonsRepository.update(id, data);
  }

  async deleteLesson(id: string) {
    return lessonsRepository.delete(id);
  }
}

export const lessonsService = new LessonsService();

