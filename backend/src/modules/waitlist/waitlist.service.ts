import { waitlistRepository, WaitlistRepository } from './waitlist.repository.js';
import { JoinWaitlistOutcome, JoinWaitlistParams } from './waitlist.types.js';

export class WaitlistService {
  constructor(private readonly repo: WaitlistRepository = waitlistRepository) {}

  /**
   * Idempotent on email. The outcome is for logging only; the caller answers
   * both outcomes identically so the endpoint never reveals whether an address
   * is already on the list.
   */
  async join({ email, name, sourcePage }: JoinWaitlistParams): Promise<JoinWaitlistOutcome> {
    const created = await this.repo.insertIfAbsent({
      email: email.trim().toLowerCase(),
      name: name?.trim() || undefined,
      sourcePage,
    });
    return created ? 'created' : 'duplicate';
  }
}

export const waitlistService = new WaitlistService();
