import { Request, Response, NextFunction } from 'express';
import { audioService } from './audio.service.js';
import { storageService } from '../../shared/services/storage.service.js';

const formatAudio = (audio: any) => {
  if (!audio) return null;
  return {
    id: audio.id,
    activityId: audio.activityId,
    title: audio.title,
    audioKey: audio.audioKey,
    filename: audio.audioKey, // For frontend backward compatibility
    duration: audio.duration,
    createdAt: audio.createdAt,
    updatedAt: audio.updatedAt,
    audioUrl: storageService.getAudioUrl(audio.audioKey),
  };
};

export class AudioController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { activityId } = req.query;
      const audios = await audioService.getAllAudio(activityId as string);

      const formattedAudios = audios.map(formatAudio);

      return res.status(200).json({
        success: true,
        data: formattedAudios,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const audio = await audioService.getAudioById(id);
      if (!audio) {
        return res.status(404).json({
          success: false,
          message: 'Audio not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: formatAudio(audio),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const audioController = new AudioController();

