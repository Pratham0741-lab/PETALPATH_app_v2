import { categoriesRepository } from './categories.repository.js';

export class CategoriesService {
  async getAllCategories() {
    return categoriesRepository.findAll();
  }

  async getCategoryById(id: string) {
    return categoriesRepository.findById(id);
  }

  async createCategory(data: any) {
    return categoriesRepository.create(data);
  }

  async updateCategory(id: string, data: any) {
    return categoriesRepository.update(id, data);
  }

  async deleteCategory(id: string) {
    return categoriesRepository.delete(id);
  }
}

export const categoriesService = new CategoriesService();
