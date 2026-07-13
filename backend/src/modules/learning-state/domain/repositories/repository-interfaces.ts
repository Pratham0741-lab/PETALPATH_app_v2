import { LearningState } from '../entities/learning-state.entity.js';

export interface IStateRepository {
  findByChildId(childId: string): Promise<LearningState[]>;
  findByTopic(childId: string, topicId: string): Promise<LearningState | null>;
  save(state: LearningState): Promise<LearningState>;
  update(state: LearningState): Promise<LearningState>;
}
