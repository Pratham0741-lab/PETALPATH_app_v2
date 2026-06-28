import { Request, Response, NextFunction } from 'express';
import { lessonsService } from './lessons.service.js';
import { createLessonSchema, updateLessonSchema } from './lessons.validator.js';
import { ValidationError } from '../../utils/errors.js';

export class LessonsController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { moduleId } = req.query;
      const lessons = await lessonsService.getAllLessons(moduleId as string);
      return res.status(200).json({
        success: true,
        data: lessons,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      console.log(`Lesson selected: ${id}`);
      const lesson = await lessonsService.getLessonById(id);
      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found',
        });
      }
      return res.status(200).json({
        success: true,
        data: lesson,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createLessonSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const lesson = await lessonsService.createLesson(parsed.data);
      return res.status(201).json({
        success: true,
        data: lesson,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parsed = updateLessonSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const lesson = await lessonsService.updateLesson(id, parsed.data);
      return res.status(200).json({
        success: true,
        data: lesson,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await lessonsService.deleteLesson(id);
      return res.status(200).json({
        success: true,
        data: { message: 'Lesson deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const lessonsController = new LessonsController();

