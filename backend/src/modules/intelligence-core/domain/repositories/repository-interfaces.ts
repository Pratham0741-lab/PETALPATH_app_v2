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
  create(knowledgeState: any): Promise<any>;
  findByChildAndTopic(childId: string, topicId: string): Promise<any | null>;
  findByChildId(childId: string): Promise<any[]>;
  update(knowledgeState: any): Promise<any>;
}

export interface IMetricSnapshotRepository {
  create(snapshot: any): Promise<any>;
  findByChild(childId: string, limit?: number): Promise<any[]>;
  findByChildAndCategory(childId: string, category: string, limit?: number): Promise<any[]>;
  findLatestByChildAndCategory(childId: string, category: string): Promise<any | null>;
}

export interface ILearnerStateRepository {
  create(learnerState: Prisma.LearnerStateCreateInput): Promise<LearnerState>;
  findById(id: string): Promise<LearnerState | null>;
  findByChildId(childId: string): Promise<LearnerState | null>;
  update(learnerState: LearnerState): Promise<LearnerState>;
}