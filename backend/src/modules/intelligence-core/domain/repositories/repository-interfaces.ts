import { TopicState } from '../entities/topic-state.entity.js';
import { KnowledgeState } from '../entities/knowledge-state.entity.js';
import { MetricSnapshot } from '../entities/metric-snapshot.entity.js';
import { Modality } from '../value-objects/intelligence-types.js';
import type { LearnerState } from '@prisma/client';
import type { Prisma } from '@prisma/client';

export interface ITopicStateRepository {
  create(topicState: TopicState): Promise<TopicState>;
  findById(id: string): Promise<TopicState | null>;
  findByChildAndTopic(childId: string, topicId: string): Promise<TopicState | null>;
  findByChildId(childId: string): Promise<TopicState[]>;
  update(topicState: TopicState): Promise<TopicState>;
}

export interface IKnowledgeStateRepository {
  create(knowledgeState: KnowledgeState): Promise<KnowledgeState>;
  findByChildAndTopic(childId: string, topicId: string): Promise<KnowledgeState | null>;
  findByChildId(childId: string): Promise<KnowledgeState[]>;
  update(knowledgeState: KnowledgeState): Promise<KnowledgeState>;
}

export interface IMetricSnapshotRepository {
  create(snapshot: MetricSnapshot): Promise<MetricSnapshot>;
  findByChild(childId: string, limit?: number): Promise<MetricSnapshot[]>;
  findByChildAndCategory(childId: string, category: string, limit?: number): Promise<MetricSnapshot[]>;
  findLatestByChildAndCategory(childId: string, category: string): Promise<MetricSnapshot | null>;
}

export interface ILearnerStateRepository {
  create(learnerState: Prisma.LearnerStateCreateInput): Promise<LearnerState>;
  findById(id: string): Promise<LearnerState | null>;
  findByChildId(childId: string): Promise<LearnerState | null>;
  update(learnerState: LearnerState): Promise<LearnerState>;
}