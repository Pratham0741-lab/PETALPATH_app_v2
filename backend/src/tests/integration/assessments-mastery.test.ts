import '../helpers/setup.js';
import app from '../../app.js';
import supertest from 'supertest';
import { prisma } from '../../config/database.js';
import { cleanDatabase } from '../helpers/factories.js';
import { createAuthenticatedContext } from '../helpers/auth.js';
import { curriculumService } from '../../modules/curriculum/index.js';

const request = supertest(app);

async function seedLessonsForTests() {
  const category = await prisma.category.create({
    data: { title: 'Pre-Nursery Grade', displayOrder: 1 },
  });

  const module = await prisma.module.create({
    data: { categoryId: category.id, title: 'Getting Started', displayOrder: 1 },
  });

  await prisma.lesson.createMany({
    data: [
      {
        id: 'pn_free_play_and_settlingin',
        moduleId: module.id,
        title: 'Free Play',
        displayOrder: 1,
        difficulty: 'EASY',
      },
      {
        id: 'pn_fingertap_practice',
        moduleId: module.id,
        title: 'Tap Bubbles',
        displayOrder: 2,
        difficulty: 'EASY',
      },
    ],
  });
}

describe('Phase 5 — Assessments & Mastery Evaluation Integration Tests', () => {
  let context: any;
  let token: string;

  beforeEach(async () => {
    await cleanDatabase();
    await seedLessonsForTests();

    context = await createAuthenticatedContext({
      childName: 'Assessment Tester',
      childAge: 2,
    });
    token = `Bearer ${context.accessToken}`;

    await prisma.child.update({
      where: { id: context.child.id },
      data: { ageGroup: 'prenursery' },
    });
  });

  describe('GET /api/assessments/lesson/:lessonId', () => {
    it('should retrieve lesson assessment from curriculum JSON', async () => {
      const res = await request
        .get('/api/assessments/lesson/pn_free_play_and_settlingin')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('pn_free_play_and_settlingin');
      expect(res.body.data.title).toBe('Settling In Assessment');
      expect(res.body.data.questions.length).toBe(2);
      expect(res.body.data.questions[0].prompt).toBe('Identify the smiling face');
    });

    it('should reject retrieval if lesson is locked', async () => {
      const res = await request
        .get('/api/assessments/lesson/pn_fingertap_practice')
        .set('Authorization', token);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('locked');
    });
  });

  describe('POST /api/assessments/:childId/attempts', () => {
    it('should start an attempt for an unlocked lesson assessment', async () => {
      const res = await request
        .post(`/api/assessments/${context.child.id}/attempts`)
        .set('Authorization', token)
        .send({ assessmentId: 'pn_free_play_and_settlingin' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('IN_PROGRESS');
      expect(res.body.data.assessmentId).toBe('pn_free_play_and_settlingin');
    });

    it('should reject starting attempt if the lesson is locked', async () => {
      const res = await request
        .post(`/api/assessments/${context.child.id}/attempts`)
        .set('Authorization', token)
        .send({ assessmentId: 'pn_fingertap_practice' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('locked');
    });
  });

  describe('POST /api/assessments/:childId/attempts/:attemptId/submit', () => {
    it('should submit attempt, update KnowledgeState mastery, and complete lesson on success', async () => {
      // 1. Start the attempt
      const startRes = await request
        .post(`/api/assessments/${context.child.id}/attempts`)
        .set('Authorization', token)
        .send({ assessmentId: 'pn_free_play_and_settlingin' });
      const attemptId = startRes.body.data.id;

      // Complete the lesson's standard activities first so it becomes eligible for completion
      await request
        .post('/api/progress/activity/complete')
        .set('Authorization', token)
        .send({ lessonId: 'pn_free_play_and_settlingin', activityType: 'video', stars: 3 });

      await request
        .post('/api/progress/activity/complete')
        .set('Authorization', token)
        .send({ lessonId: 'pn_free_play_and_settlingin', activityType: 'listen', stars: 3 });

      await request
        .post('/api/progress/activity/complete')
        .set('Authorization', token)
        .send({ lessonId: 'pn_free_play_and_settlingin', activityType: 'speak', stars: 3 });

      // 2. Submit responses (correct answer to MULTIPLE_CHOICE, 5 to SCALE)
      const submitRes = await request
        .post(`/api/assessments/${context.child.id}/attempts/${attemptId}/submit`)
        .set('Authorization', token)
        .send({
          responses: [
            { questionId: 'pn_mc_1', answer: 'smile' }, // Correct (maxScore: 2)
            { questionId: 'pn_scale_1', answer: '5' },  // Value 5 (maxScore: 5)
          ],
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.success).toBe(true);
      expect(submitRes.body.data.status).toBe('COMPLETED');
      expect(submitRes.body.data.percentage).toBe(100);

      // 3. Verify KnowledgeState mastery updated to 100 and status state to MASTERED
      const ks = await prisma.knowledgeState.findFirst({
        where: { childId: context.child.id, topicId: 'pn_free_play_and_settlingin' },
      });
      expect(ks).not.toBeNull();
      expect(ks?.mastery).toBe(100);
      expect(ks?.state).toBe('MASTERED');

      // 4. Verify LessonProgress is now COMPLETED
      const progress = await prisma.lessonProgress.findFirst({
        where: { childId: context.child.id, lessonId: 'pn_free_play_and_settlingin' },
      });
      expect(progress?.status).toBe('COMPLETED');
    });

    it('should submit attempt and update KnowledgeState but remain LEARNING and IN_PROGRESS on failure', async () => {
      const startRes = await request
        .post(`/api/assessments/${context.child.id}/attempts`)
        .set('Authorization', token)
        .send({ assessmentId: 'pn_free_play_and_settlingin' });
      const attemptId = startRes.body.data.id;

      // Submit incorrect responses (score 0%)
      const submitRes = await request
        .post(`/api/assessments/${context.child.id}/attempts/${attemptId}/submit`)
        .set('Authorization', token)
        .send({
          responses: [
            { questionId: 'pn_mc_1', answer: 'frown' }, // Incorrect (0/2)
            { questionId: 'pn_scale_1', answer: '0' },  // Value 0 (0/5)
          ],
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.data.percentage).toBe(0);

      const ks = await prisma.knowledgeState.findFirst({
        where: { childId: context.child.id, topicId: 'pn_free_play_and_settlingin' },
      });
      expect(ks?.mastery).toBe(0);
      expect(ks?.state).toBe('LEARNING');

      const progress = await prisma.lessonProgress.findFirst({
        where: { childId: context.child.id, lessonId: 'pn_free_play_and_settlingin' },
      });
      expect(progress?.status).not.toBe('COMPLETED');
    });

    it('should reject submissions for already completed attempts', async () => {
      const startRes = await request
        .post(`/api/assessments/${context.child.id}/attempts`)
        .set('Authorization', token)
        .send({ assessmentId: 'pn_free_play_and_settlingin' });
      const attemptId = startRes.body.data.id;

      await request
        .post(`/api/assessments/${context.child.id}/attempts/${attemptId}/submit`)
        .set('Authorization', token)
        .send({
          responses: [
            { questionId: 'pn_mc_1', answer: 'smile' },
            { questionId: 'pn_scale_1', answer: '5' },
          ],
        });

      // Submit again
      const res = await request
        .post(`/api/assessments/${context.child.id}/attempts/${attemptId}/submit`)
        .set('Authorization', token)
        .send({
          responses: [
            { questionId: 'pn_mc_1', answer: 'smile' },
            { questionId: 'pn_scale_1', answer: '5' },
          ],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already completed');
    });
  });
});
