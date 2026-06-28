import { storiesRepository } from './stories.repository.js';

export class StoriesService {
  async getAllStories() {
    return storiesRepository.findAll();
  }

  async getStoryById(id: string) {
    return storiesRepository.findById(id);
  }

  async createStory(data: any) {
    return storiesRepository.create(data);
  }

  async updateStory(id: string, data: any) {
    return storiesRepository.update(id, data);
  }

  async deleteStory(id: string) {
    return storiesRepository.delete(id);
  }
}

export const storiesService = new StoriesService();
