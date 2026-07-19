import '../helpers/setup.js';
import app from '../../app.js';
import supertest from 'supertest';
import { prisma } from '../../config/database.js';
import { curriculumService, curriculumEngineService } from '../../modules/curriculum/index.js';
import { curriculumLoader } from '../../modules/curriculum/curriculum-loader.js';
import { cleanDatabase } from '../helpers/factories.js';
import { createAuthenticatedContext } from '../helpers/auth.js';
import { jest } from '@jest/globals';

const request = supertest(app);

function getActivityTitle(lessonTitle: string, type: string): string {
  const typeMap: Record<string, string> = {
    video: 'Video Lesson',
    listen: 'Listening Guide',
    speak: 'Speaking Practice',
    read: 'Reading Practice',
    write: 'Writing Practice',
    revision: 'Revision & Review',
    phonics: 'Phonics Activity',
    blend: 'Word Blending',
    spell: 'Spelling Challenge',
    identify: 'Identify Activity',
    select: 'Selection Game',
    match: 'Matching Game',
    count: 'Counting Exercise',
    sort: 'Sorting Game',
    puzzle: 'Puzzle Challenge',
    sequence: 'Ordering Sequence',
    trace: 'Tracing Activity',
    draw: 'Drawing Canvas',
    drag_drop: 'Drag and Drop',
    memory: 'Memory Game',
    story: 'Story Time',
    conversation: 'Conversation Practice',
    addition: 'Addition Practice',
    subtraction: 'Subtraction Practice',
    compare: 'Comparison Game',
    pattern: 'Pattern Play',
    measure: 'Measurement Fun',
    missing_number: 'Find the Missing Number',
    classify: 'Classification Game',
    connect: 'Connect the Dots',
    circle: 'Circle the Answer',
    assessment: 'Lesson Assessment',
  };

  const suffix = typeMap[type] || `${type.charAt(0).toUpperCase()}${type.slice(1)} Practice`;
  return `${lessonTitle}: ${suffix}`;
}

async function seedCurriculumForTests() {
  const allCurricula = curriculumLoader.loadAllCurricula();
  for (const [gradeKey, cur] of allCurricula.entries()) {
    const category = await prisma.category.create({
      data: {
        title: cur.grade.name,
        description: cur.grade.description,
        displayOrder: gradeKey === 'prenursery' ? 1 : gradeKey === 'nursery' ? 2 : gradeKey === 'lkg' ? 3 : 4,
      },
    });

    for (const theme of cur.themes) {
      const module = await prisma.module.create({
        data: {
          categoryId: category.id,
          title: theme.title,
          description: `Theme: ${theme.title}`,
          displayOrder: theme.order,
        },
      });

      for (const node of theme.nodes) {
        const difficultyString = node.difficulty <= 2 ? 'EASY' : node.difficulty <= 4 ? 'MEDIUM' : 'HARD';
        const lesson = await prisma.lesson.create({
          data: {
            id: node.id,
            moduleId: module.id,
            title: node.title,
            description: node.curriculum.learning_outcome,
            displayOrder: node.order,
            difficulty: difficultyString,
          },
        });

        for (let i = 0; i < node.activities.length; i++) {
          const act = node.activities[i];
          const activity = await prisma.activity.create({
            data: {
              lessonId: lesson.id,
              title: getActivityTitle(node.title, act.type),
              activityType: act.type,
              displayOrder: i + 1,
            },
          });

          if (act.type === 'video') {
            await prisma.video.create({
              data: {
                activityId: activity.id,
                title: `${node.title} Video Lesson`,
                videoKey: `videos/${node.id}.mp4`,
                thumbnailKey: 'thumbnails/default.png',
                duration: act.estimated_minutes * 60,
              },
            });
          } else if (act.type === 'listen') {
            await prisma.audio.create({
              data: {
                activityId: activity.id,
                title: `${node.title} Listening Guide`,
                audioKey: `audio/${node.id}.mp3`,
                duration: act.estimated_minutes * 60,
              },
            });
          }
        }
      }
    }
  }
}

