import { waitlistRepository, WaitlistRepository } from './waitlist.repository.js';
import { JoinWaitlistResult } from './waitlist.types.js';
import { Prisma } from '@prisma/client';

export class WaitlistService {
  constructor(private readonly repo: WaitlistRepository = waitlistRepository) {}

  async joinWaitlist(name: string, email: string): Promise<JoinWaitlistResult> {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existing = await this.repo.findByEmail(normalizedEmail);
    if (existing) {
      return {
        alreadyRegistered: true,
        message: "You're already on the waitlist!",
      };
    }

    try {
      await this.repo.create(trimmedName, normalizedEmail);
      return {
        alreadyRegistered: false,
        message: "You're on the waitlist!",
      };
    } catch (error) {
      // Handle unique constraint race condition gracefully
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return {
          alreadyRegistered: true,
          message: "You're already on the waitlist!",
        };
      }
      throw error;
    }
  }
}

export const waitlistService = new WaitlistService();
