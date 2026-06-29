import { modulesRepository } from './modules.repository.js';
import { Prisma } from '@prisma/client';

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

  async createModule(data: Prisma.ModuleUncheckedCreateInput) {
    return modulesRepository.create(data);
  }

  async updateModule(id: string, data: Prisma.ModuleUncheckedUpdateInput) {
    return modulesRepository.update(id, data);
  }

  async deleteModule(id: string) {
    return modulesRepository.delete(id);
  }
}

export const modulesService = new ModulesService();
