import { prisma } from '../../config/database.js';
import { Waitlist } from '@prisma/client';

export class WaitlistRepository {
  async findByEmail(email: string): Promise<Waitlist | null> {
    return prisma.waitlist.findUnique({
      where: { email },
    });
  }

  async create(email: string): Promise<Waitlist> {
    return prisma.waitlist.create({
      data: { email },
    });
  }
}

export const waitlistRepository = new WaitlistRepository();
