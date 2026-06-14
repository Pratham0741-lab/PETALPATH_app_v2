import { questionnairesRepository } from './questionnaires.repository.js';

export class QuestionnairesService {
  async getAllQuestionnaires() {
    return questionnairesRepository.findAll();
  }

  async getQuestionnaireById(id: string) {
    return questionnairesRepository.findById(id);
  }

  async createQuestionnaire(data: any) {
    return questionnairesRepository.create(data);
  }

  async updateQuestionnaire(id: string, data: any) {
    return questionnairesRepository.update(id, data);
  }

  async deleteQuestionnaire(id: string) {
    return questionnairesRepository.delete(id);
  }
}

export const questionnairesService = new QuestionnairesService();
