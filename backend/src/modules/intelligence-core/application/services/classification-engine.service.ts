import { ITopicStateRepository } from '../../domain/repositories/repository-interfaces.js';
import { IKnowledgeStateRepository } from '../../domain/repositories/repository-interfaces.js';
import { TopicState } from '../../domain/entities/topic-state.entity.js';
import { KnowledgeState } from '../../domain/entities/knowledge-state.entity.js';
import { MetricSnapshot } from '../../domain/entities/metric-snapshot.entity.js';
import { TopicStateType, ModalityStateType, KnowledgeStateType } from '../../domain/value-objects/intelligence-types.js';

export interface ClassificationResult {
  topicStates: TopicState[];
  knowledgeStates: KnowledgeState[];
}

export class ClassificationEngine {
  constructor(
    private readonly topicStateRepo: ITopicStateRepository,
    private readonly knowledgeStateRepo: IKnowledgeStateRepository
  ) {}

  async classifyAll(
    childId: string,
    metricSnapshots: MetricSnapshot[]
  ): Promise<ClassificationResult> {
    const topicStates = await this.classifyTopics(childId, metricSnapshots);
    const knowledgeStates = await this.classifyKnowledge(childId, topicStates);

    return {
      topicStates,
      knowledgeStates,
    };
  }

  private async classifyTopics(
    childId: string,
    metricSnapshots: MetricSnapshot[]
  ): Promise<TopicState[]> {
    const topicMetrics = this.groupMetricsByTopic(metricSnapshots);
    const results: TopicState[] = [];

    for (const [topicId, metrics] of Object.entries(topicMetrics)) {
      const topicState = await this.classifySingleTopic(childId, topicId, metrics);
      results.push(topicState);
    }

    return results;
  }

  private groupMetricsByTopic(metricSnapshots: MetricSnapshot[]): Record<string, Record<string, unknown>[]> {
    const grouped: Record<string, Record<string, unknown>[]> = {};
    for (const snapshot of metricSnapshots) {
      if (snapshot.category === 'TOPIC') {
        const topicId = snapshot.metrics.topicId as string;
        if (!topicId) continue;
        if (!grouped[topicId]) {
          grouped[topicId] = [];
        }
        grouped[topicId].push(snapshot.metrics);
      }
    }
    return grouped;
  }

  private async classifySingleTopic(
    childId: string,
    topicId: string,
    metrics: Record<string, unknown>[]
  ): Promise<TopicState> {
    let topicState = await this.topicStateRepo.findByChildAndTopic(childId, topicId);
    
    if (!topicState) {
      topicState = TopicState.create({
        childId,
        topicId,
        state: TopicStateType.NEW,
        modalityStates: {},
        enteredAt: new Date(),
        lastTransitionAt: new Date(),
      });
    }

    const modalityStates = this.classifyModalityStates(metrics);
    
    for (const [modality, state] of Object.entries(modalityStates)) {
      topicState = topicState.updateModalityState(modality, state as ModalityStateType);
    }

    const overallState = this.deriveTopicState(modalityStates);
    topicState = topicState.transitionTo(overallState, `Classified based on modality states: ${JSON.stringify(modalityStates)}`);

    if (topicState.id === '') {
      await this.topicStateRepo.create(topicState);
    } else {
      await this.topicStateRepo.update(topicState);
    }

    return topicState;
  }

  private classifyModalityStates(metrics: Record<string, unknown>[]): Record<string, ModalityStateType> {
    const modalityStates: Record<string, ModalityStateType> = {};
    
    if (metrics.length > 0 && metrics[0].videoCompletionRate !== undefined) {
      const rate = metrics[0].videoCompletionRate as number;
      if (rate >= 0.9) modalityStates['VIDEO'] = ModalityStateType.MASTERED;
      else if (rate >= 0.7) modalityStates['VIDEO'] = ModalityStateType.STABLE;
      else if (rate >= 0.4) modalityStates['VIDEO'] = ModalityStateType.LEARNING;
      else modalityStates['VIDEO'] = ModalityStateType.NEEDS_PRACTICE;
    }

    if (metrics.length > 0 && metrics[0].audioCompletionRate !== undefined) {
      const rate = metrics[0].audioCompletionRate as number;
      if (rate >= 0.9) modalityStates['AUDIO'] = ModalityStateType.MASTERED;
      else if (rate >= 0.7) modalityStates['AUDIO'] = ModalityStateType.STABLE;
      else if (rate >= 0.4) modalityStates['AUDIO'] = ModalityStateType.LEARNING;
      else modalityStates['AUDIO'] = ModalityStateType.NEEDS_PRACTICE;
    }

    if (metrics.length > 0 && metrics[0].speechAccuracy !== undefined) {
      const accuracy = metrics[0].speechAccuracy as number;
      if (accuracy >= 0.85) modalityStates['SPEECH'] = ModalityStateType.MASTERED;
      else if (accuracy >= 0.7) modalityStates['SPEECH'] = ModalityStateType.STABLE;
      else if (accuracy >= 0.5) modalityStates['SPEECH'] = ModalityStateType.LEARNING;
      else modalityStates['SPEECH'] = ModalityStateType.NEEDS_PRACTICE;
    }

    if (metrics.length > 0 && metrics[0].writingAccuracy !== undefined) {
      const accuracy = metrics[0].writingAccuracy as number;
      if (accuracy >= 0.85) modalityStates['WRITING'] = ModalityStateType.MASTERED;
      else if (accuracy >= 0.7) modalityStates['WRITING'] = ModalityStateType.STABLE;
      else if (accuracy >= 0.5) modalityStates['WRITING'] = ModalityStateType.LEARNING;
      else modalityStates['WRITING'] = ModalityStateType.NEEDS_PRACTICE;
    }

    return modalityStates;
  }

