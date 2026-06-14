import { modulesRepository } from './modules.repository.js';

export class ModulesService {
  async getAllModules(categoryId?: string) {
    if (categoryId) {
      return modulesRepository.findByCategoryId(categoryId);
    }
    return modulesRepository.findAll();
  }

  async getModuleById(id: string) {
    return modulesRepository.findById(id);
  }

  async createModule(data: any) {
    return modulesRepository.create(data);
  }

  async updateModule(id: string, data: any) {
    return modulesRepository.update(id, data);
  }

  async deleteModule(id: string) {
    return modulesRepository.delete(id);
  }
}

export const modulesService = new ModulesService();
