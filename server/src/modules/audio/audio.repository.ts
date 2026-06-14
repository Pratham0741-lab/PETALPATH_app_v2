import { prisma } from '../../config/database.js';

export class AudioRepository {
  async findAll() {
    return prisma.audio.findMany();
  }

  async findById(id: string) {
    return prisma.audio.findFirst({
      where: { id },
    });
  }

  async findByActivityId(activityId: string) {
    return prisma.audio.findFirst({
      where: { activityId },
    });
  }

  async create(data: any) {
    return prisma.audio.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return prisma.audio.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.audio.delete({
      where: { id },
    });
  }
}

export const audioRepository = new AudioRepository();
