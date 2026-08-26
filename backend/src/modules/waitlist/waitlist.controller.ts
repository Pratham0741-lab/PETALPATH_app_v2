import { Request, Response, NextFunction } from 'express';
import { waitlistService, WaitlistService } from './waitlist.service.js';
import { JoinWaitlistSchema } from './waitlist.validators.js';
import { ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export class WaitlistController {
  constructor(private readonly service: WaitlistService = waitlistService) {}

  join = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = JoinWaitlistSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Please enter a valid email address.', parsed.error.format());
      }

      const result = await this.service.joinWaitlist(parsed.data.email);

      logger.info(
        { alreadyRegistered: result.alreadyRegistered },
        'Waitlist submission processed'
      );

      if (result.alreadyRegistered) {
        return res.status(200).json({
          success: true,
          message: result.message,
        });
      }

      return res.status(201).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const waitlistController = new WaitlistController();