describe('Phase 4 — Student Learning API & Lesson Delivery Integration Tests', () => {
  let context: any;
  let token: string;

  beforeEach(async () => {
    await cleanDatabase();
    await seedCurriculumForTests();

    // Create child profile initially matching 'prenursery' grade (using 'prenursery' as overrides.childName to get correct resolver)
    context = await createAuthenticatedContext({
      childName: 'Tester Child',
      childAge: 2,
    });
    token = `Bearer ${context.accessToken}`;

    // Explicitly set ageGroup to 'prenursery' to match CBSE grade key
    await prisma.child.update({
      where: { id: context.child.id },
      data: { ageGroup: 'prenursery' },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /roadmap & Sub-routes', () => {
    it('should retrieve full child roadmap dynamically', async () => {
      const res = await request
        .get('/api/roadmap')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.grade).toBe('Pre-Nursery');
      expect(res.body.data.nodes.length).toBeGreaterThan(0);
    });

    it('should retrieve current lesson metadata', async () => {
      const res = await request
        .get('/api/roadmap/current')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('pn_free_play_and_settlingin'); // first lesson of prenursery
    });

    it('should retrieve current theme metadata', async () => {
      const res = await request
        .get('/api/roadmap/current-theme')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('settling_in');
    });

    it('should retrieve current grade metadata', async () => {
      const res = await request
        .get('/api/roadmap/current-grade')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('pre_nursery');
    });
  });

  describe('GET /lessons & Details Delivery', () => {
    it('should retrieve unlocked lessons matching child grade', async () => {
      const res = await request
        .get('/api/lessons/unlocked')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // The first lesson (pn_free_play_and_settlingin) should be unlocked by default
      const lessonIds = res.body.data.map((l: any) => l.id);
      expect(lessonIds).toContain('pn_free_play_and_settlingin');
    });

    it('should deliver complete static curriculum metadata for a lesson details query', async () => {
      const lessonId = 'pn_free_play_and_settlingin';
      const res = await request
        .get(`/api/lessons/${lessonId}`)
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(lessonId);
      expect(res.body.data).toHaveProperty('activities');
      expect(res.body.data).toHaveProperty('reward');
      expect(res.body.data).toHaveProperty('mastery');
      expect(res.body.data).toHaveProperty('prerequisites');
      expect(res.body.data).toHaveProperty('subject');
      expect(res.body.data).toHaveProperty('theme');
      expect(res.body.data).toHaveProperty('grade');
      expect(res.body.data).toHaveProperty('month');
    });

    it('should reject retrieve details if the lesson is locked', async () => {
      // 'pn_fingertap_practice' has a prerequisite of 'pn_free_play_and_settlingin' and is locked
      const res = await request
        .get('/api/lessons/pn_fingertap_practice')
        .set('Authorization', token);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('locked');
    });

    it('should reject retrieve details if the lesson is outside child grade', async () => {
      // 'n_cap_a' belongs to nursery grade
      const res = await request
        .get('/api/lessons/n_cap_a')
        .set('Authorization', token);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("learner's grade");
    });
  });

  describe('GET /lessons/:id/activities', () => {
    it('should retrieve lesson activities with formatted storage media keys', async () => {
      const lessonId = 'pn_free_play_and_settlingin';
      const res = await request
        .get(`/api/lessons/${lessonId}/activities`)
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach((act: any) => {
        if (act.activityType === 'video') {
          expect(act.video.videoUrl).toContain('videos/');
        } else if (act.activityType === 'listen') {
          expect(act.audio.audioUrl).toContain('audio/');
        }
      });
    });
  });

  describe('GET /progress/summary', () => {
    it('should retrieve correct derived learner progress summary', async () => {
      // complete first lesson pn_free_play_and_settlingin
      const lessonId = 'pn_free_play_and_settlingin';
      const node = curriculumService.getLessonById(lessonId)!;

      // Seed KnowledgeState to satisfy mastery
      await prisma.knowledgeState.create({
        data: {
          childId: context.child.id,
          topicId: lessonId,
          mastery: 90.0,
          confidence: 1.0,
          lastTransitionAt: new Date(),
        },
      });

      // Complete activities to mark it COMPLETED
      for (const act of node.activities) {
        await request
          .post('/api/progress/activity/complete')
          .set('Authorization', token)
          .send({ lessonId, activityType: act.type, stars: 3 });
      }

      const res = await request
        .get('/api/progress/summary')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.completedLessons).toBe(1);
      expect(res.body.data.xpEarned).toBe(node.reward.xp);
      expect(res.body.data.starsEarned).toBe(node.activities.length * 3); // activities * 3 stars
      expect(res.body.data.completionPercentage).toBeGreaterThan(0);
      expect(res.body.data.currentLesson.id).toBe('pn_fingertap_practice'); // now pn_fingertap_practice is next available
    });
  });

  describe('POST /progress/activity/complete', () => {
    it('should reject completion of activities that do not belong to the lesson', async () => {
      const res = await request
        .post('/api/progress/activity/complete')
        .set('Authorization', token)
        .send({
          lessonId: 'pn_free_play_and_settlingin',
          activityType: 'write', // pn_free_play_and_settlingin has only listen & speak
          stars: 3,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not defined');
    });

    it('should safely and atomically handle concurrent activity completion requests', async () => {
      const lessonId = 'pn_free_play_and_settlingin';

      // Submit 3 concurrent completion requests for same listen activity
      const promises = [
        request
          .post('/api/progress/activity/complete')
          .set('Authorization', token)
          .send({ lessonId, activityType: 'listen', stars: 3 }),
        request
          .post('/api/progress/activity/complete')
          .set('Authorization', token)
          .send({ lessonId, activityType: 'listen', stars: 3 }),
        request
          .post('/api/progress/activity/complete')
          .set('Authorization', token)
          .send({ lessonId, activityType: 'listen', stars: 3 }),
      ];

      const responses = await Promise.all(promises);
      responses.forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      // DB should contain exactly 1 LessonProgress record with videoCompleted/stars updated, with zero duplicate rows
      const progressCount = await prisma.lessonProgress.count({
        where: { childId: context.child.id, lessonId },
      });
      expect(progressCount).toBe(1);

      const progress = await prisma.lessonProgress.findFirst({
        where: { childId: context.child.id, lessonId },
      });
      expect(progress?.listenCompleted).toBe(true);
      expect(progress?.listenStars).toBe(3);
    });
  });
});
