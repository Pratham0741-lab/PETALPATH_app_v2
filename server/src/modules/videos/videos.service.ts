import { videosRepository } from './videos.repository.js';

export class VideosService {
  async getAllVideos(activityId?: string) {
    if (activityId) {
      const video = await videosRepository.findByActivityId(activityId);
      return video ? [video] : [];
    }
    return videosRepository.findAll();
  }

  async getVideoById(id: string) {
    return videosRepository.findById(id);
  }

  async createVideo(data: any) {
    return videosRepository.create(data);
  }

  async updateVideo(id: string, data: any) {
    return videosRepository.update(id, data);
  }

  async deleteVideo(id: string) {
    return videosRepository.delete(id);
  }
}

export const videosService = new VideosService();

