import { Request, Response, NextFunction } from 'express';
import { videosService } from './videos.service.js';
import { createVideoSchema, updateVideoSchema } from './videos.validator.js';
import { ValidationError } from '../../utils/errors.js';

export class VideosController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { activityId } = req.query;
      const videos = await videosService.getAllVideos(activityId as string);
      
      const host = `${req.protocol}://${req.get('host')}`;
      const formattedVideos = videos.map(video => ({
        ...video,
        videoUrl: `${host}/storage/videos/${video.filename}`,
        thumbnailUrl: video.thumbnail
          ? (video.thumbnail.startsWith('storage/') ? `${host}/${video.thumbnail}` : `${host}/storage/${video.thumbnail}`)
          : null,
      }));

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

      const host = `${req.protocol}://${req.get('host')}`;
      const formattedVideo = {
        ...video,
        videoUrl: `${host}/storage/videos/${video.filename}`,
        thumbnailUrl: video.thumbnail
          ? (video.thumbnail.startsWith('storage/') ? `${host}/${video.thumbnail}` : `${host}/storage/${video.thumbnail}`)
          : null,
      };

      return res.status(200).json({
        success: true,
        data: formattedVideo,
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
        data: video,
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
        data: video,
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

