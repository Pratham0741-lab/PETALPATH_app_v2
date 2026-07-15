import { prisma } from '../../config/database.js';
import { ActivityType, MasteryState } from '@prisma/client';

export function createTestUserData(overrides: Partial<{
  email: string;
  name: string;
  passwordHash: string;
  provider: string;
  role: string;
}> = {}) {
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return {
    email: `test-${suffix}@example.com`,
    name: 'Test User',
    passwordHash: '$2b$10$dummyhashforintegrationtestingpurpose',
    provider: 'email',
    role: 'PARENT',
    ...overrides,
  };
}

export function createTestChildData(userId: string, overrides: Partial<{
  name: string;
  age: number;
  ageGroup: string;
  avatar: string;
}> = {}) {
  return {
    userId,
    name: 'Test Child',
    age: 5,
    ageGroup: '3-5',
    avatar: 'default-avatar.png',
    ...overrides,
  };
}

export function createTestLessonData(moduleId: string, overrides: Partial<{
  title: string;
  displayOrder: number;
  difficulty: string;
}> = {}) {
  return {
    moduleId,
    title: 'Test Lesson',
    displayOrder: 1,
    difficulty: 'EASY',
    ...overrides,
  };
}

export function createTestModuleData(categoryId: string, overrides: Partial<{
  title: string;
  displayOrder: number;
}> = {}) {
  return {
    categoryId,
    title: 'Test Module',
    description: 'Test module description',
    displayOrder: 1,
    ...overrides,
  };
}

export function createTestCategoryData(overrides: Partial<{
  title: string;
  displayOrder: number;
}> = {}) {
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return {
    title: `Test Category ${suffix}`,
    description: 'Test category description',
    displayOrder: 1,
    ...overrides,
  };
}

export function createTestSubjectData(overrides: Partial<{
  name: string;
  description: string;
  icon: string;
  color: string;
}> = {}) {
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return {
    name: `Test Subject ${suffix}`,
    description: 'Test subject description',
    icon: 'book',
    color: '#FF5733',
    ...overrides,
  };
}

export function createTestSkillData(subjectId: string, overrides: Partial<{
  name: string;
  difficulty: number;
  isRootSkill: boolean;
}> = {}) {
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return {
    subjectId,
    name: `Test Skill ${suffix}`,
    description: 'Test skill description',
    difficulty: 1,
    isRootSkill: true,
    ...overrides,
  };
}

export function createTestLearningEventData(childId: string, overrides: Partial<{
  eventId: string;
  eventType: string;
  eventVersion: number;
  sessionId: string;
  idempotencyKey: string;
  timestamp: Date;
}> = {}) {
  const id = overrides.eventId || crypto.randomUUID();
  return {
    eventId: id,
    eventType: 'ACTIVITY_COMPLETED' as const,
    eventVersion: 1,
    childId,
    sessionId: crypto.randomUUID(),
    idempotencyKey: `ik-${id}`,
    timestamp: new Date(),
    ...overrides,
  };
}

export async function createTestUser(overrides: Partial<{
  email: string;
  name: string;
  provider: string;
  role: string;
}> = {}) {
  const data = createTestUserData(overrides);
  return prisma.user.create({ data });
}

export async function createTestChild(userId: string, overrides: Partial<{
  name: string;
  age: number;
  ageGroup: string;
  avatar: string;
}> = {}) {
  const data = createTestChildData(userId, overrides);
  return prisma.child.create({ data });
}

export async function createTestCategory(overrides: Partial<{
  title: string;
  displayOrder: number;
}> = {}) {
  const data = createTestCategoryData(overrides);
  return prisma.category.create({ data });
}

export async function createTestModule(categoryId: string, overrides: Partial<{
  title: string;
  displayOrder: number;
}> = {}) {
  const data = createTestModuleData(categoryId, overrides);
  return prisma.module.create({ data });
}

export async function createTestLesson(moduleId: string, overrides: Partial<{
  title: string;
  displayOrder: number;
  difficulty: string;
}> = {}) {
  const data = createTestLessonData(moduleId, overrides);
  return prisma.lesson.create({ data });
}

export async function createTestSubject(overrides: Partial<{
  name: string;
  description: string;
  icon: string;
  color: string;
}> = {}) {
  const data = createTestSubjectData(overrides);
  return prisma.subject.create({ data });
}

export async function createTestSkill(subjectId: string, overrides: Partial<{
  name: string;
  difficulty: number;
  isRootSkill: boolean;
}> = {}) {
  const data = createTestSkillData(subjectId, overrides);
  return prisma.skill.create({ data });
}

