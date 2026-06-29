import { questionnairesRepository } from './questionnaires.repository.js';
import { Prisma } from '@prisma/client';

export class QuestionnairesService {
  async getAllQuestionnaires() {
    return questionnairesRepository.findAll();
  }

  async getQuestionnaireById(id: string) {
    return questionnairesRepository.findById(id);
  }

  async createQuestionnaire(data: Prisma.QuestionnaireCreateInput) {
    return questionnairesRepository.create(data);
  }

  async updateQuestionnaire(id: string, data: Prisma.QuestionnaireUpdateInput) {
    return questionnairesRepository.update(id, data);
  }

  async deleteQuestionnaire(id: string) {
    return questionnairesRepository.delete(id);
  }
}

export const questionnairesService = new QuestionnairesService();