  private deriveTopicState(modalityStates: Record<string, ModalityStateType>): TopicStateType {
    const states = Object.values(modalityStates);
    if (states.length === 0) return TopicStateType.NEW;

    const masteredCount = states.filter(s => s === ModalityStateType.MASTERED).length;
    const stableCount = states.filter(s => s === ModalityStateType.STABLE).length;
    const learningCount = states.filter(s => s === ModalityStateType.LEARNING).length;
    const needsPracticeCount = states.filter(s => s === ModalityStateType.NEEDS_PRACTICE).length;

    if (masteredCount === states.length && states.length >= 2) {
      return TopicStateType.MASTERED;
    }

    if (stableCount === states.length && states.length >= 2) {
      return TopicStateType.STABLE;
    }

    if (needsPracticeCount > 0) {
      return TopicStateType.NEEDS_PRACTICE;
    }

    if (learningCount > 0) {
      return TopicStateType.LEARNING;
    }

    return TopicStateType.LEARNING;
  }

  private async classifyKnowledge(
    childId: string,
    topicStates: TopicState[]
  ): Promise<any[]> {
    const results: any[] = [];

    for (const topicState of topicStates) {
      let knowledgeState = await this.knowledgeStateRepo.findByChildAndTopic(
        childId,
        topicState.topicId
      );

      if (!knowledgeState) {
        const requiredModalities = this.getRequiredModalities(topicState.topicId);
        const modalityCoverage: Record<string, any> = {};
        for (const mod of requiredModalities) {
          modalityCoverage[mod] = topicState.modalityStates[mod] ?? 'REQUIRED';
        }

        knowledgeState = {
          childId,
          topicId: topicState.topicId,
          state: this.mapTopicToKnowledgeState(topicState.state),
          confidence: this.calculateConfidence(topicState),
          modalityCoverage,
          enteredAt: new Date(),
          lastTransitionAt: new Date(),
        } as any;
      } else {
        const newState = this.mapTopicToKnowledgeState(topicState.state);
        const confidence = this.calculateConfidence(topicState);
        // knowledgeState = knowledgeState.transitionTo(newState, confidence, 'Updated from topic state');
      }

      // await this.knowledgeStateRepo.update(knowledgeState);
      results.push(knowledgeState);
    }

    return results;
  }

  private mapTopicToKnowledgeState(topicState: TopicStateType): string {
    const mapping: Record<string, string> = {
      [TopicStateType.NEW]: KnowledgeStateType.NEW,
      [TopicStateType.LEARNING]: KnowledgeStateType.LEARNING,
      [TopicStateType.NEEDS_PRACTICE]: KnowledgeStateType.NEEDS_PRACTICE,
      [TopicStateType.STABLE]: KnowledgeStateType.STABLE,
      [TopicStateType.REINFORCEMENT]: KnowledgeStateType.REINFORCEMENT,
      [TopicStateType.MASTERED]: KnowledgeStateType.MASTERED,
    };
    return mapping[topicState] ?? KnowledgeStateType.NEW;
  }

  private calculateConfidence(topicState: TopicState): number {
    const states = Object.values(topicState.modalityStates);
    if (states.length === 0) return 0;

    const weights: Record<string, number> = {
      [ModalityStateType.NEW]: 0,
      [ModalityStateType.LEARNING]: 0.3,
      [ModalityStateType.NEEDS_PRACTICE]: 0.4,
      [ModalityStateType.STABLE]: 0.7,
      [ModalityStateType.REINFORCEMENT]: 0.85,
      [ModalityStateType.MASTERED]: 1.0,
    };

    const sum = states.reduce((acc, s) => acc + (weights[s] ?? 0), 0);
    return Math.min(sum / states.length, 1);
  }

  private getRequiredModalities(topicId: string): string[] {
    return ['VIDEO', 'AUDIO', 'SPEECH', 'WRITING'];
  }
}