import { ReinforcementQueueStatus } from '../value-objects/planning-types.js';
import { Modality } from '../../../../shared/enums.js';

export interface ReinforcementQueueProps {
  id: string;
  childId: string;
  topicId: string;
  modality?: Modality;
  startedAt: Date;
  nextReviewAt: Date;
  reviewFrequency: number;
  reviewCount: number;
  successfulReviews: number;
  status: ReinforcementQueueStatus;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ReinforcementQueue {
  private readonly props: ReinforcementQueueProps;

  constructor(props: ReinforcementQueueProps) {
    this.props = Object.freeze({ ...props });
  }

  static create(props: Omit<ReinforcementQueueProps, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): ReinforcementQueue {
    const now = new Date();
    return new ReinforcementQueue({
      ...props,
      id: props.id ?? crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string { return this.props.id; }
  get childId(): string { return this.props.childId; }
  get topicId(): string { return this.props.topicId; }
  get modality(): Modality | undefined { return this.props.modality; }
  get startedAt(): Date { return this.props.startedAt; }
  get nextReviewAt(): Date { return this.props.nextReviewAt; }
  get reviewFrequency(): number { return this.props.reviewFrequency; }
  get reviewCount(): number { return this.props.reviewCount; }
  get successfulReviews(): number { return this.props.successfulReviews; }
  get status(): ReinforcementQueueStatus { return this.props.status; }
  get priority(): number { return this.props.priority; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  recordReview(success: boolean): ReinforcementQueue {
    const now = new Date();
    const nextReviewAt = new Date(now.getTime() + this.props.reviewFrequency * 24 * 60 * 60 * 1000);
    return new ReinforcementQueue({
      ...this.props,
      reviewCount: this.props.reviewCount + 1,
      successfulReviews: this.props.successfulReviews + (success ? 1 : 0),
      nextReviewAt,
      updatedAt: now,
    });
  }

  complete(): ReinforcementQueue {
    return new ReinforcementQueue({
      ...this.props,
      status: ReinforcementQueueStatus.COMPLETED,
      updatedAt: new Date(),
    });
  }

  pause(): ReinforcementQueue {
    return new ReinforcementQueue({
      ...this.props,
      status: ReinforcementQueueStatus.PAUSED,
      updatedAt: new Date(),
    });
  }

  resume(): ReinforcementQueue {
    return new ReinforcementQueue({
      ...this.props,
      status: ReinforcementQueueStatus.ACTIVE,
      updatedAt: new Date(),
    });
  }

  updateNextReview(nextReviewAt: Date): ReinforcementQueue {
    return new ReinforcementQueue({
      ...this.props,
      nextReviewAt,
      updatedAt: new Date(),
    });
  }

}