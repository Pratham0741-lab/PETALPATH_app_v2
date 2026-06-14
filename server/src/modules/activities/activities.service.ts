import { activitiesRepository } from './activities.repository.js';

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

  async createActivity(data: any) {
    return activitiesRepository.create(data);
  }

  async updateActivity(id: string, data: any) {
    return activitiesRepository.update(id, data);
  }

  async deleteActivity(id: string) {
    return activitiesRepository.delete(id);
  }
}

export const activitiesService = new ActivitiesService();

