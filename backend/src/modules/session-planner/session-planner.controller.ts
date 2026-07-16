import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { sessionPlannerService } from '../session/session-planner.service.js';
import { sessionPlanRepository } from '../session/repositories/session-plan.repository.js';
import { sessionRuntime } from '../session/session-runtime.service.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../utils/errors.js';
import {
  planIdParamSchema,
  sessionActionSchema,
  listQuerySchema,
} from './session-planner.validator.js';

export class SessionPlannerController {
  async generate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const activeSession = await sessionPlanRepository.findActiveSession(childId);
      if (activeSession) {
        return res.status(200).json({
          success: true,
          message: 'An active session plan already exists.',
          data: activeSession,
        });
      }

      const session = await sessionPlannerService.generateSession(childId);
      return res.status(201).json({
        success: true,
        message: 'Session plan generated successfully.',
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async listPlans(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const query = listQuerySchema.parse(req.query);
      const plans = await sessionPlanRepository.findByChild(childId, query.limit);

      return res.status(200).json({
        success: true,
        data: plans,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = planIdParamSchema.safeParse(req.params);
      if (!parsed.success) throw new ValidationError('Invalid plan id', parsed.error.format());

      const plan = await sessionPlanRepository.findById(parsed.data.id);
      if (!plan) throw new NotFoundError('Session plan not found');

      sessionRuntime.assertOwnership(plan, req.user?.childId);

      return res.status(200).json({
        success: true,
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  async listSessions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const query = listQuerySchema.parse(req.query);
      const sessions = await sessionPlanRepository.findSessions(childId, query.limit);

      return res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = planIdParamSchema.safeParse(req.params);
      if (!parsed.success) throw new ValidationError('Invalid session id', parsed.error.format());

      const session = await sessionPlanRepository.findById(parsed.data.id);
      if (!session) throw new NotFoundError('Session not found');

      sessionRuntime.assertOwnership(session, req.user?.childId);

      return res.status(200).json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async start(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = sessionActionSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Session id is required', parsed.error.format());

      const plan = await sessionPlanRepository.findById(parsed.data.id);
      if (!plan) throw new NotFoundError('Session plan not found');

      sessionRuntime.assertOwnership(plan, req.user?.childId);

      const result = await sessionPlannerService.startSession(parsed.data.id);
      return res.status(200).json({
        success: true,
        message: 'Session started.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async complete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = sessionActionSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Session id is required', parsed.error.format());

      const plan = await sessionPlanRepository.findById(parsed.data.id);
      if (!plan) throw new NotFoundError('Session plan not found');

      sessionRuntime.assertOwnership(plan, req.user?.childId);

      const result = await sessionPlannerService.completeSession(parsed.data.id);
      return res.status(200).json({
        success: true,
        message: 'Session completed.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async abandon(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = sessionActionSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Session id is required', parsed.error.format());

      const plan = await sessionPlanRepository.findById(parsed.data.id);
      if (!plan) throw new NotFoundError('Session plan not found');

      sessionRuntime.assertOwnership(plan, req.user?.childId);

      const result = await sessionPlannerService.abandonSession(parsed.data.id);
      return res.status(200).json({
        success: true,
        message: 'Session abandoned.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const sessionPlannerController = new SessionPlannerController();
