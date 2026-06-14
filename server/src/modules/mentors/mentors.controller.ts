import { Request, Response, NextFunction } from 'express';
import { mentorsService } from './mentors.service.js';

export class MentorsController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const mentors = await mentorsService.getAllMentors();
      return res.status(200).json({
        success: true,
        data: mentors,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const mentor = await mentorsService.getMentorById(id);
      return res.status(200).json({
        success: true,
        data: mentor,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const mentorsController = new MentorsController();
