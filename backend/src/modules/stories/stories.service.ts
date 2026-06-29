import { storiesRepository } from './stories.repository.js';
import { Prisma } from '@prisma/client';

export class StoriesService {
  async getAllStories() {
    return storiesRepository.findAll();
  }

  async getStoryById(id: string) {
    return storiesRepository.findById(id);
  }

  async createStory(data: Prisma.StoryCreateInput) {
    return storiesRepository.create(data);
  }

  async updateStory(id: string, data: Prisma.StoryUpdateInput) {
    return storiesRepository.update(id, data);
  }

  async deleteStory(id: string) {
    return storiesRepository.delete(id);
  }
}

export const storiesService = new StoriesService();
