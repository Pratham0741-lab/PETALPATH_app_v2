import { Prisma, Feedback } from '@prisma/client';
import { feedbackRepository, FeedbackRepository } from './feedback.repository.js';
import { SubmitFeedbackInput } from './feedback.validators.js';
import { FeedbackView, SubmitFeedbackResult } from './feedback.types.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors.js';

const toView = (f: Feedback): FeedbackView => ({
  id: f.id,
  lessonId: f.lessonId,
  rating: f.rating,
  reasons: f.reasons,
  comment: f.comment,
  createdAt: f.createdAt,
});

export class FeedbackService {
  constructor(private readonly repo: FeedbackRepository = feedbackRepository) {}

  /**
   * Create a rating, or update the one with the same client id.
   *
   * The card sends the rating as soon as a star is tapped and the optional
   * reasons/comment in a second request with the same `id`; an offline replay
   * repeats a request verbatim. Both must land on one row, so a known id is an
   * update — but only of the caller's own row for the same lesson and child.
   *
   * `reasons` and `comment` are left untouched when absent, so the rating-only
   * first request can never wipe what the second one added (e.g. when the two
   * are replayed out of order after reconnecting).
   */
  async submit(
    parentId: string,
    tokenChildId: string | undefined,
    input: SubmitFeedbackInput,
  ): Promise<SubmitFeedbackResult> {
    await this.assertChildOwnership(parentId, tokenChildId, input.childId);

    if (!(await this.repo.lessonExists(input.lessonId))) {
      throw new NotFoundError('Lesson not found');
    }

    if (input.id) {
      const existing = await this.repo.findById(input.id);
      if (existing) return { created: false, feedback: toView(await this.update(existing, parentId, input)) };
    }

    try {
      const created = await this.repo.create({
        id: input.id,
        lessonId: input.lessonId,
        childId: input.childId,
        parentId,
        rating: input.rating,
        reasons: input.reasons ?? [],
        comment: input.comment ?? null,
        appVersion: input.appVersion ?? null,
      });
      return { created: true, feedback: toView(created) };
    } catch (error) {
      // Two requests with the same new id raced; the loser becomes an update.
      if (
        input.id &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.repo.findById(input.id);
        if (existing) return { created: false, feedback: toView(await this.update(existing, parentId, input)) };
      }
      throw error;
    }
  }

  private async update(existing: Feedback, parentId: string, input: SubmitFeedbackInput) {
    // Indistinguishable from a missing row, so ids cannot be probed.
    if (existing.parentId !== parentId) throw new NotFoundError('Feedback not found');
    if (existing.lessonId !== input.lessonId || existing.childId !== input.childId) {
      throw new ConflictError('Feedback id belongs to a different lesson');
    }
    return this.repo.update(existing.id, {
      rating: input.rating,
      ...(input.reasons !== undefined && { reasons: input.reasons }),
      ...(input.comment !== undefined && { comment: input.comment }),
      ...(input.appVersion !== undefined && { appVersion: input.appVersion }),
    });
  }

  private async assertChildOwnership(
    parentId: string,
    tokenChildId: string | undefined,
    childId: string,
  ): Promise<void> {
    // Same rules as `assertChildOwnership` middleware, which reads the child
    // from the URL; here it is in the body.
    if (tokenChildId) {
      if (tokenChildId !== childId) throw new ForbiddenError('Not authorized for this child profile');
      return;
    }
    const child = await this.repo.findChildOwner(childId);
    if (!child) throw new NotFoundError('Child profile not found');
    if (child.userId !== parentId) throw new ForbiddenError('Not authorized for this child profile');
  }
}

export const feedbackService = new FeedbackService();
