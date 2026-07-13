import { DynamicRoadmap } from '../../domain/entities/dynamic-roadmap.entity.js';
import { RecoveryMode } from '../../domain/entities/recovery-mode.entity.js';
import { RecoveryModeStatus } from '../../domain/value-objects/planning-types.js';

export class RecommendationEngine {
  async getNextActivity(childId: string, roadmap: DynamicRoadmap, currentSessionProgress: number): Promise<any> {
    const roadmapData = roadmap.roadmapJson as any;
    const items = this.flattenRoadmapItems(roadmapData);
    
    // Find next incomplete item
    const nextItem = items.find(item => !item.completed);
    
    if (!nextItem) {
      // Session complete or roadmap finished
      return {
        action: 'SESSION_COMPLETE',
        message: 'All activities completed for this session',
      };
    }

    return {
      action: 'NEXT_ACTIVITY',
      topicId: nextItem.topicId,
      activityType: nextItem.activityType,
      modality: nextItem.modality,
      estimatedMinutes: nextItem.estimatedMinutes,
      effortLevel: nextItem.effortLevel,
      sectionType: nextItem.sectionType,
      order: nextItem.order,
      reason: this.getActivityReason(nextItem),
    };
  }

  async getNextTopic(childId: string, roadmap: DynamicRoadmap): Promise<any> {
    const roadmapData = roadmap.roadmapJson as any;
    const items = this.flattenRoadmapItems(roadmapData);
    
    const nextLearningItem = items.find(item => 
      item.sectionType === 'NEW_LEARNING' && !item.completed
    );

    if (!nextLearningItem) {
      return {
        action: 'NO_NEW_TOPICS',
        message: 'All topics completed for current curriculum',
      };
    }

    return {
      action: 'NEXT_TOPIC',
      topicId: nextLearningItem.topicId,
      activityType: nextLearningItem.activityType,
      modality: nextLearningItem.modality,
      estimatedMinutes: nextLearningItem.estimatedMinutes,
      reason: this.getActivityReason(nextLearningItem),
    };
  }

  // Returns next practice item from already-generated roadmap
  async getPracticeRecommendation(childId: string, roadmap: DynamicRoadmap): Promise<any> {
    const roadmapData = roadmap.roadmapJson as any;
    const items = this.flattenRoadmapItems(roadmapData);
    
    // Find first incomplete practice item in priority order
    const sectionPriority = ['RECOVERY', 'DAILY_PRACTICE', 'MASTERY_PRACTICE', 'REINFORCEMENT'];
    
    for (const sectionType of sectionPriority) {
      const section = (roadmapData.sections || []).find((s: any) => s.type === sectionType);
      if (section) {
        const nextItem = (section.items || []).find((item: any) => !item.completed);
        if (nextItem) {
          return {
            action: 'NEXT_PRACTICE',
            topicId: nextItem.topicId,
            modality: nextItem.modality,
            activityType: nextItem.activityType,
            estimatedMinutes: nextItem.estimatedMinutes,
            effortLevel: nextItem.effortLevel,
            sectionType: sectionType,
            reason: this.getActivityReason({ ...nextItem, sectionType }),
          };
        }
      }
    }

    return {
      action: 'NO_PRACTICE',
      message: 'All practice items completed',
    };
  }

  // Returns next activity for adaptive recommendation (no scoring/ranking)
  async getAdaptiveRecommendation(
    childId: string,
    roadmap: DynamicRoadmap,
    recoveryMode: any
  ): Promise<any> {
    // If recovery mode is active, continue recovery sequence
    if (recoveryMode && recoveryMode.status === RecoveryModeStatus.ACTIVE) {
      return this.getRecoveryRecommendation(childId, roadmap);
    }

    // Delegate to roadmap-based recommendation
    return this.getPracticeRecommendation(childId, roadmap);
  }

  // Returns recovery sequence from roadmap
  async getRecoveryRecommendation(childId: string, roadmap: DynamicRoadmap): Promise<any> {
    const roadmapData = roadmap.roadmapJson as any;
    const recoverySection = (roadmapData.sections || []).find((s: any) => s.type === 'RECOVERY');
    
    if (recoverySection && recoverySection.items && recoverySection.items.length > 0) {
      const nextItem = recoverySection.items.find((item: any) => !item.completed);
      if (nextItem) {
        return {
          action: 'RECOVERY',
          topicId: nextItem.topicId,
          modality: nextItem.modality,
          activityType: nextItem.activityType,
          estimatedMinutes: nextItem.estimatedMinutes,
          effortLevel: nextItem.effortLevel,
          reason: this.getActivityReason(nextItem),
        };
      }
    }

    // Fallback: simple recovery activities
    return {
      action: 'RECOVERY',
      topicId: null,
      modality: 'VIDEO',
      effortLevel: Math.max(1, 3 - 2),
      reason: 'Recovery mode active: reduced effort, confidence-building activities',
      activities: [
        { type: 'VIDEO', topicId: null, duration: 5 },
        { type: 'GAME', topicId: null, duration: 5 },
        { type: 'REWARD', topicId: null, duration: 2 },
      ],
    };
  }

  private flattenRoadmapItems(roadmapData: any): any[] {
    const items: any[] = [];
    for (const section of roadmapData.sections || []) {
      for (const item of section.items || []) {
        items.push({
          ...item,
          sectionType: section.type,
        });
      }
    }
    return items.sort((a, b) => a.order - b.order);
  }

  private getActivityReason(item: any): string {
    const reasons: Record<string, string> = {
      'RECOVERY': 'Building confidence with easier activities',
      'DAILY_PRACTICE': 'Maintaining long-term retention',
      'MASTERY_PRACTICE': 'Resolving learning debt before progressing',
      'NEW_LEARNING': 'Introducing new curriculum topic',
      'REINFORCEMENT': 'Strengthening previously learned concepts',
      'REWARD': 'Celebrating progress',
    };
    return reasons[item.sectionType] || 'Continuing learning journey';
  }
}