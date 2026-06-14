import { Request, Response, NextFunction } from 'express';
import { audioService } from './audio.service.js';

export class AudioController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { activityId } = req.query;
      const audios = await audioService.getAllAudio(activityId as string);

      const host = `${req.protocol}://${req.get('host')}`;
      const formattedAudios = audios.map(audio => ({
        ...audio,
        audioUrl: `${host}/storage/audio/${audio.filename}`,
      }));

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

      const host = `${req.protocol}://${req.get('host')}`;
      const formattedAudio = {
        ...audio,
        audioUrl: `${host}/storage/audio/${audio.filename}`,
      };

      return res.status(200).json({
        success: true,
        data: formattedAudio,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const audioController = new AudioController();
