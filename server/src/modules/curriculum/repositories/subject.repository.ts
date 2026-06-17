import { prisma } from '../../../config/database.js';

export class SubjectRepository {
  async findAll() {
    return prisma.subject.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.subject.findUnique({
      where: { id },
    });
  }

  async findByName(name: string) {
    return prisma.subject.findUnique({
      where: { name },
    });
  }
}

export const subjectRepository = new SubjectRepository();
