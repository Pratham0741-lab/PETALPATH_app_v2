import { activitiesRepository } from './activities.repository.js';
import { Prisma } from '@prisma/client';

export class ActivitiesService {
  async getAllActivities(lessonId?: string) {
    if (lessonId) {
      return activitiesRepository.findByLessonId(lessonId);
    }
    return activitiesRepository.findAll();
  }

  async getActivityById(id: string) {
    return activitiesRepository.findById(id);
  }

  async createActivity(data: Prisma.ActivityUncheckedCreateInput) {
    return activitiesRepository.create(data);
  }

  async updateActivity(id: string, data: Prisma.ActivityUncheckedUpdateInput) {
    return activitiesRepository.update(id, data);
  }

  async deleteActivity(id: string) {
    return activitiesRepository.delete(id);
  }
}

export const activitiesService = new ActivitiesService();

