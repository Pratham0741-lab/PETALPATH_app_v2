import { Practice } from '../entities/practice.entity.js';
import { LearningDebt } from '../entities/learning-debt.entity.js';
import { RecoveryMode } from '../entities/recovery-mode.entity.js';
import { DynamicRoadmap } from '../entities/dynamic-roadmap.entity.js';
import { SessionPlan } from '../entities/session-plan.entity.js';
import { SessionBlock } from '../entities/session-block.entity.js';
import { TopicState } from '../../../intelligence-core/domain/entities/topic-state.entity.js';
import { KnowledgeState } from '../../../intelligence-core/domain/entities/knowledge-state.entity.js';
import { ReinforcementQueue } from '../entities/reinforcement-queue.entity.js';
import { SessionStatus } from '../entities/session-plan.entity.js';
import { SessionBlockStatus } from '../entities/session-block.entity.js';

export interface IPracticeRepository {
  create(practice: Practice): Promise<Practice>;
  findById(id: string): Promise<Practice | null>;
  findByChildId(childId: string, limit?: number, offset?: number): Promise<Practice[]>;
  findByChildIdAndType(childId: string, type: string, limit?: number, offset?: number): Promise<Practice[]>;
  findByChildIdAndDateRange(childId: string, from: Date, to: Date): Promise<Practice[]>;
  findPendingByChildId(childId: string): Promise<Practice[]>;
  findByDebtId(debtId: string): Promise<Practice[]>;
  update(practice: Practice): Promise<Practice>;
}

export interface ILearningDebtRepository {
  create(debt: LearningDebt): Promise<LearningDebt>;
  findById(id: string): Promise<LearningDebt | null>;
  findByChildId(childId: string): Promise<LearningDebt[]>;
  findByChildAndTopic(childId: string, topicId: string): Promise<LearningDebt[]>;
  findUnresolvedByChildId(childId: string): Promise<LearningDebt[]>;
  resolve(debtId: string): Promise<LearningDebt>;
  update(debt: LearningDebt): Promise<LearningDebt>;
}

export interface IRecoveryModeRepository {
  create(recoveryMode: RecoveryMode): Promise<RecoveryMode>;
  findByChildId(childId: string): Promise<RecoveryMode | null>;
  findActiveByChildId(childId: string): Promise<RecoveryMode | null>;
  update(recoveryMode: RecoveryMode): Promise<RecoveryMode>;
}

export interface IDynamicRoadmapRepository {
  create(roadmap: DynamicRoadmap): Promise<DynamicRoadmap>;
  findByChildId(childId: string): Promise<DynamicRoadmap | null>;
  update(roadmap: DynamicRoadmap): Promise<DynamicRoadmap>;
}

export interface ISessionPlanRepository {
  create(sessionPlan: SessionPlan): Promise<SessionPlan>;
  findById(id: string): Promise<SessionPlan | null>;
  findByChildId(childId: string, limit?: number, offset?: number): Promise<SessionPlan[]>;
  findActiveByChildId(childId: string): Promise<SessionPlan | null>;
  updateStatus(id: string, status: SessionStatus, data?: Record<string, unknown>): Promise<SessionPlan>;
  update(sessionPlan: SessionPlan): Promise<SessionPlan>;
}

export interface ISessionBlockRepository {
  create(sessionBlock: SessionBlock): Promise<SessionBlock>;
  findById(id: string): Promise<SessionBlock | null>;
  findBySessionPlanId(sessionPlanId: string): Promise<SessionBlock[]>;
  updateStatus(id: string, status: SessionBlockStatus, completedAt?: Date): Promise<SessionBlock>;
  update(sessionBlock: SessionBlock): Promise<SessionBlock>;
}

export interface ITopicStateRepository {
  findByChildId(childId: string): Promise<TopicState[]>;
}

export interface IKnowledgeStateRepository {
  findByChildId(childId: string): Promise<KnowledgeState[]>;
}

export interface IReinforcementQueueRepository {
  create(queue: ReinforcementQueue): Promise<ReinforcementQueue>;
  findByChildAndTopic(childId: string, topicId: string, modality?: string): Promise<ReinforcementQueue | null>;
  findDueReviews(childId: string, beforeDate: Date): Promise<ReinforcementQueue[]>;
  findActiveByChild(childId: string): Promise<ReinforcementQueue[]>;
  update(queue: ReinforcementQueue): Promise<ReinforcementQueue>;
}