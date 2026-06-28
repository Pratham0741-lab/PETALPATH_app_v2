import { prisma } from '../../config/database.js';

export class VideosRepository {
  async findAll() {
    return prisma.video.findMany();
  }

  async findById(id: string) {
    return prisma.video.findFirst({
      where: { id },
    });
  }

  async findByActivityId(activityId: string) {
    return prisma.video.findFirst({
      where: { activityId },
    });
  }

  async create(data: any) {
    return prisma.video.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return prisma.video.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.video.delete({
      where: { id },
    });
  }
}

export const videosRepository = new VideosRepository();
