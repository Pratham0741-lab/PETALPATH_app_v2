import { ITopicStateRepository } from '../../domain/repositories/repository-interfaces.js';
import { TopicState } from '../../domain/entities/topic-state.entity.js';
import { Modality, TopicStateType, ModalityStateType } from '../../domain/value-objects/intelligence-types.js';

export interface ObservationEventInput {
  childId: string;
  eventType: string;
  sessionId: string;
  topicId: string;
  activityId: string;
  modality?: Modality;
  payload: Record<string, unknown>;
}

export class ObservationEngine {
  constructor(
    private readonly topicStateRepo: ITopicStateRepository,
    // private readonly evidenceRepo: ILearningEvidenceRepository,
  ) {}

  async observe(event: ObservationEventInput): Promise<{
    topicState: TopicState;
    evidenceCreated: boolean;
  }> {
    // 1. Get or create topic state
    let topicState = await this.topicStateRepo.findByChildAndTopic(event.childId, event.topicId);
    
    if (!topicState) {
      topicState = TopicState.create({
        childId: event.childId,
        topicId: event.topicId,
        state: TopicStateType.NEW,
        modalityStates: {},
        enteredAt: new Date(),
        lastTransitionAt: new Date(),
        evidenceSummary: this.extractEvidenceSummary(event),
      });
      topicState = await this.topicStateRepo.create(topicState);
    }

    // 2. Generate learning evidence from event
    // This would be implemented with a LearningEvidence repository
    // For now, we'll update the topic state based on the event
    const updatedTopicState = this.processEvent(topicState, event);
    await this.topicStateRepo.update(updatedTopicState);

    return {
      topicState: updatedTopicState,
      evidenceCreated: true,
    };
  }

  private processEvent(topicState: TopicState, event: ObservationEventInput): TopicState {
    // Extract performance data from payload
    const accuracy = event.payload.accuracy as number | undefined;
    const attempts = event.payload.attempts as number | undefined;
    const retries = event.payload.retries as number | undefined;
    const completed = event.payload.completed as boolean | undefined;
    const duration = event.payload.duration as number | undefined;

    let newState = topicState.state;
    const modality = event.modality ?? 'VIDEO';

    // Determine topic state transition based on evidence
    switch (topicState.state) {
      case TopicStateType.NEW:
        if (completed) {
          newState = TopicStateType.LEARNING;
        }
        break;
      case TopicStateType.LEARNING:
        if (accuracy !== undefined && accuracy >= 80 && attempts !== undefined && attempts >= 3) {
          newState = TopicStateType.STABLE;
        } else if (accuracy !== undefined && accuracy < 60 && retries !== undefined && retries >= 3) {
          newState = TopicStateType.NEEDS_PRACTICE;
        }
        break;
      case TopicStateType.NEEDS_PRACTICE:
        if (accuracy !== undefined && accuracy >= 75 && attempts !== undefined && attempts >= 2) {
          newState = TopicStateType.LEARNING;
        }
        break;
      case TopicStateType.STABLE:
        if (accuracy !== undefined && accuracy >= 90 && attempts !== undefined && attempts >= 5) {
          newState = TopicStateType.REINFORCEMENT;
        } else if (accuracy !== undefined && accuracy < 70) {
          newState = TopicStateType.NEEDS_PRACTICE;
        }
        break;
      case TopicStateType.REINFORCEMENT:
        if (accuracy !== undefined && accuracy >= 85 && attempts !== undefined && attempts >= 3) {
          newState = TopicStateType.MASTERED;
        }
        break;
    }

    // Update modality state
    let updated = topicState;
    if (modality) {
      updated = updated.updateModalityState(modality, this.determineModalityState(topicState.modalityStates[modality], accuracy, attempts, retries));
    }

    if (newState !== topicState.state) {
      updated = updated.transitionTo(newState, `Observed ${event.eventType} with ${accuracy}% accuracy`, this.extractEvidenceSummary(event));
    }

    return updated;
  }

  private determineModalityState(
    currentState: ModalityStateType | undefined,
    accuracy?: number,
    attempts?: number,
    retries?: number
  ): ModalityStateType {
    if (!currentState) {
      return ModalityStateType.NEW;
    }

    if (accuracy !== undefined && attempts !== undefined && attempts >= 3) {
      if (accuracy >= 85) return ModalityStateType.STABLE;
      if (accuracy >= 70) return ModalityStateType.LEARNING;
      if (retries !== undefined && retries >= 3) return ModalityStateType.NEEDS_PRACTICE;
    }

    return currentState;
  }

  private extractEvidenceSummary(event: ObservationEventInput): Record<string, unknown> {
    return {
      eventType: event.eventType,
      sessionId: event.sessionId,
      activityId: event.activityId,
      modality: event.modality,
      accuracy: event.payload.accuracy,
      attempts: event.payload.attempts,
      retries: event.payload.retries,
      completed: event.payload.completed,
      duration: event.payload.duration,
      hintsUsed: event.payload.hintsUsed,
      timestamp: new Date().toISOString(),
    };
  }
}