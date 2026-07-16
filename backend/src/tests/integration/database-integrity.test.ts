import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { cleanDatabase, createTestUser, createTestChild, createTestUserData, createTestChildData, createTestSubject, createTestSkill, createTestCategory, createTestModule, createTestLesson, createTestMentor, createTestSticker, createTestBadge } from '../helpers/factories.js';
import '../helpers/setup.js';

describe('Database Integrity', () => {

  // =========================================================================
  // 1. Foreign Key Constraints
  // =========================================================================
  describe('Foreign Key Constraints', () => {

    it('should reject Child creation with non-existent userId (FK violation)', async () => {
      await expect(
        prisma.child.create({ data: createTestChildData('non-existent-user-id') })
      ).rejects.toThrow();
    });

    it('should reject Skill creation with non-existent subjectId (FK violation)', async () => {
      await expect(
        prisma.skill.create({
          data: { subjectId: 'non-existent-subject', name: 'FK Violation Skill ' + Date.now(), skillCode: 'FK_VIOLATION_' + Date.now() },
        })
      ).rejects.toThrow();
    });

    it('should reject LessonProgress creation with non-existent childId (FK violation)', async () => {
      const category = await createTestCategory();
      const module = await createTestModule(category.id);
      const lesson = await createTestLesson(module.id);
      await expect(
        prisma.lessonProgress.create({
          data: { childId: 'non-existent-child', lessonId: lesson.id, status: 'NOT_STARTED' },
        })
      ).rejects.toThrow();
    });

    it('should reject ModuleProgress creation with non-existent moduleId (FK violation)', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await expect(
        prisma.moduleProgress.create({
          data: { childId: child.id, moduleId: 'non-existent-module' },
        })
      ).rejects.toThrow();
    });

    it('should reject VideoProgress creation with non-existent videoId (FK violation)', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      await expect(
        prisma.videoProgress.create({
          data: { childId: child.id, videoId: 'non-existent-video' },
        })
      ).rejects.toThrow();
    });

    it('should throw PrismaClientKnownRequestError with code P2003 for FK violations', async () => {
      try {
        await prisma.child.create({ data: createTestChildData('no-such-user') });
        fail('Expected FK violation error');
      } catch (err) {
        expect(err).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect((err as Prisma.PrismaClientKnownRequestError).code).toBe('P2003');
      }
    });
  });

  // =========================================================================
  // 2. Cascade Delete - User -> Children + RefreshTokens
  // =========================================================================
  describe('Cascade Delete - User -> Children & RefreshTokens', () => {

    it('should cascade delete children when user is deleted', async () => {
      const user = await createTestUser();
      const child1 = await createTestChild(user.id, { name: 'Cascade Child A' });
      const child2 = await createTestChild(user.id, { name: 'Cascade Child B' });

      await prisma.user.delete({ where: { id: user.id } });

      const remaining = await prisma.child.findMany({ where: { userId: user.id } });
      expect(remaining).toHaveLength(0);
      const c1 = await prisma.child.findUnique({ where: { id: child1.id } });
      expect(c1).toBeNull();
      const c2 = await prisma.child.findUnique({ where: { id: child2.id } });
      expect(c2).toBeNull();
    });

    it('should cascade delete refresh tokens when user is deleted', async () => {
      const user = await createTestUser();
      const expiresAt = new Date(Date.now() + 86400000);
      await prisma.refreshToken.create({ data: { userId: user.id, token: 'cascade-rt-1', expiresAt } });
      await prisma.refreshToken.create({ data: { userId: user.id, token: 'cascade-rt-2', expiresAt } });

      await prisma.user.delete({ where: { id: user.id } });

      const tokens = await prisma.refreshToken.findMany({ where: { userId: user.id } });
      expect(tokens).toHaveLength(0);
    });
  });

  // =========================================================================
  // 3. Cascade Delete - Child -> All Progress Records
  // =========================================================================
  describe('Cascade Delete - Child -> Progress Records', () => {

    it('should cascade delete LessonProgress, ModuleProgress, CategoryProgress when child is deleted', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const category = await createTestCategory();
      const module = await createTestModule(category.id);
      const lesson = await createTestLesson(module.id);

      await prisma.lessonProgress.create({ data: { childId: child.id, lessonId: lesson.id, status: 'IN_PROGRESS' } });
      await prisma.moduleProgress.create({ data: { childId: child.id, moduleId: module.id } });
      await prisma.categoryProgress.create({ data: { childId: child.id, categoryId: category.id } });

      await prisma.child.delete({ where: { id: child.id } });

      const lp = await prisma.lessonProgress.findMany({ where: { childId: child.id } });
      expect(lp).toHaveLength(0);
      const mp = await prisma.moduleProgress.findMany({ where: { childId: child.id } });
      expect(mp).toHaveLength(0);
      const cp = await prisma.categoryProgress.findMany({ where: { childId: child.id } });
      expect(cp).toHaveLength(0);
    });

    it('should cascade delete ChildSticker and ChildBadge when child is deleted', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const sticker = await createTestSticker();
      const badge = await createTestBadge();

      await prisma.childSticker.create({ data: { childId: child.id, stickerId: sticker.id } });
      await prisma.childBadge.create({ data: { childId: child.id, badgeId: badge.id } });

      await prisma.child.delete({ where: { id: child.id } });

      const stickers = await prisma.childSticker.findMany({ where: { childId: child.id } });
      expect(stickers).toHaveLength(0);
      const badges = await prisma.childBadge.findMany({ where: { childId: child.id } });
      expect(badges).toHaveLength(0);
    });
  });

  // =========================================================================
  // 4. Cascade Delete - Category -> Module -> Lesson -> Activity -> Video
  // =========================================================================
  describe('Cascade Delete - Category -> Module -> Lesson -> Activity -> Video', () => {

    it('should cascade delete full chain when category is deleted', async () => {
      const category = await createTestCategory();
      const module = await createTestModule(category.id);
      const lesson = await createTestLesson(module.id);
      const activity = await prisma.activity.create({
        data: {
          lessonId: lesson.id,
          title: 'Cascade Activity',
          activityType: 'VIDEO',
          displayOrder: 1,
        },
      });
      const video = await prisma.video.create({
        data: {
          activityId: activity.id,
          title: 'Cascade Video',
          videoKey: 'cascade-video.mp4',
          duration: 60,
        },
      });

      await prisma.category.delete({ where: { id: category.id } });

      expect(await prisma.module.findUnique({ where: { id: module.id } })).toBeNull();
      expect(await prisma.lesson.findUnique({ where: { id: lesson.id } })).toBeNull();
      expect(await prisma.activity.findUnique({ where: { id: activity.id } })).toBeNull();
      expect(await prisma.video.findUnique({ where: { id: video.id } })).toBeNull();
    });
  });

  // =========================================================================
  // 5. Unique Constraints
  // =========================================================================
  describe('Unique Constraints', () => {

    it('should reject duplicate email', async () => {
      const data = createTestUserData();
      await prisma.user.create({ data });
      await expect(prisma.user.create({ data })).rejects.toThrow();
    });

    it('should reject duplicate subject name', async () => {
      const subject = await createTestSubject();
      await expect(
        prisma.subject.create({ data: { name: subject.name, description: 'dup', icon: 'dup', color: '#000' } })
      ).rejects.toThrow();
    });

    it('should reject duplicate skill name', async () => {
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      await expect(
        prisma.skill.create({ data: { subjectId: subject.id, name: skill.name, skillCode: 'DUP_NAME_' + Date.now() } })
      ).rejects.toThrow();
    });

    it('should reject duplicate category title', async () => {
      const cat = await createTestCategory();
      await expect(
        prisma.category.create({ data: { title: cat.title } })
      ).rejects.toThrow();
    });

    it('should reject duplicate childId + skillId on ChildSkillCurriculum', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);

      await prisma.childSkillCurriculum.create({
        data: { childId: child.id, skillId: skill.id, state: 'AVAILABLE', unlockRatio: 0, priority: 1 },
      });
      await expect(
        prisma.childSkillCurriculum.create({
          data: { childId: child.id, skillId: skill.id, state: 'ACTIVE', unlockRatio: 0, priority: 2 },
        })
      ).rejects.toThrow();
    });

    it('should reject duplicate childId + skillId on SkillHealth', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      const now = new Date();

      await prisma.skillHealth.create({
        data: {
          childId: child.id, skillId: skill.id, masteryState: 'LEARNING',
          knowledgeScore: 50, confidenceScore: 50, retentionScore: 75,
          engagementScore: 70, consistencyScore: 60, masteryScore: 55,
          lastPracticed: now, nextReviewDate: new Date(now.getTime() + 86400000),
          reviewCount: 0, attemptCount: 1, retryCount: 0,
          decayFactor: 0.995, frequencyDays: 2,
        },
      });
      await expect(
        prisma.skillHealth.create({
          data: {
            childId: child.id, skillId: skill.id, masteryState: 'LEARNING',
            knowledgeScore: 60, confidenceScore: 60, retentionScore: 80,
            engagementScore: 75, consistencyScore: 65, masteryScore: 60,
            lastPracticed: now, nextReviewDate: new Date(now.getTime() + 86400000),
            reviewCount: 0, attemptCount: 1, retryCount: 0,
            decayFactor: 0.995, frequencyDays: 2,
          },
        })
      ).rejects.toThrow();
    });

    it('should reject duplicate eventId on LearningEvent', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const eventId = crypto.randomUUID();

      await prisma.learningEvent.create({
        data: {
          eventId, childId: child.id, eventType: 'ACTIVITY_COMPLETED',
          sessionId: crypto.randomUUID(), idempotencyKey: `ik-${eventId}`,
        },
      });
      await expect(
        prisma.learningEvent.create({
          data: {
            eventId, childId: child.id, eventType: 'ACTIVITY_COMPLETED',
            sessionId: crypto.randomUUID(), idempotencyKey: `ik-${eventId}-dup`,
          },
        })
      ).rejects.toThrow();
    });

    it('should throw PrismaClientKnownRequestError with code P2002 for unique violations', async () => {
      const data = createTestUserData();
      await prisma.user.create({ data });
      try {
        await prisma.user.create({ data });
        fail('Expected unique constraint error');
      } catch (err) {
        expect(err).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect((err as Prisma.PrismaClientKnownRequestError).code).toBe('P2002');
      }
    });
  });

  // =========================================================================
  // 6. Transactions
  // =========================================================================
  describe('Transactions', () => {

    it('should atomically create user and child in a transaction', async () => {
      const userData = createTestUserData();

      const { user, child } = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({ data: userData });
        const c = await tx.child.create({ data: createTestChildData(u.id) });
        return { user: u, child: c };
      });

      const foundUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(foundUser).toBeDefined();
      const foundChild = await prisma.child.findUnique({ where: { id: child.id } });
      expect(foundChild).toBeDefined();
      expect(foundChild!.userId).toBe(user.id);
    });

    it('should rollback entire transaction when an error occurs', async () => {
      const userData = createTestUserData();
      const childData = createTestChildData('no-such-user');

      try {
        await prisma.$transaction(async (tx) => {
          await tx.user.create({ data: userData });
          await tx.child.create({ data: childData });
        });
      } catch {
        // expected
      }

      const user = await prisma.user.findUnique({ where: { email: userData.email } });
      expect(user).toBeNull();
    });

    it('should rollback when an explicit error is thrown inside transaction', async () => {
      const userData = createTestUserData();

      try {
        await prisma.$transaction(async (tx) => {
          await tx.user.create({ data: userData });
          throw new Error('force-rollback');
        });
      } catch {
        // expected
      }

      const user = await prisma.user.findUnique({ where: { email: userData.email } });
      expect(user).toBeNull();
    });
  });

  // =========================================================================
  // 7. Cascade Delete - Skill -> SkillHealth / SkillHistory / RegressionLog
  // =========================================================================
  describe('Cascade Delete - Skill -> Dependents', () => {

    it('should cascade delete SkillHealth, SkillHistory, RegressionLog when skill is deleted', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      const now = new Date();

      await prisma.skillHealth.create({
        data: {
          childId: child.id, skillId: skill.id, masteryState: 'LEARNING',
          knowledgeScore: 50, confidenceScore: 50, retentionScore: 75,
          engagementScore: 70, consistencyScore: 60, masteryScore: 55,
          lastPracticed: now, nextReviewDate: new Date(now.getTime() + 86400000),
          reviewCount: 0, attemptCount: 1, retryCount: 0,
          decayFactor: 0.995, frequencyDays: 2,
        },
      });
      await prisma.skillHistory.create({
        data: {
          childId: child.id, skillId: skill.id,
          knowledgeScore: 50, confidenceScore: 50, retentionScore: 75,
          engagementScore: 70, consistencyScore: 60, masteryScore: 55,
          masteryState: 'LEARNING',
        },
      });
      await prisma.regressionLog.create({
        data: {
          childId: child.id, skillId: skill.id,
          previousScore: 80, currentScore: 60, difference: -20,
          previousState: 'LEARNING', currentState: 'WEAK',
        },
      });
      await prisma.reinforcementQueue.create({
        data: {
          childId: child.id, skillId: skill.id,
          priority: 1, reason: 'test', masteryState: 'LEARNING',
          nextReviewDate: new Date(now.getTime() + 86400000),
        },
      });

      await prisma.skill.delete({ where: { id: skill.id } });

      expect(await prisma.skillHealth.findFirst({ where: { skillId: skill.id } })).toBeNull();
      expect(await prisma.skillHistory.findFirst({ where: { skillId: skill.id } })).toBeNull();
      expect(await prisma.regressionLog.findFirst({ where: { skillId: skill.id } })).toBeNull();
      expect(await prisma.reinforcementQueue.findFirst({ where: { skillId: skill.id } })).toBeNull();
    });
  });

  // =========================================================================
  // 8. Unique Constraint Partial Indexes (composite @@unique)
  // =========================================================================
  describe('Composite Unique Constraints (@@unique)', () => {

    it('should enforce @@unique([childId, lessonId]) on LessonProgress', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const category = await createTestCategory();
      const module = await createTestModule(category.id);
      const lesson = await createTestLesson(module.id);

      await prisma.lessonProgress.create({
        data: { childId: child.id, lessonId: lesson.id, status: 'NOT_STARTED' },
      });
      await expect(
        prisma.lessonProgress.create({
          data: { childId: child.id, lessonId: lesson.id, status: 'IN_PROGRESS' },
        })
      ).rejects.toThrow();
    });

    it('should enforce @@unique([childId, stickerId]) on ChildSticker', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const sticker = await createTestSticker();

      await prisma.childSticker.create({ data: { childId: child.id, stickerId: sticker.id } });
      await expect(
        prisma.childSticker.create({ data: { childId: child.id, stickerId: sticker.id } })
      ).rejects.toThrow();
    });

    it('should enforce @@unique([childId, skillId]) on ReinforcementQueue', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);

      await prisma.reinforcementQueue.create({
        data: {
          childId: child.id, skillId: skill.id, priority: 1, reason: 'test',
          masteryState: 'LEARNING', nextReviewDate: new Date(Date.now() + 86400000),
        },
      });
      await expect(
        prisma.reinforcementQueue.create({
          data: {
            childId: child.id, skillId: skill.id, priority: 2, reason: 'test2',
            masteryState: 'WEAK', nextReviewDate: new Date(Date.now() + 86400000),
          },
        })
      ).rejects.toThrow();
    });

    it('should enforce @@unique([childId, moduleId]) on ModuleProgress', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const category = await createTestCategory();
      const module = await createTestModule(category.id);

      await prisma.moduleProgress.create({ data: { childId: child.id, moduleId: module.id } });
      await expect(
        prisma.moduleProgress.create({ data: { childId: child.id, moduleId: module.id } })
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // 9. onDelete: SetNull behavior
  // =========================================================================
  describe('onDelete: SetNull', () => {

    it('should set child.mentorId to null when mentor is deleted', async () => {
      const user = await createTestUser();
      const mentor = await createTestMentor();
      const child = await prisma.child.create({
        data: { ...createTestChildData(user.id), mentorId: mentor.id },
      });

      expect(child.mentorId).toBe(mentor.id);

      await prisma.mentor.delete({ where: { id: mentor.id } });

      const updated = await prisma.child.findUnique({ where: { id: child.id } });
      expect(updated).toBeDefined();
      expect(updated!.mentorId).toBeNull();
    });
  });

  // =========================================================================
  // 10. Soft Delete doesn't cascade
  // =========================================================================
  describe('Soft Delete does not cascade', () => {

    it('should keep children intact when user is soft-deleted (deletedAt set)', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);

      await prisma.user.update({ where: { id: user.id }, data: { deletedAt: new Date() } });

      const children = await prisma.child.findMany({ where: { userId: user.id } });
      expect(children).toHaveLength(1);
      expect(children[0].id).toBe(child.id);
    });

    it('should keep lesson progress intact when lesson is soft-deleted', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const category = await createTestCategory();
      const module = await createTestModule(category.id);
      const lesson = await createTestLesson(module.id);
      await prisma.lessonProgress.create({
        data: { childId: child.id, lessonId: lesson.id, status: 'COMPLETED' },
      });

      await prisma.lesson.update({ where: { id: lesson.id }, data: { deletedAt: new Date() } });

      const progress = await prisma.lessonProgress.findMany({ where: { lessonId: lesson.id } });
      expect(progress).toHaveLength(1);
    });

    it('should keep children accessible via direct lookup after user soft-delete', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);

      await prisma.user.update({ where: { id: user.id }, data: { deletedAt: new Date() } });

      const found = await prisma.child.findUnique({ where: { id: child.id } });
      expect(found).toBeDefined();
      expect(found!.deletedAt).toBeNull();
    });
  });
});
