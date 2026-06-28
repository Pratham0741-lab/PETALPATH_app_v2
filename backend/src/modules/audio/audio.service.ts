import { audioRepository } from './audio.repository.js';

export class AudioService {
  async getAllAudio(activityId?: string) {
    if (activityId) {
      const audio = await audioRepository.findByActivityId(activityId);
      return audio ? [audio] : [];
    }
    return audioRepository.findAll();
  }

  async getAudioById(id: string) {
    return audioRepository.findById(id);
  }

  async createAudio(data: any) {
    return audioRepository.create(data);
  }

  async updateAudio(id: string, data: any) {
    return audioRepository.update(id, data);
  }

  async deleteAudio(id: string) {
    return audioRepository.delete(id);
  }
}

export const audioService = new AudioService();
