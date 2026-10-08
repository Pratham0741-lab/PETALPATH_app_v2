import { prisma } from '../../config/database.js';
import { JoinWaitlistParams } from './waitlist.types.js';

export class WaitlistRepository {
  /**
   * Inserts the entry unless the email is already present, in one statement
   * (INSERT ... ON CONFLICT DO NOTHING), so two concurrent signups for the same
   * address cannot race. An existing row is never modified.
   *
   * @returns true if a row was created, false if the email already existed.
   */
  async insertIfAbsent(entry: JoinWaitlistParams): Promise<boolean> {
    const { count } = await prisma.waitlist.createMany({
      data: [
        {
          email: entry.email,
          name: entry.name ?? null,
          // Omitted -> the column default ('app').
          ...(entry.sourcePage ? { sourcePage: entry.sourcePage } : {}),
        },
      ],
      skipDuplicates: true,
    });
    return count === 1;
  }
}

export const waitlistRepository = new WaitlistRepository();
