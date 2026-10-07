import { prisma } from '../../config/database.js';
import { Feedback } from '@prisma/client';

export interface FeedbackCreateData {
  id?: string;
  lessonId: string;
  childId: string;
  parentId: string;
  rating: number;
  reasons: string[];
  comment: string | null;
  appVersion: string | null;
}

export interface FeedbackUpdateData {
  rating: number;
  reasons?: string[];
  comment?: string | null;
  appVersion?: string | null;
}

export class FeedbackRepository {
  async findById(id: string): Promise<Feedback | null> {
    return prisma.feedback.findUnique({ where: { id } });
  }

  async findChildOwner(childId: string): Promise<{ userId: string } | null> {
    return prisma.child.findFirst({
      where: { id: childId, deletedAt: null },
      select: { userId: true },
    });
  }

  async lessonExists(lessonId: string): Promise<boolean> {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, deletedAt: null },
      select: { id: true },
    });
    return lesson !== null;
  }

  async create(data: FeedbackCreateData): Promise<Feedback> {
    return prisma.feedback.create({ data });
  }

  async update(id: string, data: FeedbackUpdateData): Promise<Feedback> {
    return prisma.feedback.update({ where: { id }, data });
  }
}

export const feedbackRepository = new FeedbackRepository();
