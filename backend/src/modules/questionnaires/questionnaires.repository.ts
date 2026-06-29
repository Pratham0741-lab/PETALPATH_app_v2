import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';

export class QuestionnairesRepository {
  async findAll() {
    return prisma.questionnaire.findMany();
  }

  async findById(id: string) {
    return prisma.questionnaire.findFirst({
      where: { id },
    });
  }

  async findByChildId(childId: string) {
    return prisma.questionnaire.findMany({
      where: { childId },
    });
  }

  async create(data: Prisma.QuestionnaireCreateInput) {
    return prisma.questionnaire.create({
      data,
    });
  }

  async update(id: string, data: Prisma.QuestionnaireUpdateInput) {
    return prisma.questionnaire.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.questionnaire.delete({
      where: { id },
    });
  }
}

export const questionnairesRepository = new QuestionnairesRepository();
