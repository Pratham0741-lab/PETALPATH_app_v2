import { Request, Response, NextFunction } from 'express';
import { videosService } from './videos.service.js';
import { createVideoSchema, updateVideoSchema } from './videos.validator.js';
import { ValidationError } from '../../utils/errors.js';
import { storageService } from '../../shared/services/storage.service.js';

const formatVideo = (video: any) => {
  if (!video) return null;
  return {
    id: video.id,
    activityId: video.activityId,
    title: video.title,
    videoKey: video.videoKey,
    filename: video.videoKey, // For frontend backward compatibility
    thumbnailKey: video.thumbnailKey,
    duration: video.duration,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
    videoUrl: storageService.getVideoUrl(video.videoKey),
    thumbnailUrl: storageService.getPublicUrl(video.thumbnailKey),
  };
};

export class VideosController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { activityId } = req.query;
      const videos = await videosService.getAllVideos(activityId as string);
      
      const formattedVideos = videos.map(formatVideo);

      return res.status(200).json({
        success: true,
        data: formattedVideos,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      console.log("Video selected: " + id);
      const video = await videosService.getVideoById(id);
      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: formatVideo(video),
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createVideoSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const video = await videosService.createVideo(parsed.data);
      return res.status(201).json({
        success: true,
        data: formatVideo(video),
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parsed = updateVideoSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const video = await videosService.updateVideo(id, parsed.data);
      return res.status(200).json({
        success: true,
        data: formatVideo(video),
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await videosService.deleteVideo(id);
      return res.status(200).json({
        success: true,
        data: { message: 'Video deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const videosController = new VideosController();


