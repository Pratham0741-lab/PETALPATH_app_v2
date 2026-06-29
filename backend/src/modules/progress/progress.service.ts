import { progressRepository } from './progress.repository.js';
import { Prisma } from '@prisma/client';

export class ProgressService {
  async getAllProgress() {
    return progressRepository.findAll();
  }

  async getProgressById(id: string) {
    return progressRepository.findById(id);
  }

  async createProgress(data: Prisma.LessonProgressCreateInput) {
    return progressRepository.create(data);
  }

  async updateProgress(id: string, data: Prisma.LessonProgressUpdateInput) {
    return progressRepository.update(id, data);
  }

  async deleteProgress(id: string) {
    return progressRepository.delete(id);
  }
}

export const progressService = new ProgressService();
