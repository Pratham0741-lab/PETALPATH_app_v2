import { Request, Response, NextFunction } from 'express';
import { modulesService } from './modules.service.js';
import { createModuleSchema, updateModuleSchema } from './modules.validator.js';
import { ValidationError } from '../../utils/errors.js';

export class ModulesController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryId } = req.query;
      const modules = await modulesService.getAllModules(categoryId as string);
      return res.status(200).json({
        success: true,
        data: modules,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const moduleItem = await modulesService.getModuleById(id);
      if (!moduleItem) {
        return res.status(404).json({
          success: false,
          message: 'Module not found',
        });
      }
      return res.status(200).json({
        success: true,
        data: moduleItem,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createModuleSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const moduleItem = await modulesService.createModule(parsed.data);
      return res.status(201).json({
        success: true,
        data: moduleItem,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parsed = updateModuleSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const moduleItem = await modulesService.updateModule(id, parsed.data);
      return res.status(200).json({
        success: true,
        data: moduleItem,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await modulesService.deleteModule(id);
      return res.status(200).json({
        success: true,
        data: { message: 'Module deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const modulesController = new ModulesController();
