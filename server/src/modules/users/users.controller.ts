import { Request, Response, NextFunction } from 'express';

export class UsersController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(501).json({ message: 'Not implemented' });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(501).json({ message: 'Not implemented' });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(501).json({ message: 'Not implemented' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(501).json({ message: 'Not implemented' });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(501).json({ message: 'Not implemented' });
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();
