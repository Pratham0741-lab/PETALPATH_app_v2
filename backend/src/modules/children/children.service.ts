import { childrenRepository } from './children.repository.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { CreateChildInput, UpdateChildInput } from './children.validator.js';
import { Prisma } from '@prisma/client';

export class ChildrenService {
  /**
   * Helper to map integer age (2-6) to its corresponding age group label
   */
  private determineAgeGroup(age: number): string {
    if (age === 2) return '2–3 years';
    if (age === 3) return '3–4 years';
    if (age === 4) return '4–5 years';
    return '5–6 years';
  }

  async getAllChildren(userId: string) {
    return childrenRepository.findAllByUserId(userId);
  }

  async getChildById(id: string, userId: string) {
    const child = await childrenRepository.findById(id);
    if (!child) {
      throw new NotFoundError('Child profile not found');
    }
    if (child.userId !== userId) {
      throw new ForbiddenError('You do not have permission to access this child profile');
    }
    return child;
  }

  async createChild(userId: string, data: CreateChildInput) {
    const ageGroup = this.determineAgeGroup(data.age);
    return childrenRepository.create({
      userId,
      name: data.name,
      age: data.age,
      ageGroup,
      avatar: data.avatar,
      mentorId: data.mentorId || null,
    });
  }

  async updateChild(id: string, userId: string, data: UpdateChildInput) {
    // Enforce ownership check
    await this.getChildById(id, userId);

    const updateData: Prisma.ChildUncheckedUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.age !== undefined) {
      updateData.age = data.age;
      updateData.ageGroup = this.determineAgeGroup(data.age);
    }
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.mentorId !== undefined) {
      updateData.mentorId = data.mentorId || null;
    }

    return childrenRepository.update(id, updateData);
  }

  async deleteChild(id: string, userId: string) {
    // Enforce ownership check
    await this.getChildById(id, userId);
    return childrenRepository.delete(id);
  }
}

export const childrenService = new ChildrenService();
