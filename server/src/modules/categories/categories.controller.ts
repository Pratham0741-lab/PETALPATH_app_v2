import { Request, Response, NextFunction } from 'express';
import { categoriesService } from './categories.service.js';
import { createCategorySchema, updateCategorySchema } from './categories.validator.js';
import { ValidationError } from '../../utils/errors.js';

export class CategoriesController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await categoriesService.getAllCategories();
      return res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      console.log(`Category selected: ${id}`);
      const category = await categoriesService.getCategoryById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }
      return res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const category = await categoriesService.createCategory(parsed.data);
      return res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parsed = updateCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }
      const category = await categoriesService.updateCategory(id, parsed.data);
      return res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await categoriesService.deleteCategory(id);
      return res.status(200).json({
        success: true,
        data: { message: 'Category deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const categoriesController = new CategoriesController();

