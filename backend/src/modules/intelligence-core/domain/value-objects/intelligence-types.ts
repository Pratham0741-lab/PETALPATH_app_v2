import { Modality } from '../../../../shared/enums.js';
import { LearningEventType, EvidenceType } from '../../../adaptive-learning/domain/value-objects/event-types.js';

export enum TopicStateType {
  NEW = 'NEW',
  LEARNING = 'LEARNING',
  NEEDS_PRACTICE = 'NEEDS_PRACTICE',
  STABLE = 'STABLE',
  REINFORCEMENT = 'REINFORCEMENT',
  MASTERED = 'MASTERED',
}

export enum ModalityStateType {
  NEW = 'NEW',
  LEARNING = 'LEARNING',
  NEEDS_PRACTICE = 'NEEDS_PRACTICE',
  STABLE = 'STABLE',
  REINFORCEMENT = 'REINFORCEMENT',
  MASTERED = 'MASTERED',
}

export enum KnowledgeStateType {
  NEW = 'NEW',
  LEARNING = 'LEARNING',
  NEEDS_PRACTICE = 'NEEDS_PRACTICE',
  STABLE = 'STABLE',
  REINFORCEMENT = 'REINFORCEMENT',
  MASTERED = 'MASTERED',
}

export enum MetricCategory {
  PERFORMANCE = 'PERFORMANCE',
  MODALITY = 'MODALITY',
  TOPIC = 'TOPIC',
  SESSION = 'SESSION',
  RETENTION = 'RETENTION',
}

export { Modality, LearningEventType, EvidenceType };

export const VALID_TOPIC_STATES = Object.values(TopicStateType);
export const VALID_MODALITY_STATES = Object.values(ModalityStateType);
export const VALID_KNOWLEDGE_STATES = Object.values(KnowledgeStateType);
export const VALID_METRIC_CATEGORIES = Object.values(MetricCategory);