import { Request, Response, NextFunction } from 'express';
import { mentorsService } from './mentors.service.js';
import { storageService } from '../../shared/services/storage.service.js';

const formatMentor = (mentor: any) => {
  if (!mentor) return null;
  return {
    ...mentor,
    imagePath: storageService.getPublicUrl(mentor.iconKey),
  };
};

export class MentorsController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const mentors = await mentorsService.getAllMentors();
      const formattedMentors = mentors.map(formatMentor);
      return res.status(200).json({
        success: true,
        data: formattedMentors,
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
        data: formatMentor(mentor),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const mentorsController = new MentorsController();

