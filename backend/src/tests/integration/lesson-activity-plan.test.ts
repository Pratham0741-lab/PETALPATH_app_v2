/**
 * Lessons only offer activities a child can perform, and the roadmap's
 * activity list equals the lesson's.
 */
import '../helpers/setup.js';
import app from '../../app.js';
import supertest from 'supertest';
import { prisma } from '../../config/database.js';
import { cleanDatabase, createTestCategoryData } from '../helpers/factories.js';
import { createAuthenticatedContext } from '../helpers/auth.js';
import { curriculumService } from '../../modules/curriculum/index.js';
import { planLessonActivities } from '../../modules/activities/activities.service.js';
import {
  hasConcreteTarget,
  hasMeaningfulDragDrop,
  isPerformableActivity,
  isSpeakableWord,
} from '../../shared/utils/lesson-activity-plan.js';

const types = (lessonId: string, ...t: string[]) =>
  planLessonActivities(
    lessonId,
    t.map((activityType, i) => ({ activityType, displayOrder: i + 1 })),
    { withSpec: false },
  ).map((a) => a.activityType);

describe('which activities a lesson offers', () => {
  it('Free Play is video only', () => {
    expect(types('pn_free_play_and_settlingin', 'video', 'listen', 'speak')).toEqual(['video']);
  });

  it('All About Me is video only (no letter board, no "say All About Me")', () => {
    expect(types('pn_myself', 'video', 'listen', 'tap', 'select')).toEqual(['video']);
  });

  it('a vocabulary word keeps Speak but not Listen', () => {
    expect(types('pn_head', 'video', 'listen', 'speak')).toEqual(['video', 'speak']);
  });

  it('a letter lesson keeps everything, plus its letter board', () => {
    const t = types('pn_letter_c', 'video', 'listen', 'speak');
    expect(t).toEqual(expect.arrayContaining(['video', 'listen', 'speak', 'drag_drop']));
    expect(t).toHaveLength(4);
  });

  it('classifies titles', () => {
    for (const t of ['Letter A', 'Sound of B', 'Number 7', 'Circle', 'Standing Line', '-at family']) {
      expect(hasConcreteTarget(t)).toBe(true);
    }
    for (const t of ['Free Play', 'All About Me', 'Head', 'Hello Time']) expect(hasConcreteTarget(t)).toBe(false);
    for (const t of ['Head', 'Dog', 'Hello & Bye', 'Maa (Mother)']) expect(isSpeakableWord(t)).toBe(true);
    for (const t of ['Free Play', 'Tap Bubbles', 'Hello Time', 'All About Me', 'Festival Fun']) {
      expect(isSpeakableWord(t)).toBe(false);
    }
  });

  it('never offers the random-letter drag-and-drop on a lesson that is not about a letter', () => {
    expect(hasMeaningfulDragDrop({ id: 'pn_myself', title: 'All About Me' })).toBe(false);
    expect(isPerformableActivity('drag_drop', { id: 'pn_letter_c', title: 'Letter C' })).toBe(true);
  });
});

describe('roadmap and lesson agree', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('the roadmap lists exactly the activities the lesson screen opens', async () => {
    const { accessToken, child } = await createAuthenticatedContext({ childAge: 2 });
    await prisma.child.update({ where: { id: child.id }, data: { ageGroup: '2-3' } });
    const node = curriculumService.getLessonById('pn_free_play_and_settlingin')!;
    const category = await prisma.category.create({ data: { ...createTestCategoryData(), title: 'Pre-Nursery' } });
    const mod = await prisma.module.create({ data: { categoryId: category.id, title: 'M', description: 'd', displayOrder: 1 } });
    await prisma.lesson.create({ data: { id: node.id, moduleId: mod.id, title: node.title, displayOrder: 1, difficulty: 'EASY' } });
    for (const [i, t] of ['video', 'listen', 'speak'].entries()) {
      await prisma.activity.create({ data: { lessonId: node.id, title: t, activityType: t, displayOrder: i + 1 } });
    }

    const lesson = await request(accessToken).get(`/api/activities?lessonId=${node.id}`);
    const roadmap = await request(accessToken).get('/api/roadmap');
    const roadmapLesson = roadmap.body.data.roadmap
      .flatMap((c: any) => c.modules.flatMap((m: any) => m.lessons))
      .find((l: any) => l.id === node.id);

    const lessonTypes = lesson.body.data.map((a: any) => a.activityType);
    expect(lessonTypes).toEqual(['video']);
    expect(roadmapLesson.activities.map((a: any) => a.activityType)).toEqual(lessonTypes);
  });
});

function request(token: string) {
  const r = supertest(app);
  return {
    get: (url: string) => r.get(url).set('Authorization', `Bearer ${token}`),
  };
}
