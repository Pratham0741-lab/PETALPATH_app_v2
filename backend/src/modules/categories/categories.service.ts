import { categoriesRepository } from './categories.repository.js';
import { Prisma } from '@prisma/client';

export class CategoriesService {
  async getAllCategories() {
    return categoriesRepository.findAll();
  }

  async getCategoryById(id: string) {
    return categoriesRepository.findById(id);
  }

  async createCategory(data: Prisma.CategoryCreateInput) {
    return categoriesRepository.create(data);
  }

  async updateCategory(id: string, data: Prisma.CategoryUpdateInput) {
    return categoriesRepository.update(id, data);
  }

  async deleteCategory(id: string) {
    return categoriesRepository.delete(id);
  }
}

export const categoriesService = new CategoriesService();
