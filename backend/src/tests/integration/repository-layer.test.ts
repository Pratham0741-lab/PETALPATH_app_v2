import { prisma } from '../../config/database.js';
import { cleanDatabase, createTestUser, createTestChild, createTestUserData, createTestSubject, createTestSkill, createTestCategory, createTestModule, createTestLesson, createTestMentor, createTestSticker, createTestBadge } from '../helpers/factories.js';
import '../helpers/setup.js';
import { usersRepository } from '../../modules/users/users.repository.js';
import { refreshTokenRepository } from '../../modules/users/refresh-token.repository.js';
import { childrenRepository } from '../../modules/children/children.repository.js';
import { subjectRepository } from '../../modules/curriculum/repositories/subject.repository.js';
import { skillHealthRepository } from '../../modules/mastery/repositories/skill-health.repository.js';
import { skillHistoryRepository } from '../../modules/mastery/repositories/skill-history.repository.js';
import { regressionLogRepository } from '../../modules/mastery/repositories/regression-log.repository.js';

import { progressRepository } from '../../modules/progress/progress.repository.js';
import { learningProfileRepository } from '../../modules/adaptive/repositories/learning-profile.repository.js';
import { modalityPerformanceRepository } from '../../modules/adaptive/repositories/modality-performance.repository.js';
import { reinforcementQueueRepository } from '../../modules/reinforcement/repositories/reinforcement-queue.repository.js';
import { reinforcementHistoryRepository } from '../../modules/reinforcement/repositories/reinforcement-history.repository.js';
import { reinforcementEventRepository } from '../../modules/reinforcement/repositories/reinforcement-event.repository.js';
import { sessionPlanRepository } from '../../modules/session/repositories/session-plan.repository.js';
import { sessionBlockRepository } from '../../modules/session/repositories/session-block.repository.js';
import { sessionEventRepository } from '../../modules/session/repositories/session-event.repository.js';
import { sessionTemplateRepository } from '../../modules/session/repositories/session-template.repository.js';
import { LearningEventRepository } from '../../modules/adaptive-learning/infrastructure/repositories/learning-event.repository.js';
import { LearningEvidenceRepository } from '../../modules/adaptive-learning/infrastructure/repositories/learning-evidence.repository.js';
import { TopicStateRepository } from '../../modules/intelligence-core/infrastructure/repositories/topic-state.repository.js';
import { KnowledgeStateRepository } from '../../modules/intelligence-core/infrastructure/repositories/knowledge-state.repository.js';
import { RecoveryModeRepository } from '../../modules/adaptive-planning/infrastructure/repositories/recovery-mode.repository.js';
import { DynamicRoadmapRepository } from '../../modules/adaptive-planning/infrastructure/repositories/dynamic-roadmap.repository.js';
import { LearningDebtRepository } from '../../modules/adaptive-planning/infrastructure/repositories/learning-debt.repository.js';
import { ReinforcementQueueRepository as TopicReinforcementQueueRepository } from '../../modules/adaptive-planning/infrastructure/repositories/reinforcement-queue.repository.js';
import { PracticeRepository } from '../../modules/adaptive-planning/infrastructure/repositories/practice.repository.js';
import { SessionPlanRepository as AdaptiveSessionPlanRepository } from '../../modules/adaptive-planning/infrastructure/repositories/session-plan.repository.js';
import { SessionBlockRepository as AdaptiveSessionBlockRepository } from '../../modules/adaptive-planning/infrastructure/repositories/session-block.repository.js';
import { analyticsSnapshotRepository } from '../../modules/analytics/repositories/analytics-snapshot.repository.js';
import { analyticsHistoryRepository } from '../../modules/analytics/repositories/analytics-history.repository.js';
import { trendEventRepository } from '../../modules/analytics/repositories/trend-event.repository.js';
import { subjectAnalyticsRepository } from '../../modules/analytics/repositories/subject-analytics.repository.js';
import { StateRepository } from '../../modules/learning-state/infrastructure/repositories/state.repository.js';
import { MasteryState, ActivityType, ReinforcementEventType, SessionStatus, SessionBlockStatus, SessionEventType, DifficultyLevel, AnalyticsMetricType, TrendEventType } from '../../shared/enums.js';
import { TopicStateType, ModalityStateType, KnowledgeStateType, MetricCategory } from '../../modules/intelligence-core/domain/value-objects/intelligence-types.js';
import { RecoveryModeStatus, LearningDebtType, ReinforcementQueueStatus, PracticeType, SessionBlockType as PlanningSessionBlockType, ActivityType as PlanningActivityType, DifficultyLevel as PlanningDifficultyLevel } from '../../modules/adaptive-planning/domain/value-objects/planning-types.js';
import { LearningEventType, EvidenceType } from '../../modules/adaptive-learning/domain/value-objects/event-types.js';
import { LearningEvent } from '../../modules/adaptive-learning/domain/entities/learning-event.entity.js';
import { LearningEvidence } from '../../modules/adaptive-learning/domain/entities/learning-evidence.entity.js';
import { TopicState } from '../../modules/intelligence-core/domain/entities/topic-state.entity.js';
import { KnowledgeState } from '../../modules/intelligence-core/domain/entities/knowledge-state.entity.js';
import { RecoveryMode } from '../../modules/adaptive-planning/domain/entities/recovery-mode.entity.js';
import { DynamicRoadmap } from '../../modules/adaptive-planning/domain/entities/dynamic-roadmap.entity.js';
import { LearningDebt } from '../../modules/adaptive-planning/domain/entities/learning-debt.entity.js';
import { ReinforcementQueue as TopicReinforcementQueue } from '../../modules/adaptive-planning/domain/entities/reinforcement-queue.entity.js';
import { Practice } from '../../modules/adaptive-planning/domain/entities/practice.entity.js';
import { SessionPlan as AdaptiveSessionPlan, SessionStatus as AdaptiveSessionStatus } from '../../modules/adaptive-planning/domain/entities/session-plan.entity.js';
import { SessionBlock as AdaptiveSessionBlock, SessionBlockStatus as AdaptiveSessionBlockStatus } from '../../modules/adaptive-planning/domain/entities/session-block.entity.js';
import { LearningState } from '../../modules/learning-state/domain/entities/learning-state.entity.js';