export async function createTestMentor(overrides: Partial<{
  name: string;
  characterType: string;
  personality: string;
  voiceStyle: string;
  description: string;
  iconKey: string;
}> = {}) {
  return prisma.mentor.create({
    data: {
      name: 'Test Mentor',
      characterType: 'WISE_OWL',
      personality: 'encouraging',
      voiceStyle: 'gentle',
      description: 'A wise owl mentor',
      iconKey: 'mentor-owl.png',
      ...overrides,
    },
  });
}

export async function createTestSticker(overrides: Partial<{
  name: string;
  description: string;
  iconKey: string;
  requiredStars: number;
}> = {}) {
  return prisma.sticker.create({
    data: {
      name: 'Test Sticker',
      description: 'A test sticker',
      iconKey: 'sticker-test.png',
      requiredStars: 10,
      ...overrides,
    },
  });
}

export async function createTestBadge(overrides: Partial<{
  name: string;
  description: string;
  iconKey: string;
}> = {}) {
  return prisma.badge.create({
    data: {
      name: 'Test Badge',
      description: 'A test badge',
      iconKey: 'badge-test.png',
      ...overrides,
    },
  });
}

export async function createTestLearningProfile(childId: string, overrides: Partial<{
  averageAccuracy: number;
  averageEngagement: number;
  averageConfidence: number;
  optimalSessionDuration: number;
  learningVelocity: number;
}> = {}) {
  return prisma.learningProfile.create({
    data: {
      childId,
      averageAccuracy: 80,
      averageEngagement: 75,
      averageConfidence: 70,
      optimalSessionDuration: 15,
      preferredModality: ActivityType.VIDEO,
      learningVelocity: 0.5,
      ...overrides as any,
    },
  });
}

export async function createTestSkillHealth(childId: string, skillId: string, overrides: Partial<{
  masteryState: MasteryState;
  knowledgeScore: number;
  confidenceScore: number;
  retentionScore: number;
  engagementScore: number;
  consistencyScore: number;
  masteryScore: number;
}> = {}) {
  const now = new Date();
  return prisma.skillHealth.create({
    data: {
      childId,
      skillId,
      masteryState: MasteryState.LEARNING,
      knowledgeScore: 50,
      confidenceScore: 50,
      retentionScore: 75,
      engagementScore: 70,
      consistencyScore: 60,
      masteryScore: 55,
      lastPracticed: now,
      nextReviewDate: new Date(now.getTime() + 86400000),
      reviewCount: 0,
      attemptCount: 1,
      retryCount: 0,
      decayFactor: 0.995,
      frequencyDays: 2,
      ...overrides,
    },
  });
}

export async function cleanDatabase() {
  const tables: string[] = [
    'session_events', 'session_blocks', 'session_plans', 'session_templates',
    'practices', 'learning_debts', 'recovery_modes', 'dynamic_roadmaps',
    'topic_reinforcement_queues', 'topic_states', 'knowledge_states', 'metric_snapshots',
    'learner_state', 'analytics_histories', 'analytics_snapshots', 'trend_events',
    'subject_analytics', 'reinforcement_queue', 'reinforcement_history', 'reinforcement_events',
    'skill_health', 'skill_history', 'regression_logs', 'child_skill_curriculum',
    'learning_profiles', 'modality_performances', 'adaptation_events',
    'learning_evidence', 'learning_events',
    'child_badges', 'child_stickers', 'badges', 'stickers',
    'module_progress', 'category_progress',
    'speak_progress', 'write_progress', 'listen_progress',
    'activities', 'lessons', 'modules', 'categories',
    'children', 'users', 'mentors', 'stars', 'subjects', 'skills', 'skill_dependencies',
    'assessment_attempts', 'assessment_questions', 'assessments',
    'notifications',
    'video_progress', 'videos', 'audios',
    'refresh_tokens',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}" CASCADE`);
    } catch {
    }
  }
}

export function createTestLearningEventRecord(eventId: string, childId: string, overrides: Partial<{
  eventType: string;
  sessionId: string;
  idempotencyKey: string;
  eventVersion: number;
  timestamp: Date;
  modality: string;
  payload: Record<string, unknown>;
}> = {}) {
  return {
    eventId,
    eventType: 'ACTIVITY_COMPLETED',
    eventVersion: 1,
    childId,
    sessionId: crypto.randomUUID(),
    idempotencyKey: `ik-${eventId}`,
    timestamp: new Date(),
    ...overrides,
  };
}
