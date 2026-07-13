import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../../middleware/auth.middleware.js';
import { LearningEventApplicationService, LearningEventOutput, CreateLearningEventInput } from '../../application/services/learning-event.service.js';
import { LearningEvidenceApplicationService, LearningEvidenceOutput } from '../../application/services/learning-evidence.service.js';
import { ValidationError, UnauthorizedError } from '../../../../utils/errors.js';
import {
  createLearningEventSchema,
  getEventsByChildSchema,
  getEvidenceByChildSchema,
} from '../validators/learning-event.validators.js';

export class LearningEventController {
  constructor(
    private readonly eventService: LearningEventApplicationService,
    private readonly evidenceService: LearningEvidenceApplicationService
  ) {}

  async createEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const result = createLearningEventSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid event data', result.error.format());
      }

      const input: CreateLearningEventInput = {
        ...result.data,
        childId,
      };

      const event = await this.eventService.createEvent(input);
      return res.status(201).json({
        success: true,
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEventsByChild(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const result = getEventsByChildSchema.safeParse(req.query);
      if (!result.success) {
        throw new ValidationError('Invalid query parameters', result.error.format());
      }

      const events = await this.eventService.getEventsByChild(
        childId,
        result.data.limit,
        result.data.offset
      );
      return res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEventsBySession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { sessionId } = req.params;
      const events = await this.eventService.getEventsBySession(sessionId);
      return res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEventsByActivity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { activityId } = req.params;
      const events = await this.eventService.getEventsByActivity(activityId);
      return res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEventsByTopic(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { topicId } = req.params;
      const events = await this.eventService.getEventsByTopic(topicId);
      return res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEvidenceByChild(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const result = getEvidenceByChildSchema.safeParse(req.query);
      if (!result.success) {
        throw new ValidationError('Invalid query parameters', result.error.format());
      }

      const evidence = await this.evidenceService.getEvidenceByChild(
        childId,
        result.data.limit,
        result.data.offset
      );
      return res.status(200).json({
        success: true,
        data: evidence,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEvidenceBySession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { sessionId } = req.params;
      const evidence = await this.evidenceService.getEvidenceBySession(sessionId);
      return res.status(200).json({
        success: true,
        data: evidence,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEvidenceByActivity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { activityId } = req.params;
      const evidence = await this.evidenceService.getEvidenceByActivity(activityId);
      return res.status(200).json({
        success: true,
        data: evidence,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEvidenceByTopic(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const { topicId } = req.params;
      const evidence = await this.evidenceService.getEvidenceByTopic(topicId);
      return res.status(200).json({
        success: true,
        data: evidence,
      });
    } catch (error) {
      next(error);
    }
  }
}