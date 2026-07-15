import { LearningEvent } from '../../../adaptive-learning/domain/entities/learning-event.entity.js';
import { LearningEventType } from '../../../adaptive-learning/domain/value-objects/event-types.js';
import { MissingFieldError, ValidationError } from '../../domain/errors.js';

const KNOWN_EVENT_TYPES = new Set(Object.values(LearningEventType));

export class EvidenceValidationService {
  validateEvent(event: LearningEvent): void {
    const errors: string[] = [];

    if (typeof event.childId !== 'string' || !event.childId.trim()) {
      errors.push('childId');
    }
    if (typeof event.eventType !== 'string' || !event.eventType.trim()) {
      errors.push('eventType');
    }
    if (!event.topicId) {
      errors.push('topicId');
    }

    if (errors.length > 0) {
      throw new MissingFieldError(errors.join(', '));
    }

    if (!KNOWN_EVENT_TYPES.has(event.eventType)) {
      throw new ValidationError(`Unknown event type: ${event.eventType}`, { eventType: event.eventType });
    }
  }
}
