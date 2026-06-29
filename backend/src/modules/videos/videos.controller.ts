import { Request, Response, NextFunction } from 'express';
import { videosService } from './videos.service.js';
import { createVideoSchema, updateVideoSchema, CreateVideoInput, UpdateVideoInput } from './videos.validator.js';
import { ValidationError } from '../../utils/errors.js';
import { storageService } from '../../shared/services/storage.service.js';
import { Video } from '@prisma/client';

const formatVideo = (video: Video | null) => {
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
    thumbnailUrl: storageService.getPublicUrl(video.thumbnailKey || null),
  };
};

export class VideosController {
  async getAll(req: Request<object, any, any, { activityId?: string }>, res: Response, next: NextFunction) {
    try {
      const { activityId } = req.query;
      const videos = await videosService.getAllVideos(activityId);
      
      const formattedVideos = videos.map(formatVideo);

      return res.status(200).json({
        success: true,
        data: formattedVideos,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request<{ id: string }>, res: Response, next: NextFunction) {
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

  async create(req: Request<object, any, CreateVideoInput>, res: Response, next: NextFunction) {
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

  async update(req: Request<{ id: string }, any, UpdateVideoInput>, res: Response, next: NextFunction) {
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

  async delete(req: Request<{ id: string }>, res: Response, next: NextFunction) {
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