describe('Repository Layer - Integration Tests', () => {

  describe('UsersRepository', () => {
    it('should create a user', async () => {
      const data = createTestUserData();
      const user = await usersRepository.create(data);
      expect(user).toBeDefined();
      expect(user.email).toBe(data.email);
      expect(user.deletedAt).toBeNull();
    });

    it('should find a user by id', async () => {
      const created = await createTestUser();
      const found = await usersRepository.findById(created.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
    });

    it('should find a user by email', async () => {
      const created = await createTestUser();
      const found = await usersRepository.findByEmail(created.email);
      expect(found).toBeDefined();
      expect(found!.email).toBe(created.email);
    });

    it('should update a user', async () => {
      const created = await createTestUser();
      const updated = await usersRepository.update(created.id, { name: 'Updated Name' });
      expect(updated.name).toBe('Updated Name');
    });

    it('should soft-delete a user', async () => {
      const created = await createTestUser();
      const deleted = await usersRepository.delete(created.id);
      expect(deleted.deletedAt).not.toBeNull();
      const found = await usersRepository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return null for non-existent id', async () => {
      const found = await usersRepository.findById('non-existent-id');
      expect(found).toBeNull();
    });

    it('should find a user by google id', async () => {
      const created = await createTestUser();
      await usersRepository.update(created.id, { googleId: 'test-google-id' });
      const found = await usersRepository.findByGoogleId('test-google-id');
      expect(found).toBeDefined();
      expect(found!.googleId).toBe('test-google-id');
    });

    it('should find all users', async () => {
      await createTestUser();
      await createTestUser();
      const users = await usersRepository.findAll();
      expect(users.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('RefreshTokenRepository', () => {
    it('should create a token', async () => {
      const user = await createTestUser();
      const expiresAt = new Date(Date.now() + 86400000);
      const token = await refreshTokenRepository.createToken(user.id, 'test-token-value', expiresAt);
      expect(token).toBeDefined();
      expect(token.token).toBe('test-token-value');
    });

    it('should find a token', async () => {
      const user = await createTestUser();
      const expiresAt = new Date(Date.now() + 86400000);
      await refreshTokenRepository.createToken(user.id, 'findable-token', expiresAt);
      const found = await refreshTokenRepository.findToken('findable-token');
      expect(found).toBeDefined();
      expect(found!.token).toBe('findable-token');
    });

    it('should delete a token', async () => {
      const user = await createTestUser();
      const expiresAt = new Date(Date.now() + 86400000);
      await refreshTokenRepository.createToken(user.id, 'deleteable-token', expiresAt);
      await refreshTokenRepository.deleteToken('deleteable-token');
      const found = await refreshTokenRepository.findToken('deleteable-token');
      expect(found).toBeNull();
    });

    it('should delete all tokens for a user', async () => {
      const user = await createTestUser();
      const expiresAt = new Date(Date.now() + 86400000);
      await refreshTokenRepository.createToken(user.id, 'token-1', expiresAt);
      await refreshTokenRepository.createToken(user.id, 'token-2', expiresAt);
      await refreshTokenRepository.deleteUserTokens(user.id);
      const found = await refreshTokenRepository.findToken('token-1');
      expect(found).toBeNull();
    });
  });

  describe('ChildrenRepository', () => {
    it('should create a child', async () => {
      const user = await createTestUser();
      const child = await childrenRepository.create({ userId: user.id, name: 'Test Child', age: 5, ageGroup: '3-5', avatar: 'default-avatar.png' });
      expect(child).toBeDefined();
      expect(child.name).toBe('Test Child');
    });

    it('should find children by user id', async () => {
      const user = await createTestUser();
      await childrenRepository.create({ userId: user.id, name: 'Child A', age: 5, ageGroup: '3-5', avatar: 'a.png' });
      await childrenRepository.create({ userId: user.id, name: 'Child B', age: 6, ageGroup: '6-8', avatar: 'b.png' });
      const children = await childrenRepository.findAllByUserId(user.id);
      expect(children).toHaveLength(2);
    });

    it('should find a child by id', async () => {
      const user = await createTestUser();
      const created = await childrenRepository.create({ userId: user.id, name: 'Findable', age: 5, ageGroup: '3-5', avatar: 'f.png' });
      const found = await childrenRepository.findById(created.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
    });

    it('should update a child', async () => {
      const user = await createTestUser();
      const created = await childrenRepository.create({ userId: user.id, name: 'Original', age: 5, ageGroup: '3-5', avatar: 'o.png' });
      const updated = await childrenRepository.update(created.id, { name: 'Updated' });
      expect(updated.name).toBe('Updated');
    });

    it('should soft-delete a child', async () => {
      const user = await createTestUser();
      const created = await childrenRepository.create({ userId: user.id, name: 'Deletable', age: 5, ageGroup: '3-5', avatar: 'd.png' });
      const deleted = await childrenRepository.delete(created.id);
      expect(deleted.deletedAt).not.toBeNull();
      const found = await childrenRepository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return null for non-existent child', async () => {
      const found = await childrenRepository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('SubjectRepository', () => {
    it('should find all subjects', async () => {
      await createTestSubject({ name: 'Subject A' + Date.now() });
      await createTestSubject({ name: 'Subject B' + Date.now() });
      const subjects = await subjectRepository.findAll();
      expect(subjects.length).toBeGreaterThanOrEqual(2);
    });

    it('should find a subject by id', async () => {
      const created = await createTestSubject();
      const found = await subjectRepository.findById(created.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
    });

    it('should find a subject by name', async () => {
      const created = await createTestSubject();
      const found = await subjectRepository.findByName(created.name);
      expect(found).toBeDefined();
      expect(found!.name).toBe(created.name);
    });

    it('should return null for non-existent id', async () => {
      const found = await subjectRepository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('SkillHealthRepository', () => {
    it('should upsert skill health', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      const result = await skillHealthRepository.upsert(child.id, skill.id, {
        masteryState: MasteryState.LEARNING,
        knowledgeScore: 50,
      });
      expect(result).toBeDefined();
      expect(result.childId).toBe(child.id);
      expect(result.skillId).toBe(skill.id);
    });

    it('should update existing skill health on upsert', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      await skillHealthRepository.upsert(child.id, skill.id, { masteryState: MasteryState.LEARNING, knowledgeScore: 50, confidenceScore: 40 });
      const updated = await skillHealthRepository.upsert(child.id, skill.id, { masteryState: MasteryState.WEAK, knowledgeScore: 30 });
      expect(updated.masteryState).toBe(MasteryState.WEAK);
    });

    it('should find by child and skill', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      await skillHealthRepository.upsert(child.id, skill.id, { masteryState: MasteryState.LEARNING, knowledgeScore: 50 });
      const found = await skillHealthRepository.findByChildAndSkill(child.id, skill.id);
      expect(found).toBeDefined();
    });

    it('should find all skill health records for a child', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill1 = await createTestSkill(subject.id, { name: 'SkillHealth SH1 ' + Date.now() });
      const skill2 = await createTestSkill(subject.id, { name: 'SkillHealth SH2 ' + Date.now() });
      await skillHealthRepository.upsert(child.id, skill1.id, { masteryState: MasteryState.LEARNING, knowledgeScore: 50 });
      await skillHealthRepository.upsert(child.id, skill2.id, { masteryState: MasteryState.LEARNING, knowledgeScore: 60 });
      const records = await skillHealthRepository.findByChild(child.id);
      expect(records).toHaveLength(2);
    });

    it('should find weak skills', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const weakSkill = await createTestSkill(subject.id, { name: 'Weak Skill ' + Date.now() });
      const strongSkill = await createTestSkill(subject.id, { name: 'Strong Skill ' + Date.now() });
      await skillHealthRepository.upsert(child.id, weakSkill.id, { masteryState: MasteryState.WEAK, knowledgeScore: 30 });
      await skillHealthRepository.upsert(child.id, strongSkill.id, { masteryState: MasteryState.MASTERED, knowledgeScore: 90 });
      const weakSkills = await skillHealthRepository.findWeakSkills(child.id);
      expect(weakSkills.length).toBeGreaterThanOrEqual(1);
    });

    it('should return null for non-existent child and skill', async () => {
      const found = await skillHealthRepository.findByChildAndSkill('no-child', 'no-skill');
      expect(found).toBeNull();
    });
  });

  describe('SkillHistoryRepository', () => {
    it('should create skill history', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      const record = await skillHistoryRepository.create({
        childId: child.id,
        skillId: skill.id,
        knowledgeScore: 80,
        confidenceScore: 75,
        retentionScore: 70,
        engagementScore: 85,
        consistencyScore: 65,
        masteryScore: 78,
        masteryState: MasteryState.LEARNING,
      });
      expect(record).toBeDefined();
      expect(record.childId).toBe(child.id);
    });

    it('should find recent skill history', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      await skillHistoryRepository.create({ childId: child.id, skillId: skill.id, knowledgeScore: 80, confidenceScore: 75, retentionScore: 70, engagementScore: 85, consistencyScore: 65, masteryScore: 78, masteryState: MasteryState.LEARNING });
      await skillHistoryRepository.create({ childId: child.id, skillId: skill.id, knowledgeScore: 85, confidenceScore: 80, retentionScore: 75, engagementScore: 90, consistencyScore: 70, masteryScore: 82, masteryState: MasteryState.LEARNING });
      const recent = await skillHistoryRepository.findRecent(child.id, skill.id, 1);
      expect(recent).toHaveLength(1);
    });
  });

  describe('RegressionLogRepository', () => {
    it('should create a regression log', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      const log = await regressionLogRepository.create({
        childId: child.id,
        skillId: skill.id,
        previousScore: 80,
        currentScore: 60,
        previousState: MasteryState.LEARNING,
        currentState: MasteryState.WEAK,
      });
      expect(log).toBeDefined();
      expect(log.previousScore).toBe(80);
    });

    it('should find regression logs by child', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      await regressionLogRepository.create({ childId: child.id, skillId: skill.id, previousScore: 80, currentScore: 60, previousState: MasteryState.LEARNING, currentState: MasteryState.WEAK });
      const logs = await regressionLogRepository.findByChild(child.id);
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it('should find recent regression logs', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      await regressionLogRepository.create({ childId: child.id, skillId: skill.id, previousScore: 80, currentScore: 60, previousState: MasteryState.LEARNING, currentState: MasteryState.WEAK });
      const recent = await regressionLogRepository.findRecent(child.id, 10);
      expect(recent).toHaveLength(1);
    });
  });

  describe('RewardsRepository', () => {
    it('should create a reward', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const reward = await prisma.reward.create({ data: { childId: child.id, title: 'Test Reward', points: 100 } });
      expect(reward).toBeDefined();
    });

    it('should find a reward by id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const created = await prisma.reward.create({ data: { childId: child.id, title: 'Findable', points: 100 } });
      const found = await prisma.reward.findFirst({ where: { id: created.id, deletedAt: null } });
      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
    });

    it('should find all rewards', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await prisma.reward.create({ data: { childId: child.id, title: 'Reward 1', points: 100 } });
      await prisma.reward.create({ data: { childId: child.id, title: 'Reward 2', points: 200 } });
      const all = await prisma.reward.findMany({ where: { deletedAt: null } });
      expect(all.length).toBeGreaterThanOrEqual(2);
    });

    it('should update a reward', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const created = await prisma.reward.create({ data: { childId: child.id, title: 'Updatable', points: 100 } });
      const updated = await prisma.reward.update({ where: { id: created.id }, data: { points: 200 } });
      expect(updated.points).toBe(200);
    });

    it('should soft-delete a reward', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const created = await prisma.reward.create({ data: { childId: child.id, title: 'Deletable', points: 100 } });
      const deleted = await prisma.reward.update({ where: { id: created.id }, data: { deletedAt: new Date() } });
      expect(deleted.deletedAt).not.toBeNull();
      const found = await prisma.reward.findFirst({ where: { id: created.id, deletedAt: null } });
      expect(found).toBeNull();
    });

    it('should return null for non-existent reward', async () => {
      const found = await prisma.reward.findFirst({ where: { id: 'non-existent-id', deletedAt: null } });
      expect(found).toBeNull();
    });
  });

  describe('ProgressRepository', () => {
    it('should create lesson progress', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const category = await createTestCategory();
      const module = await createTestModule(category.id);
      const lesson = await createTestLesson(module.id);
      const progress = await progressRepository.create({ child: { connect: { id: child.id } }, lesson: { connect: { id: lesson.id } }, status: 'IN_PROGRESS' });
      expect(progress).toBeDefined();
    });

    it('should find progress by id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const category = await createTestCategory();
      const module = await createTestModule(category.id);
      const lesson = await createTestLesson(module.id);
      const created = await progressRepository.create({ child: { connect: { id: child.id } }, lesson: { connect: { id: lesson.id } }, status: 'IN_PROGRESS' });
      const found = await progressRepository.findById(created.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
    });

    it('should find progress by child id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const category = await createTestCategory();
      const module = await createTestModule(category.id);
      const lesson = await createTestLesson(module.id);
      await progressRepository.create({ child: { connect: { id: child.id } }, lesson: { connect: { id: lesson.id } }, status: 'IN_PROGRESS' });
      const records = await progressRepository.findByChildId(child.id);
      expect(records.length).toBeGreaterThanOrEqual(1);
    });

    it('should find progress by child and lesson', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const category = await createTestCategory();
      const module = await createTestModule(category.id);
      const lesson = await createTestLesson(module.id);
      await progressRepository.create({ child: { connect: { id: child.id } }, lesson: { connect: { id: lesson.id } }, status: 'IN_PROGRESS' });
      const found = await progressRepository.findByChildAndLesson(child.id, lesson.id);
      expect(found).toBeDefined();
    });

    it('should update progress', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const category = await createTestCategory();
      const module = await createTestModule(category.id);
      const lesson = await createTestLesson(module.id);
      const created = await progressRepository.create({ child: { connect: { id: child.id } }, lesson: { connect: { id: lesson.id } }, status: 'IN_PROGRESS' });
      const updated = await progressRepository.update(created.id, { status: 'COMPLETED' });
      expect(updated.status).toBe('COMPLETED');
    });

    it('should soft-delete progress', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const category = await createTestCategory();
      const module = await createTestModule(category.id);
      const lesson = await createTestLesson(module.id);
      const created = await progressRepository.create({ child: { connect: { id: child.id } }, lesson: { connect: { id: lesson.id } }, status: 'IN_PROGRESS' });
      const deleted = await progressRepository.delete(created.id);
      expect(deleted.deletedAt).not.toBeNull();
    });

    it('should return null for non-existent progress', async () => {
      const found = await progressRepository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('LearningProfileRepository', () => {
    it('should upsert a learning profile', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const profile = await learningProfileRepository.upsert(child.id, {
        averageAccuracy: 80,
        averageEngagement: 75,
        averageConfidence: 70,
        optimalSessionDuration: 15,
        preferredModality: ActivityType.VIDEO,
        learningVelocity: 0.5,
      });
      expect(profile).toBeDefined();
      expect(profile.childId).toBe(child.id);
    });

    it('should update existing learning profile on upsert', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await learningProfileRepository.upsert(child.id, { averageAccuracy: 80, averageEngagement: 75, averageConfidence: 70, optimalSessionDuration: 15, preferredModality: ActivityType.VIDEO, learningVelocity: 0.5 });
      const updated = await learningProfileRepository.upsert(child.id, { averageAccuracy: 90, averageEngagement: 85, averageConfidence: 80, optimalSessionDuration: 20, preferredModality: ActivityType.LISTENING, learningVelocity: 0.7 });
      expect(updated.averageAccuracy).toBe(90);
      expect(updated.preferredModality).toBe(ActivityType.LISTENING);
    });

    it('should find by child id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await learningProfileRepository.upsert(child.id, { averageAccuracy: 80, averageEngagement: 75, averageConfidence: 70, optimalSessionDuration: 15, preferredModality: ActivityType.VIDEO, learningVelocity: 0.5 });
      const found = await learningProfileRepository.findByChildId(child.id);
      expect(found).toBeDefined();
      expect(found!.childId).toBe(child.id);
    });

    it('should return null for child without profile', async () => {
      const found = await learningProfileRepository.findByChildId('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('ModalityPerformanceRepository', () => {
    it('should upsert modality performance', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const result = await modalityPerformanceRepository.upsert(child.id, ActivityType.VIDEO, {
        attempts: 5,
        averageAccuracy: 80,
        averageEngagement: 75,
        averageConfidence: 70,
        lastUsedAt: new Date(),
      });
      expect(result).toBeDefined();
      expect(result.childId).toBe(child.id);
    });

    it('should update existing modality performance on upsert', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await modalityPerformanceRepository.upsert(child.id, ActivityType.VIDEO, { attempts: 5, averageAccuracy: 80, averageEngagement: 75, averageConfidence: 70, lastUsedAt: new Date() });
      const updated = await modalityPerformanceRepository.upsert(child.id, ActivityType.VIDEO, { attempts: 10, averageAccuracy: 85, averageEngagement: 80, averageConfidence: 75, lastUsedAt: new Date() });
      expect(updated.attempts).toBe(10);
    });

    it('should find by child and modality', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await modalityPerformanceRepository.upsert(child.id, ActivityType.VIDEO, { attempts: 5, averageAccuracy: 80, averageEngagement: 75, averageConfidence: 70, lastUsedAt: new Date() });
      const found = await modalityPerformanceRepository.findByChildAndModality(child.id, ActivityType.VIDEO);
      expect(found).toBeDefined();
    });

    it('should find all modality records for a child', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await modalityPerformanceRepository.upsert(child.id, ActivityType.VIDEO, { attempts: 5, averageAccuracy: 80, averageEngagement: 75, averageConfidence: 70, lastUsedAt: new Date() });
      await modalityPerformanceRepository.upsert(child.id, ActivityType.LISTENING, { attempts: 3, averageAccuracy: 70, averageEngagement: 65, averageConfidence: 60, lastUsedAt: new Date() });
      const records = await modalityPerformanceRepository.findByChild(child.id);
      expect(records).toHaveLength(2);
    });
  });

  describe('ReinforcementQueueRepository (module)', () => {
    it('should upsert a reinforcement queue item', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      const item = await reinforcementQueueRepository.upsert(child.id, skill.id, {
        priority: 5,
        masteryState: MasteryState.WEAK,
        reason: 'low_score',
        nextReviewDate: new Date(Date.now() + 86400000),
      });
      expect(item).toBeDefined();
      expect(item.childId).toBe(child.id);
    });

    it('should update existing queue item on upsert', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      await reinforcementQueueRepository.upsert(child.id, skill.id, { priority: 5, masteryState: MasteryState.WEAK, reason: 'low_score', nextReviewDate: new Date(Date.now() + 86400000) });
      const updated = await reinforcementQueueRepository.upsert(child.id, skill.id, { priority: 10, masteryState: MasteryState.LEARNING, reason: 'needs_practice', nextReviewDate: new Date(Date.now() + 172800000) });
      expect(updated.priority).toBe(10);
    });

    it('should find by child id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      await reinforcementQueueRepository.upsert(child.id, skill.id, { priority: 5, masteryState: MasteryState.WEAK, reason: 'low_score', nextReviewDate: new Date(Date.now() + 86400000) });
      const items = await reinforcementQueueRepository.findByChild(child.id);
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    it('should find by child and skill', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      await reinforcementQueueRepository.upsert(child.id, skill.id, { priority: 5, masteryState: MasteryState.WEAK, reason: 'low_score', nextReviewDate: new Date(Date.now() + 86400000) });
      const found = await reinforcementQueueRepository.findByChildAndSkill(child.id, skill.id);
      expect(found).toBeDefined();
    });

    it('should mark as completed', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      await reinforcementQueueRepository.upsert(child.id, skill.id, { priority: 5, masteryState: MasteryState.WEAK, reason: 'low_score', nextReviewDate: new Date(Date.now() + 86400000) });
      const completed = await reinforcementQueueRepository.markCompleted(child.id, skill.id);
      expect(completed).not.toBeNull();
    });

    it('should remove by child and skill', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      await reinforcementQueueRepository.upsert(child.id, skill.id, { priority: 5, masteryState: MasteryState.WEAK, reason: 'low_score', nextReviewDate: new Date(Date.now() + 86400000) });
      const removed = await reinforcementQueueRepository.removeByChildAndSkill(child.id, skill.id);
      expect(removed).not.toBeNull();
      const found = await reinforcementQueueRepository.findByChildAndSkill(child.id, skill.id);
      expect(found).toBeNull();
    });

    it('should find due skills', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      const pastDate = new Date(Date.now() - 86400000);
      await reinforcementQueueRepository.upsert(child.id, skill.id, { priority: 5, masteryState: MasteryState.WEAK, reason: 'low_score', nextReviewDate: pastDate });
      const due = await reinforcementQueueRepository.findDueSkills(child.id, new Date());
      expect(due.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('ReinforcementHistoryRepository', () => {
    it('should create reinforcement history', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      const record = await reinforcementHistoryRepository.create({
        childId: child.id,
        skillId: skill.id,
        activityType: ActivityType.VIDEO,
        beforeScore: 50,
        afterScore: 75,
        scoreDifference: 25,
        success: true,
      });
      expect(record).toBeDefined();
      expect(record.beforeScore).toBe(50);
    });

    it('should find by child', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      await reinforcementHistoryRepository.create({ childId: child.id, skillId: skill.id, activityType: ActivityType.VIDEO, beforeScore: 50, afterScore: 75, scoreDifference: 25, success: true });
      const records = await reinforcementHistoryRepository.findByChild(child.id);
      expect(records.length).toBeGreaterThanOrEqual(1);
    });

    it('should find by child and skill', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      await reinforcementHistoryRepository.create({ childId: child.id, skillId: skill.id, activityType: ActivityType.VIDEO, beforeScore: 50, afterScore: 75, scoreDifference: 25, success: true });
      const records = await reinforcementHistoryRepository.findByChildAndSkill(child.id, skill.id);
      expect(records.length).toBeGreaterThanOrEqual(1);
    });

    it('should find recent', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      await reinforcementHistoryRepository.create({ childId: child.id, skillId: skill.id, activityType: ActivityType.VIDEO, beforeScore: 50, afterScore: 75, scoreDifference: 25, success: true });
      const recent = await reinforcementHistoryRepository.findRecent(child.id, skill.id);
      expect(recent).toBeDefined();
    });
  });

  describe('ReinforcementEventRepository', () => {
    it('should create a reinforcement event', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      const event = await reinforcementEventRepository.create({
        childId: child.id,
        skillId: skill.id,
        eventType: ReinforcementEventType.REVIEW_TRIGGERED,
      });
      expect(event).toBeDefined();
    });

    it('should find by child', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      await reinforcementEventRepository.create({ childId: child.id, skillId: skill.id, eventType: ReinforcementEventType.REVIEW_TRIGGERED });
      const events = await reinforcementEventRepository.findByChild(child.id);
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it('should find by child and type', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      await reinforcementEventRepository.create({ childId: child.id, skillId: skill.id, eventType: ReinforcementEventType.REVIEW_TRIGGERED });
      const events = await reinforcementEventRepository.findByChildAndType(child.id, ReinforcementEventType.REVIEW_TRIGGERED);
      expect(events.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('SessionPlanRepository (session module)', () => {
    it('should create a session plan', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const plan = await sessionPlanRepository.create({ childId: child.id, durationMinutes: 15 });
      expect(plan).toBeDefined();
      expect(plan.childId).toBe(child.id);
    });

    it('should find a session plan by id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const created = await sessionPlanRepository.create({ childId: child.id, durationMinutes: 15 });
      const found = await sessionPlanRepository.findById(created.id);
      expect(found).toBeDefined();
    });

    it('should find plans by child', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await sessionPlanRepository.create({ childId: child.id, durationMinutes: 15 });
      const plans = await sessionPlanRepository.findByChild(child.id);
      expect(plans.length).toBeGreaterThanOrEqual(1);
    });

    it('should update session plan status', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const created = await sessionPlanRepository.create({ childId: child.id, durationMinutes: 15 });
      const updated = await sessionPlanRepository.updateStatus(created.id, SessionStatus.STARTED, { startedAt: new Date() });
      expect(updated.status).toBe(SessionStatus.STARTED);
    });

    it('should find active session', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await sessionPlanRepository.create({ childId: child.id, durationMinutes: 15 });
      const active = await sessionPlanRepository.findActiveSession(child.id);
      expect(active).toBeDefined();
    });

    it('should find history', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await sessionPlanRepository.create({ childId: child.id, durationMinutes: 15 });
      const history = await sessionPlanRepository.findHistory(child.id);
      expect(history.length).toBeGreaterThanOrEqual(1);
    });

    it('should return null for non-existent plan', async () => {
      const found = await sessionPlanRepository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('SessionBlockRepository (session module)', () => {
    it('should create a session block', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const plan = await sessionPlanRepository.create({ childId: child.id, durationMinutes: 15 });
      const block = await sessionBlockRepository.create({
        sessionPlanId: plan.id,
        activityType: ActivityType.VIDEO,
        difficulty: DifficultyLevel.EASY,
        estimatedMinutes: 5,
        position: 1,
      });
      expect(block).toBeDefined();
      expect(block.sessionPlanId).toBe(plan.id);
    });

    it('should update block status', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const plan = await sessionPlanRepository.create({ childId: child.id, durationMinutes: 15 });
      const block = await sessionBlockRepository.create({ sessionPlanId: plan.id, activityType: ActivityType.VIDEO, difficulty: DifficultyLevel.EASY, estimatedMinutes: 5, position: 1 });
      const updated = await sessionBlockRepository.updateStatus(block.id, SessionBlockStatus.COMPLETED, new Date());
      expect(updated.status).toBe(SessionBlockStatus.COMPLETED);
    });

    it('should find blocks by plan id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const plan = await sessionPlanRepository.create({ childId: child.id, durationMinutes: 15 });
      await sessionBlockRepository.create({ sessionPlanId: plan.id, activityType: ActivityType.VIDEO, difficulty: DifficultyLevel.EASY, estimatedMinutes: 5, position: 1 });
      const blocks = await sessionBlockRepository.findBlocksByPlanId(plan.id);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('SessionEventRepository', () => {
    it('should create a session event', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const plan = await sessionPlanRepository.create({ childId: child.id, durationMinutes: 15 });
      const event = await sessionEventRepository.create({ sessionPlanId: plan.id, eventType: SessionEventType.STARTED });
      expect(event).toBeDefined();
    });

    it('should find events by plan id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const plan = await sessionPlanRepository.create({ childId: child.id, durationMinutes: 15 });
      await sessionEventRepository.create({ sessionPlanId: plan.id, eventType: SessionEventType.STARTED });
      const events = await sessionEventRepository.findByPlanId(plan.id);
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it('should find events by child', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const plan = await sessionPlanRepository.create({ childId: child.id, durationMinutes: 15 });
      await sessionEventRepository.create({ sessionPlanId: plan.id, eventType: SessionEventType.STARTED });
      const events = await sessionEventRepository.findByChild(child.id);
      expect(events.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('SessionTemplateRepository', () => {
    it('should create a session template', async () => {
      const template = await sessionTemplateRepository.create({ name: 'Test Template', durationMinutes: 15, blockSequence: [{ type: 'VIDEO', duration: 5 }] });
      expect(template).toBeDefined();
      expect(template.name).toBe('Test Template');
    });

    it('should find all templates', async () => {
      await sessionTemplateRepository.create({ name: 'Template A', durationMinutes: 10, blockSequence: [] });
      await sessionTemplateRepository.create({ name: 'Template B', durationMinutes: 20, blockSequence: [] });
      const templates = await sessionTemplateRepository.findAll();
      expect(templates.length).toBeGreaterThanOrEqual(2);
    });

    it('should find template by id', async () => {
      const created = await sessionTemplateRepository.create({ name: 'Findable', durationMinutes: 15, blockSequence: [] });
      const found = await sessionTemplateRepository.findById(created.id);
      expect(found).toBeDefined();
    });

    it('should find by duration', async () => {
      await sessionTemplateRepository.create({ name: 'Duration Match', durationMinutes: 15, blockSequence: [] });
      const found = await sessionTemplateRepository.findByDuration(15);
      expect(found).toBeDefined();
      expect(found!.durationMinutes).toBe(15);
    });

    it('should upsert a template', async () => {
      const upserted = await sessionTemplateRepository.upsert('Upserted Template', 20, [{ type: 'GAME', duration: 10 }]);
      expect(upserted).toBeDefined();
      const upsertedAgain = await sessionTemplateRepository.upsert('Upserted Template', 25, [{ type: 'GAME', duration: 15 }]);
      expect(upsertedAgain.durationMinutes).toBe(25);
    });

    it('should return null for non-existent template', async () => {
      const found = await sessionTemplateRepository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('LearningEventRepository', () => {
    const repo = new LearningEventRepository();

    it('should create a learning event', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const event = LearningEvent.create({ eventType: LearningEventType.ACTIVITY_COMPLETED, eventVersion: 1, childId: child.id, sessionId: crypto.randomUUID(), timestamp: new Date() });
      const created = await repo.create(event);
      expect(created).toBeDefined();
      expect(created.childId).toBe(child.id);
    });

    it('should find a learning event by id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const event = LearningEvent.create({ eventType: LearningEventType.ACTIVITY_COMPLETED, eventVersion: 1, childId: child.id, sessionId: crypto.randomUUID(), timestamp: new Date() });
      const created = await repo.create(event);
      const found = await repo.findById(created.eventId);
      expect(found).toBeDefined();
      expect(found!.eventId).toBe(created.eventId);
    });

    it('should find events by child id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const event = LearningEvent.create({ eventType: LearningEventType.ACTIVITY_COMPLETED, eventVersion: 1, childId: child.id, sessionId: crypto.randomUUID(), timestamp: new Date() });
      await repo.create(event);
      const events = await repo.findByChildId(child.id);
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it('should find events by session id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const sessionId = crypto.randomUUID();
      const event = LearningEvent.create({ eventType: LearningEventType.ACTIVITY_COMPLETED, eventVersion: 1, childId: child.id, sessionId, timestamp: new Date() });
      await repo.create(event);
      const events = await repo.findBySessionId(sessionId);
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it('should find by idempotency key', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const ik = `ik-${crypto.randomUUID()}`;
      const event = LearningEvent.create({ eventType: LearningEventType.ACTIVITY_COMPLETED, eventVersion: 1, childId: child.id, sessionId: crypto.randomUUID(), timestamp: new Date(), idempotencyKey: ik });
      await repo.create(event);
      const found = await repo.findByIdempotencyKey(ik);
      expect(found).toBeDefined();
      const exists = await repo.existsByIdempotencyKey(ik);
      expect(exists).toBe(true);
    });

    it('should return null for non-existent event', async () => {
      const found = await repo.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('LearningEvidenceRepository', () => {
    const repo = new LearningEvidenceRepository();
    const eventRepo = new LearningEventRepository();

    async function createParentEvent(childId: string): Promise<string> {
      const eventId = crypto.randomUUID();
      const event = LearningEvent.create({ eventId, eventType: LearningEventType.ACTIVITY_COMPLETED, eventVersion: 1, childId, sessionId: crypto.randomUUID(), timestamp: new Date(), idempotencyKey: `ik-${eventId}` });
      await eventRepo.create(event);
      return eventId;
    }

    it('should create learning evidence', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const eventId = await createParentEvent(child.id);
      const evidence = LearningEvidence.create({ eventId, childId: child.id, sessionId: crypto.randomUUID(), evidenceType: EvidenceType.ATTEMPTS, observation: { correct: true } });
      const created = await repo.create(evidence);
      expect(created).toBeDefined();
      expect(created.childId).toBe(child.id);
    });

    it('should find by event id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const eventId = await createParentEvent(child.id);
      const evidence = LearningEvidence.create({ eventId, childId: child.id, sessionId: crypto.randomUUID(), evidenceType: EvidenceType.ATTEMPTS, observation: { correct: true } });
      await repo.create(evidence);
      const found = await repo.findByEventId(eventId);
      expect(found).toBeDefined();
    });

    it('should find by child id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const eventId = await createParentEvent(child.id);
      const evidence = LearningEvidence.create({ eventId, childId: child.id, sessionId: crypto.randomUUID(), evidenceType: EvidenceType.ATTEMPTS, observation: { correct: true } });
      await repo.create(evidence);
      const records = await repo.findByChildId(child.id);
      expect(records.length).toBeGreaterThanOrEqual(1);
    });

    it('should find by evidence type', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const eventId = await createParentEvent(child.id);
      const evidence = LearningEvidence.create({ eventId, childId: child.id, sessionId: crypto.randomUUID(), evidenceType: EvidenceType.ATTEMPTS, observation: { correct: true } });
      await repo.create(evidence);
      const records = await repo.findByEvidenceType(child.id, EvidenceType.ATTEMPTS);
      expect(records.length).toBeGreaterThanOrEqual(1);
    });

    it('should return null for non-existent event id', async () => {
      const found = await repo.findByEventId('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('TopicStateRepository', () => {
    const repo = new TopicStateRepository();

    it('should create a topic state', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();
      const topicState = TopicState.create({ childId: child.id, topicId: crypto.randomUUID(), state: TopicStateType.NEW, modalityStates: { VIDEO: ModalityStateType.NEW }, enteredAt: now, lastTransitionAt: now });
      const created = await repo.create(topicState);
      expect(created).toBeDefined();
      expect(created.childId).toBe(child.id);
    });

    it('should find by id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();
      const topicState = TopicState.create({ childId: child.id, topicId: crypto.randomUUID(), state: TopicStateType.NEW, modalityStates: { VIDEO: ModalityStateType.NEW }, enteredAt: now, lastTransitionAt: now });
      const created = await repo.create(topicState);
      const found = await repo.findById(created.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
    });

    it('should find by child and topic', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const topicId = crypto.randomUUID();
      const now = new Date();
      const topicState = TopicState.create({ childId: child.id, topicId, state: TopicStateType.NEW, modalityStates: { VIDEO: ModalityStateType.NEW }, enteredAt: now, lastTransitionAt: now });
      await repo.create(topicState);
      const found = await repo.findByChildAndTopic(child.id, topicId);
      expect(found).toBeDefined();
    });

    it('should find all states for child', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();
      await repo.create(TopicState.create({ childId: child.id, topicId: crypto.randomUUID(), state: TopicStateType.NEW, modalityStates: { VIDEO: ModalityStateType.NEW }, enteredAt: now, lastTransitionAt: now }));
      await repo.create(TopicState.create({ childId: child.id, topicId: crypto.randomUUID(), state: TopicStateType.LEARNING, modalityStates: { VIDEO: ModalityStateType.LEARNING }, enteredAt: now, lastTransitionAt: now }));
      const records = await repo.findByChildId(child.id);
      expect(records.length).toBeGreaterThanOrEqual(2);
    });

    it('should update a topic state', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();
      const original = TopicState.create({ childId: child.id, topicId: crypto.randomUUID(), state: TopicStateType.NEW, modalityStates: { VIDEO: ModalityStateType.NEW }, enteredAt: now, lastTransitionAt: now });
      const created = await repo.create(original);
      const updated = created.transitionTo(TopicStateType.LEARNING, 'started_learning');
      const result = await repo.update(updated);
      expect(result.state).toBe(TopicStateType.LEARNING);
    });

    it('should return null for non-existent topic state', async () => {
      const found = await repo.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('KnowledgeStateRepository', () => {
    const repo = new KnowledgeStateRepository();

    it('should create a knowledge state', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();
      const ks = KnowledgeState.create({ childId: child.id, topicId: crypto.randomUUID(), state: KnowledgeStateType.NEW, confidence: 0, modalityCoverage: { VIDEO: ModalityStateType.NEW }, enteredAt: now, lastTransitionAt: now });
      const created = await repo.create(ks);
      expect(created).toBeDefined();
      expect(created.childId).toBe(child.id);
    });

    it('should find by child and topic', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const topicId = crypto.randomUUID();
      const now = new Date();
      const ks = KnowledgeState.create({ childId: child.id, topicId, state: KnowledgeStateType.NEW, confidence: 0, modalityCoverage: { VIDEO: ModalityStateType.NEW }, enteredAt: now, lastTransitionAt: now });
      await repo.create(ks);
      const found = await repo.findByChildAndTopic(child.id, topicId);
      expect(found).toBeDefined();
    });

    it('should find all states for child', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();
      await repo.create(KnowledgeState.create({ childId: child.id, topicId: crypto.randomUUID(), state: KnowledgeStateType.NEW, confidence: 0, modalityCoverage: { VIDEO: ModalityStateType.NEW }, enteredAt: now, lastTransitionAt: now }));
      await repo.create(KnowledgeState.create({ childId: child.id, topicId: crypto.randomUUID(), state: KnowledgeStateType.LEARNING, confidence: 50, modalityCoverage: { VIDEO: ModalityStateType.LEARNING }, enteredAt: now, lastTransitionAt: now }));
      const records = await repo.findByChildId(child.id);
      expect(records.length).toBeGreaterThanOrEqual(2);
    });

    it('should update a knowledge state', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();
      const original = KnowledgeState.create({ childId: child.id, topicId: crypto.randomUUID(), state: KnowledgeStateType.NEW, confidence: 0, modalityCoverage: { VIDEO: ModalityStateType.NEW }, enteredAt: now, lastTransitionAt: now });
      const created = await repo.create(original);
      const updated = created.transitionTo(KnowledgeStateType.LEARNING, 50, 'started');
      const result = await repo.update(updated);
      expect(result.state).toBe(KnowledgeStateType.LEARNING);
    });

    it('should return null for non-existent child and topic', async () => {
      const found = await repo.findByChildAndTopic('no-child', 'no-topic');
      expect(found).toBeNull();
    });
  });

  describe('RecoveryModeRepository', () => {
    const repo = new RecoveryModeRepository();

    it('should create a recovery mode', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();
      const rm = RecoveryMode.create({ childId: child.id, status: RecoveryModeStatus.ACTIVE, triggerReason: 'low_performance', enteredAt: now, effortTierDrop: 1, minTopicsAtTier: 3, currentTier: 1 });
      const created = await repo.create(rm);
      expect(created).toBeDefined();
      expect(created.childId).toBe(child.id);
    });

    it('should find by child id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();
      const rm = RecoveryMode.create({ childId: child.id, status: RecoveryModeStatus.ACTIVE, triggerReason: 'low_performance', enteredAt: now, effortTierDrop: 1, minTopicsAtTier: 3, currentTier: 1 });
      await repo.create(rm);
      const found = await repo.findByChildId(child.id);
      expect(found).toBeDefined();
    });

    it('should find active by child id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();
      const rm = RecoveryMode.create({ childId: child.id, status: RecoveryModeStatus.ACTIVE, triggerReason: 'low_performance', enteredAt: now, effortTierDrop: 1, minTopicsAtTier: 3, currentTier: 1 });
      await repo.create(rm);
      const active = await repo.findActiveByChildId(child.id);
      expect(active).toBeDefined();
      expect(active!.status).toBe(RecoveryModeStatus.ACTIVE);
    });

    it('should update a recovery mode', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();
      const rm = RecoveryMode.create({ childId: child.id, status: RecoveryModeStatus.ACTIVE, triggerReason: 'low_performance', enteredAt: now, effortTierDrop: 1, minTopicsAtTier: 3, currentTier: 1 });
      const created = await repo.create(rm);
      const updated = created.resolve();
      const result = await repo.update(updated);
      expect(result.status).toBe(RecoveryModeStatus.RESOLVED);
    });

    it('should return null for non-existent child', async () => {
      const found = await repo.findByChildId('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('DynamicRoadmapRepository', () => {
    const repo = new DynamicRoadmapRepository();

    it('should create a dynamic roadmap', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const roadmap = DynamicRoadmap.create({ childId: child.id, roadmapJson: { sections: [] }, generatedAt: new Date() });
      const created = await repo.create(roadmap);
      expect(created).toBeDefined();
      expect(created.childId).toBe(child.id);
    });

    it('should find by child id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const roadmap = DynamicRoadmap.create({ childId: child.id, roadmapJson: { sections: [] }, generatedAt: new Date() });
      await repo.create(roadmap);
      const found = await repo.findByChildId(child.id);
      expect(found).toBeDefined();
    });

    it('should update a roadmap', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const roadmap = DynamicRoadmap.create({ childId: child.id, roadmapJson: { sections: [] }, generatedAt: new Date() });
      const created = await repo.create(roadmap);
      const updated = created.updateRoadmap({ sections: [{ id: '1' }] }, new Date(Date.now() + 86400000));
      const result = await repo.update(updated);
      expect(result.version).toBe(2);
    });

    it('should return null for non-existent child', async () => {
      const found = await repo.findByChildId('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('LearningDebtRepository', () => {
    const repo = new LearningDebtRepository();

    it('should create a learning debt', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const debt = LearningDebt.create({ childId: child.id, topicId: crypto.randomUUID(), debtType: LearningDebtType.PRACTICE, severity: 3, description: 'Needs practice' });
      const created = await repo.create(debt);
      expect(created).toBeDefined();
      expect(created.childId).toBe(child.id);
    });

    it('should find by id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const debt = LearningDebt.create({ childId: child.id, topicId: crypto.randomUUID(), debtType: LearningDebtType.PRACTICE, severity: 3, description: 'Needs practice' });
      const created = await repo.create(debt);
      const found = await repo.findById(created.id);
      expect(found).toBeDefined();
    });

    it('should find by child id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const debt = LearningDebt.create({ childId: child.id, topicId: crypto.randomUUID(), debtType: LearningDebtType.PRACTICE, severity: 3, description: 'Needs practice' });
      await repo.create(debt);
      const records = await repo.findByChildId(child.id);
      expect(records.length).toBeGreaterThanOrEqual(1);
    });

    it('should find by child and topic', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const topicId = crypto.randomUUID();
      const debt = LearningDebt.create({ childId: child.id, topicId, debtType: LearningDebtType.PRACTICE, severity: 3, description: 'Needs practice' });
      await repo.create(debt);
      const records = await repo.findByChildAndTopic(child.id, topicId);
      expect(records.length).toBeGreaterThanOrEqual(1);
    });

    it('should find unresolved debts', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const debt = LearningDebt.create({ childId: child.id, topicId: crypto.randomUUID(), debtType: LearningDebtType.PRACTICE, severity: 3, description: 'Needs practice' });
      await repo.create(debt);
      const unresolved = await repo.findUnresolvedByChildId(child.id);
      expect(unresolved.length).toBeGreaterThanOrEqual(1);
      expect(unresolved[0].resolved).toBe(false);
    });

    it('should resolve a debt', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const debt = LearningDebt.create({ childId: child.id, topicId: crypto.randomUUID(), debtType: LearningDebtType.PRACTICE, severity: 3, description: 'Needs practice' });
      const created = await repo.create(debt);
      const resolved = await repo.resolve(created.id);
      expect(resolved.resolved).toBe(true);
      expect(resolved.resolvedAt).toBeDefined();
    });

    it('should update a debt', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const debt = LearningDebt.create({ childId: child.id, topicId: crypto.randomUUID(), debtType: LearningDebtType.PRACTICE, severity: 3, description: 'Needs practice' });
      const created = await repo.create(debt);
      const updatedDebt = created.resolve();
      const result = await repo.update(updatedDebt);
      expect(result.resolved).toBe(true);
    });

    it('should return null for non-existent debt', async () => {
      const found = await repo.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('TopicReinforcementQueueRepository (adaptive-planning)', () => {
    const repo = new TopicReinforcementQueueRepository();

    it('should create a topic reinforcement queue', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const queue = TopicReinforcementQueue.create({ childId: child.id, topicId: crypto.randomUUID(), startedAt: new Date(), nextReviewAt: new Date(Date.now() + 86400000), reviewFrequency: 7, reviewCount: 0, successfulReviews: 0, status: ReinforcementQueueStatus.ACTIVE, priority: 5 });
      const created = await repo.create(queue);
      expect(created).toBeDefined();
      expect(created.childId).toBe(child.id);
    });

    it('should find by child and topic', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const topicId = crypto.randomUUID();
      const queue = TopicReinforcementQueue.create({ childId: child.id, topicId, startedAt: new Date(), nextReviewAt: new Date(Date.now() + 86400000), reviewFrequency: 7, reviewCount: 0, successfulReviews: 0, status: ReinforcementQueueStatus.ACTIVE, priority: 5 });
      await repo.create(queue);
      const found = await repo.findByChildAndTopic(child.id, topicId);
      expect(found).toBeDefined();
    });

    it('should find due reviews', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const queue = TopicReinforcementQueue.create({ childId: child.id, topicId: crypto.randomUUID(), startedAt: new Date(), nextReviewAt: new Date(Date.now() - 86400000), reviewFrequency: 7, reviewCount: 0, successfulReviews: 0, status: ReinforcementQueueStatus.ACTIVE, priority: 5 });
      await repo.create(queue);
      const due = await repo.findDueReviews(child.id, new Date());
      expect(due.length).toBeGreaterThanOrEqual(1);
    });

    it('should find active by child', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const queue = TopicReinforcementQueue.create({ childId: child.id, topicId: crypto.randomUUID(), startedAt: new Date(), nextReviewAt: new Date(Date.now() + 86400000), reviewFrequency: 7, reviewCount: 0, successfulReviews: 0, status: ReinforcementQueueStatus.ACTIVE, priority: 5 });
      await repo.create(queue);
      const active = await repo.findActiveByChild(child.id);
      expect(active.length).toBeGreaterThanOrEqual(1);
    });

    it('should update a queue item', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const queue = TopicReinforcementQueue.create({ childId: child.id, topicId: crypto.randomUUID(), startedAt: new Date(), nextReviewAt: new Date(Date.now() + 86400000), reviewFrequency: 7, reviewCount: 0, successfulReviews: 0, status: ReinforcementQueueStatus.ACTIVE, priority: 5 });
      const created = await repo.create(queue);
      const updated = created.recordReview(true);
      const result = await repo.update(updated);
      expect(result.reviewCount).toBe(1);
    });

    it('should return null for non-existent topic', async () => {
      const found = await repo.findByChildAndTopic('no-child', 'no-topic');
      expect(found).toBeNull();
    });
  });

  describe('PracticeRepository', () => {
    const repo = new PracticeRepository();

    it('should create a practice record', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const practice = Practice.create({ childId: child.id, topicId: crypto.randomUUID(), type: PracticeType.DAILY, scheduledFor: new Date() });
      const created = await repo.create(practice);
      expect(created).toBeDefined();
      expect(created.childId).toBe(child.id);
    });

    it('should find by id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const practice = Practice.create({ childId: child.id, topicId: crypto.randomUUID(), type: PracticeType.DAILY, scheduledFor: new Date() });
      const created = await repo.create(practice);
      const found = await repo.findById(created.id);
      expect(found).toBeDefined();
    });

    it('should find by child id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const practice = Practice.create({ childId: child.id, topicId: crypto.randomUUID(), type: PracticeType.DAILY, scheduledFor: new Date() });
      await repo.create(practice);
      const records = await repo.findByChildId(child.id);
      expect(records.length).toBeGreaterThanOrEqual(1);
    });

    it('should find by child id and type', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const practice = Practice.create({ childId: child.id, topicId: crypto.randomUUID(), type: PracticeType.DAILY, scheduledFor: new Date() });
      await repo.create(practice);
      const records = await repo.findByChildIdAndType(child.id, PracticeType.DAILY);
      expect(records.length).toBeGreaterThanOrEqual(1);
    });

    it('should find by child and topic', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const topicId = crypto.randomUUID();
      const practice = Practice.create({ childId: child.id, topicId, type: PracticeType.DAILY, scheduledFor: new Date() });
      await repo.create(practice);
      const records = await repo.findByChildIdAndTopicId(child.id, topicId);
      expect(records.length).toBeGreaterThanOrEqual(1);
    });

    it('should find pending by child id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const practice = Practice.create({ childId: child.id, topicId: crypto.randomUUID(), type: PracticeType.DAILY, scheduledFor: new Date() });
      await repo.create(practice);
      const pending = await repo.findPendingByChildId(child.id);
      expect(pending.length).toBeGreaterThanOrEqual(1);
      expect(pending[0].completed).toBe(false);
    });

    it('should find by date range', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const practice = Practice.create({ childId: child.id, topicId: crypto.randomUUID(), type: PracticeType.DAILY, scheduledFor: new Date() });
      await repo.create(practice);
      const records = await repo.findByChildIdAndDateRange(child.id, new Date(Date.now() - 86400000), new Date(Date.now() + 86400000));
      expect(records.length).toBeGreaterThanOrEqual(1);
    });

    it('should update a practice', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const practice = Practice.create({ childId: child.id, topicId: crypto.randomUUID(), type: PracticeType.DAILY, scheduledFor: new Date() });
      const created = await repo.create(practice);
      const updated = practice.complete();
      const result = await repo.update(updated);
      expect(result.completed).toBe(true);
    });

    it('should return null for non-existent practice', async () => {
      const found = await repo.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('AdaptiveSessionPlanRepository', () => {
    const repo = new AdaptiveSessionPlanRepository();

    it('should create a session plan', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const plan = AdaptiveSessionPlan.create({ childId: child.id, durationMinutes: 15 });
      const created = await repo.create(plan);
      expect(created).toBeDefined();
      expect(created.childId).toBe(child.id);
    });

    it('should find by id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const plan = AdaptiveSessionPlan.create({ childId: child.id, durationMinutes: 15 });
      const created = await repo.create(plan);
      const found = await repo.findById(created.id);
      expect(found).toBeDefined();
    });

    it('should find by child id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const plan = AdaptiveSessionPlan.create({ childId: child.id, durationMinutes: 15 });
      await repo.create(plan);
      const records = await repo.findByChildId(child.id);
      expect(records.length).toBeGreaterThanOrEqual(1);
    });

    it('should find active by child id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const plan = AdaptiveSessionPlan.create({ childId: child.id, durationMinutes: 15 });
      await repo.create(plan);
      const active = await repo.findActiveByChildId(child.id);
      expect(active).toBeDefined();
    });

    it('should update status', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const plan = AdaptiveSessionPlan.create({ childId: child.id, durationMinutes: 15 });
      const created = await repo.create(plan);
      const updated = await repo.updateStatus(created.id, AdaptiveSessionStatus.STARTED);
      expect(updated.status).toBe(AdaptiveSessionStatus.STARTED);
    });

    it('should update a plan', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const plan = AdaptiveSessionPlan.create({ childId: child.id, durationMinutes: 15 });
      const created = await repo.create(plan);
      const started = created.start();
      const result = await repo.update(started);
      expect(result.status).toBe(AdaptiveSessionStatus.STARTED);
    });

    it('should return null for non-existent plan', async () => {
      const found = await repo.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('AdaptiveSessionBlockRepository', () => {
    const repo = new AdaptiveSessionBlockRepository();

    async function createTestPlan(childId: string) {
      const plan = AdaptiveSessionPlan.create({ childId, durationMinutes: 15 });
      return await new AdaptiveSessionPlanRepository().create(plan);
    }

    it('should create a session block', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const createdPlan = await createTestPlan(child.id);
      const block = AdaptiveSessionBlock.create({ sessionPlanId: createdPlan.id, type: PlanningSessionBlockType.DAILY_PRACTICE, activityType: PlanningActivityType.VIDEO, difficulty: PlanningDifficultyLevel.EASY, estimatedMinutes: 5, effortLevel: 1, order: 1, isReinforcement: false, status: AdaptiveSessionBlockStatus.PENDING });
      const created = await repo.create(block);
      expect(created).toBeDefined();
      expect(created.sessionPlanId).toBe(createdPlan.id);
    });

    it('should find by id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const createdPlan = await createTestPlan(child.id);
      const block = AdaptiveSessionBlock.create({ sessionPlanId: createdPlan.id, type: PlanningSessionBlockType.DAILY_PRACTICE, activityType: PlanningActivityType.VIDEO, difficulty: PlanningDifficultyLevel.EASY, estimatedMinutes: 5, effortLevel: 1, order: 1, isReinforcement: false, status: AdaptiveSessionBlockStatus.PENDING });
      const created = await repo.create(block);
      const found = await repo.findById(created.id);
      expect(found).toBeDefined();
    });

    it('should find by session plan id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const createdPlan = await createTestPlan(child.id);
      const block = AdaptiveSessionBlock.create({ sessionPlanId: createdPlan.id, type: PlanningSessionBlockType.DAILY_PRACTICE, activityType: PlanningActivityType.VIDEO, difficulty: PlanningDifficultyLevel.EASY, estimatedMinutes: 5, effortLevel: 1, order: 1, isReinforcement: false, status: AdaptiveSessionBlockStatus.PENDING });
      await repo.create(block);
      const blocks = await repo.findBySessionPlanId(createdPlan.id);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
    });

    it('should update status', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const createdPlan = await createTestPlan(child.id);
      const block = AdaptiveSessionBlock.create({ sessionPlanId: createdPlan.id, type: PlanningSessionBlockType.DAILY_PRACTICE, activityType: PlanningActivityType.VIDEO, difficulty: PlanningDifficultyLevel.EASY, estimatedMinutes: 5, effortLevel: 1, order: 1, isReinforcement: false, status: AdaptiveSessionBlockStatus.PENDING });
      const created = await repo.create(block);
      const updated = await repo.updateStatus(created.id, AdaptiveSessionBlockStatus.COMPLETED, new Date());
      expect(updated.status).toBe(AdaptiveSessionBlockStatus.COMPLETED);
    });

    it('should update a block', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const createdPlan = await createTestPlan(child.id);
      const block = AdaptiveSessionBlock.create({ sessionPlanId: createdPlan.id, type: PlanningSessionBlockType.DAILY_PRACTICE, activityType: PlanningActivityType.VIDEO, difficulty: PlanningDifficultyLevel.EASY, estimatedMinutes: 5, effortLevel: 1, order: 1, isReinforcement: false, status: AdaptiveSessionBlockStatus.PENDING });
      const created = await repo.create(block);
      const completed = created.complete();
      const result = await repo.update(completed);
      expect(result.status).toBe(AdaptiveSessionBlockStatus.COMPLETED);
    });
  });

  describe('AnalyticsSnapshotRepository', () => {
    it('should upsert an analytics snapshot', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const snapshot = await analyticsSnapshotRepository.upsert(child.id, { accuracy: 80, confidence: 75, retention: 70, engagement: 85, learningVelocity: 0.5, sessionCompletionRate: 90, reinforcementSuccessRate: 75 });
      expect(snapshot).toBeDefined();
      expect(snapshot.childId).toBe(child.id);
    });

    it('should update existing snapshot on upsert', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await analyticsSnapshotRepository.upsert(child.id, { accuracy: 80, confidence: 75, retention: 70, engagement: 85, learningVelocity: 0.5, sessionCompletionRate: 90, reinforcementSuccessRate: 75 });
      const updated = await analyticsSnapshotRepository.upsert(child.id, { accuracy: 90, confidence: 85, retention: 80, engagement: 95, learningVelocity: 0.7, sessionCompletionRate: 95, reinforcementSuccessRate: 85 });
      expect(updated.accuracy).toBe(90);
    });

    it('should find by child', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await analyticsSnapshotRepository.upsert(child.id, { accuracy: 80, confidence: 75, retention: 70, engagement: 85, learningVelocity: 0.5, sessionCompletionRate: 90, reinforcementSuccessRate: 75 });
      const found = await analyticsSnapshotRepository.findByChild(child.id);
      expect(found).toBeDefined();
    });

    it('should return null for non-existent child', async () => {
      const found = await analyticsSnapshotRepository.findByChild('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('AnalyticsHistoryRepository', () => {
    it('should upsert daily metric', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const result = await analyticsHistoryRepository.upsertDailyMetric(child.id, AnalyticsMetricType.ACCURACY, 85);
      expect(result).toBeDefined();
      expect(result.value).toBe(85);
    });

    it('should update existing daily metric on upsert', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await analyticsHistoryRepository.upsertDailyMetric(child.id, AnalyticsMetricType.ACCURACY, 85);
      const updated = await analyticsHistoryRepository.upsertDailyMetric(child.id, AnalyticsMetricType.ACCURACY, 90);
      expect(updated.value).toBe(90);
    });

    it('should find by child', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await analyticsHistoryRepository.upsertDailyMetric(child.id, AnalyticsMetricType.ACCURACY, 85);
      const records = await analyticsHistoryRepository.findByChild(child.id);
      expect(records.length).toBeGreaterThanOrEqual(1);
    });

    it('should find by child and metric', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await analyticsHistoryRepository.upsertDailyMetric(child.id, AnalyticsMetricType.ACCURACY, 85);
      const records = await analyticsHistoryRepository.findByChildAndMetric(child.id, AnalyticsMetricType.ACCURACY);
      expect(records.length).toBeGreaterThanOrEqual(1);
    });

    it('should find aggregate in window', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await analyticsHistoryRepository.upsertDailyMetric(child.id, AnalyticsMetricType.ACCURACY, 85);
      const records = await analyticsHistoryRepository.findAggregateInWindow(child.id, AnalyticsMetricType.ACCURACY, new Date(Date.now() - 86400000), new Date(Date.now() + 86400000));
      expect(records.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('TrendEventRepository', () => {
    it('should create a trend event', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const event = await trendEventRepository.create({ childId: child.id, eventType: TrendEventType.CONFIDENCE_DECLINING });
      expect(event).toBeDefined();
      expect(event.childId).toBe(child.id);
    });

    it('should find by child', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await trendEventRepository.create({ childId: child.id, eventType: TrendEventType.CONFIDENCE_DECLINING });
      const events = await trendEventRepository.findByChild(child.id);
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it('should find by child and type', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await trendEventRepository.create({ childId: child.id, eventType: TrendEventType.CONFIDENCE_DECLINING });
      const events = await trendEventRepository.findByChildAndType(child.id, TrendEventType.CONFIDENCE_DECLINING);
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it('should find recent', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await trendEventRepository.create({ childId: child.id, eventType: TrendEventType.CONFIDENCE_DECLINING });
      const recent = await trendEventRepository.findRecent(child.id);
      expect(recent.length).toBeGreaterThanOrEqual(1);
    });

    it('should find last event of type', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await trendEventRepository.create({ childId: child.id, eventType: TrendEventType.CONFIDENCE_DECLINING });
      const last = await trendEventRepository.findLastEventOfType(child.id, TrendEventType.CONFIDENCE_DECLINING);
      expect(last).toBeDefined();
    });
  });

  describe('SubjectAnalyticsRepository', () => {
    it('should upsert subject analytics', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const result = await subjectAnalyticsRepository.upsert(child.id, subject.id, { accuracy: 80, confidence: 75, retention: 70, progress: 50, learningVelocity: 0.5 });
      expect(result).toBeDefined();
      expect(result.childId).toBe(child.id);
    });

    it('should update existing on upsert', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      await subjectAnalyticsRepository.upsert(child.id, subject.id, { accuracy: 80, confidence: 75, retention: 70, progress: 50, learningVelocity: 0.5 });
      const updated = await subjectAnalyticsRepository.upsert(child.id, subject.id, { accuracy: 90, confidence: 85, retention: 80, progress: 60, learningVelocity: 0.7 });
      expect(updated.accuracy).toBe(90);
    });

    it('should find by child', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      await subjectAnalyticsRepository.upsert(child.id, subject.id, { accuracy: 80, confidence: 75, retention: 70, progress: 50, learningVelocity: 0.5 });
      const records = await subjectAnalyticsRepository.findByChild(child.id);
      expect(records.length).toBeGreaterThanOrEqual(1);
    });

    it('should find by child and subject', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      await subjectAnalyticsRepository.upsert(child.id, subject.id, { accuracy: 80, confidence: 75, retention: 70, progress: 50, learningVelocity: 0.5 });
      const found = await subjectAnalyticsRepository.findByChildAndSubject(child.id, subject.id);
      expect(found).toBeDefined();
    });

    it('should return null for non-existent child and subject', async () => {
      const found = await subjectAnalyticsRepository.findByChildAndSubject('no-child', 'no-subject');
      expect(found).toBeNull();
    });
  });

  describe('StateRepository (learning-state)', () => {
    const repo = new StateRepository();

    it('should save a learning state', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();
      const state = LearningState.create({ childId: child.id, topicId: crypto.randomUUID(), mastery: 50, confidence: 60, stability: 0.8, forgettingRate: 0.1, reviewIntervalDays: 7, lastReviewedAt: null, lastPracticedAt: null, correctAttempts: 0, incorrectAttempts: 0, streak: 0, totalAttempts: 0, averageResponseTimeMs: 0, hintUsage: 0, retryCount: 0, currentDifficulty: 'EASY', currentModality: null });
      const saved = await repo.save(state);
      expect(saved).toBeDefined();
      expect(saved.childId).toBe(child.id);
    });

    it('should find by child id', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();
      const state = LearningState.create({ childId: child.id, topicId: crypto.randomUUID(), mastery: 50, confidence: 60, stability: 0.8, forgettingRate: 0.1, reviewIntervalDays: 7, lastReviewedAt: null, lastPracticedAt: null, correctAttempts: 0, incorrectAttempts: 0, streak: 0, totalAttempts: 0, averageResponseTimeMs: 0, hintUsage: 0, retryCount: 0, currentDifficulty: 'EASY', currentModality: null });
      await repo.save(state);
      const records = await repo.findByChildId(child.id);
      expect(records.length).toBeGreaterThanOrEqual(1);
    });

    it('should find by topic', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const topicId = crypto.randomUUID();
      const now = new Date();
      const state = LearningState.create({ childId: child.id, topicId, mastery: 50, confidence: 60, stability: 0.8, forgettingRate: 0.1, reviewIntervalDays: 7, lastReviewedAt: null, lastPracticedAt: null, correctAttempts: 0, incorrectAttempts: 0, streak: 0, totalAttempts: 0, averageResponseTimeMs: 0, hintUsage: 0, retryCount: 0, currentDifficulty: 'EASY', currentModality: null });
      await repo.save(state);
      const found = await repo.findByTopic(child.id, topicId);
      expect(found).toBeDefined();
    });

    it('should update a learning state', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();
      const state = LearningState.create({ childId: child.id, topicId: crypto.randomUUID(), mastery: 50, confidence: 60, stability: 0.8, forgettingRate: 0.1, reviewIntervalDays: 7, lastReviewedAt: null, lastPracticedAt: null, correctAttempts: 0, incorrectAttempts: 0, streak: 0, totalAttempts: 0, averageResponseTimeMs: 0, hintUsage: 0, retryCount: 0, currentDifficulty: 'EASY', currentModality: null });
      const saved = await repo.save(state);
      const updated = saved.withMastery(75);
      const result = await repo.update(updated);
      expect(result.mastery).toBe(75);
    });

    it('should return null for non-existent topic', async () => {
      const found = await repo.findByTopic('no-child', 'no-topic');
      expect(found).toBeNull();
    });
  });

  describe('Transaction rollback', () => {
    it('should rollback on error within a transaction', async () => {
      const data = createTestUserData();

      try {
        await prisma.$transaction(async (tx) => {
          await tx.user.create({ data });
          await tx.user.create({ data: { ...createTestUserData(), email: data.email } });
        });
      } catch {
      }

      const found = await prisma.user.findUnique({ where: { email: data.email } });
      expect(found).toBeNull();
    });

    it('should commit successfully when no error occurs', async () => {
      const data = createTestUserData();

      const user = await prisma.$transaction(async (tx) => {
        return tx.user.create({ data });
      });

      const found = await prisma.user.findUnique({ where: { id: user.id } });
      expect(found).toBeDefined();
      expect(found!.email).toBe(data.email);
    });
  });

  describe('Unique constraint violations', () => {
    it('should throw on duplicate email', async () => {
      const data = createTestUserData();
      await prisma.user.create({ data });
      await expect(prisma.user.create({ data })).rejects.toThrow();
    });

    it('should throw on duplicate subject name', async () => {
      const subject = await createTestSubject();
      await expect(prisma.subject.create({ data: { name: subject.name, description: 'dup', icon: 'dup', color: '#000' } })).rejects.toThrow();
    });

    it('should throw on duplicate refresh token', async () => {
      const user = await createTestUser();
      const expiresAt = new Date(Date.now() + 86400000);
      await prisma.refreshToken.create({ data: { userId: user.id, token: 'dup-token', expiresAt } });
      await expect(prisma.refreshToken.create({ data: { userId: user.id, token: 'dup-token', expiresAt } })).rejects.toThrow();
    });
  });

  describe('Null handling', () => {
    it('should handle null optional fields in user creation', async () => {
      const data = createTestUserData();
      const user = await prisma.user.create({
        data: {
          ...data,
          googleId: null,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      });
      expect(user.googleId).toBeNull();
      expect(user.resetPasswordToken).toBeNull();
      expect(user.resetPasswordExpires).toBeNull();
    });

    it('should handle null optional fields in child creation', async () => {
      const user = await createTestUser();
      const child = await prisma.child.create({
        data: {
          userId: user.id,
          name: 'Null Fields Child',
          age: 5,
          ageGroup: '3-5',
          avatar: 'avatar.png',
          mentorId: null,
          deletedAt: null,
        },
      });
      expect(child.mentorId).toBeNull();
    });

    it('should handle null optional fields in learning state', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const state = LearningState.create({ childId: child.id, topicId: crypto.randomUUID(), mastery: 50, confidence: 60, stability: 0.8, forgettingRate: 0.1, reviewIntervalDays: 7, lastReviewedAt: null, lastPracticedAt: null, correctAttempts: 0, incorrectAttempts: 0, streak: 0, totalAttempts: 0, averageResponseTimeMs: 0, hintUsage: 0, retryCount: 0, currentDifficulty: 'EASY', currentModality: null });
      const repo = new StateRepository();
      const saved = await repo.save(state);
      expect(saved.lastReviewedAt).toBeNull();
      expect(saved.currentModality).toBeNull();
    });
  });

  describe('Cascade behavior', () => {
    it('should cascade delete children when user is deleted', async () => {
      const user = await createTestUser();
      await createTestChild(user.id, { name: 'Cascade Child 1' });
      await createTestChild(user.id, { name: 'Cascade Child 2' });

      await prisma.user.delete({ where: { id: user.id } });

      const childrenAfter = await prisma.child.findMany({ where: { userId: user.id } });
      expect(childrenAfter).toHaveLength(0);
    });

    it('should cascade delete refresh tokens when user is deleted', async () => {
      const user = await createTestUser();
      const expiresAt = new Date(Date.now() + 86400000);
      await prisma.refreshToken.create({ data: { userId: user.id, token: 'cascade-token', expiresAt } });

      await prisma.user.delete({ where: { id: user.id } });

      const tokens = await prisma.refreshToken.findMany({ where: { userId: user.id } });
      expect(tokens).toHaveLength(0);
    });

    it('should cascade delete lesson progress when child is deleted', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const category = await createTestCategory();
      const module = await createTestModule(category.id);
      const lesson = await createTestLesson(module.id);
      await prisma.lessonProgress.create({ data: { childId: child.id, lessonId: lesson.id, status: 'IN_PROGRESS' } });

      await prisma.child.delete({ where: { id: child.id } });

      const progress = await prisma.lessonProgress.findMany({ where: { childId: child.id } });
      expect(progress).toHaveLength(0);
    });
  });
});
