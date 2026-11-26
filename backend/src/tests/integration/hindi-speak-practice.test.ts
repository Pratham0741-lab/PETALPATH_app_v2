/**
 * Hindi speaking activities are unscored practice while
 * SPEAK_HINDI_SCORING_ENABLED is off (shared/utils/lesson-language.ts).
 *
 * The language comes from the curriculum's structured `curriculum.subject`
 * field, never from a title. Unscored practice records nothing, is not
 * required to finish the lesson, awards no stars, and is not counted in the
 * lesson's mastery evidence. Other lessons' speaking is unchanged.
 */
import supertest from 'supertest';
import { prisma } from '../helpers/setup.js';
import app from '../../app.js';
import { createAuthenticatedContext } from '../helpers/auth.js';
import { createTestCategory, createTestModule, createTestLessonData } from '../helpers/factories.js';
import { curriculumLoader } from '../../modules/curriculum/curriculum-loader.js';
import type { CurriculumNode } from '../../modules/curriculum/curriculum.types.js';
import { expectedModalitiesForLesson, expectedModalitiesOf } from '../../modules/progress/lesson-evidence.js';
import { isPerformableActivity } from '../../shared/utils/lesson-activity-plan.js';
import { isActivityScored, isSpeakScored, lessonLanguage } from '../../shared/utils/lesson-language.js';
import { planLessonActivities } from '../../modules/activities/activities.service.js';
import { maxStarsOf } from '../../shared/utils/lesson-stars.js';
import { lessonCompletionService } from '../../modules/progress/lesson-completion.service.js';
import { env } from '../../config/env.js';

const request = supertest(app);

const GRADES = ['prenursery', 'nursery', 'lkg', 'ukg'];
const allNodes = (): CurriculumNode[] => GRADES.flatMap((g) => [...curriculumLoader.getLessons(g)]);

/**
 * A real lesson of this subject whose speaking activity is offered to the child
 * (lesson-activity-plan.ts) and that has at least one other modality. Hindi
 * Listen is never offered (no concrete target), so only speaking is required
 * to be performable here.
 */
const lessonWithSpeak = (subject: string): CurriculumNode =>
  allNodes().find((n) => {
    const m = expectedModalitiesOf(n.activities);
    return n.curriculum?.subject === subject && m.includes('speak') && m.length >= 2 && isPerformableActivity('speak', n);
  })!;

const hindi = lessonWithSpeak('Hindi');
const english = lessonWithSpeak('English');
const TYPE = { video: 'video', listen: 'listen', speak: 'speak', write: 'write' } as const;

async function setup(node: CurriculumNode) {
  const { child, accessToken } = await createAuthenticatedContext();
  const category = await createTestCategory({ title: `Grade ${node.id}` });
  const mod = await createTestModule(category.id);
  await prisma.lesson.create({ data: { ...createTestLessonData(mod.id), id: node.id, title: node.title } });
  const ids: Record<string, string> = {};
  for (const [i, m] of expectedModalitiesOf(node.activities).entries()) {
    const activity = await prisma.activity.create({
      data: { lessonId: node.id, title: `${node.title}: ${m}`, activityType: TYPE[m], displayOrder: i },
    });
    ids[m] = activity.id;
    if (m === 'video') {
      await prisma.video.create({
        data: { activityId: activity.id, title: 'v', videoKey: 'videos/PRE_NURSERY/real.mp4' },
      });
    }
    if (m === 'listen') {
      await prisma.audio.create({
        data: { activityId: activity.id, title: 'a', audioKey: 'audio/PRE_NURSERY/x.mp3' },
      });
    }
  }
  return { childId: child.id, token: accessToken, ids };
}

const progressOf = (childId: string, lessonId: string) =>
  prisma.lessonProgress.findUnique({ where: { childId_lessonId: { childId, lessonId } } });

const doneFlags = (node: CurriculumNode, except: string) => {
  const others = expectedModalitiesOf(node.activities).filter((m) => m !== except);
  return {
    videoCompleted: others.includes('video'),
    listenCompleted: others.includes('listen'),
    writeCompleted: others.includes('write'),
    speakCompleted: others.includes('speak'),
  };
};

describe('language detection (structured curriculum.subject field)', () => {
  it('found a Hindi and an English lesson with speaking', () => {
    expect(hindi).toBeDefined();
    expect(english).toBeDefined();
  });

  it('reads the subject field, not the title', () => {
    expect(lessonLanguage(hindi)).toBe('hi');
    expect(lessonLanguage(english)).toBe('en');
    expect(lessonLanguage({ curriculum: { subject: 'Hindi' } })).toBe('hi');
    expect(lessonLanguage({ curriculum: { subject: 'English' } })).toBe('en');
    expect(lessonLanguage(undefined)).toBe('en');
  });

  it('includes Pre-Nursery Hindi lessons whose module titles do not say Hindi', () => {
    const preHindi = curriculumLoader.getLessons('prenursery').filter((n) => n.curriculum?.subject === 'Hindi');
    expect(preHindi.length).toBeGreaterThan(0);
  });
});

describe('the flag', () => {
  it('is off by default', () => {
    expect(env.SPEAK_HINDI_SCORING_ENABLED).toBe(false);
  });

  it('off: Hindi speaking is unscored; on: scored like any other', () => {
    expect(isSpeakScored(hindi, false)).toBe(false);
    expect(isSpeakScored(hindi, true)).toBe(true);
    expect(isSpeakScored(english, false)).toBe(true);
    // Only speaking is ever unscored.
    expect(isActivityScored('write', hindi, false)).toBe(true);
    expect(isActivityScored('video', hindi, false)).toBe(true);
  });

  it('expected modalities drop speak only for Hindi with the flag off', () => {
    expect(expectedModalitiesForLesson(hindi, false)).not.toContain('speak');
    expect(expectedModalitiesForLesson(hindi, true)).toContain('speak');
    expect(expectedModalitiesForLesson(english, false)).toContain('speak');
  });
});

describe('Hindi speaking as practice (flag off)', () => {
  it('the activity list marks it unscored, and stars do not count it', async () => {
    await setup(hindi);
    const acts = await prisma.activity.findMany({
      where: { lessonId: hindi.id },
      include: { video: true, audio: true },
    });
    const planned = planLessonActivities(hindi.id, acts, { withSpec: false });
    const speak = planned.find((a) => a.activityType === 'speak')!;
    expect(speak).toMatchObject({ language: 'hi', scored: false });
    expect(planned.filter((a) => a.activityType !== 'speak').every((a) => a.scored)).toBe(true);
    expect(maxStarsOf(planned)).toBe(maxStarsOf(planned.filter((a) => a.activityType !== 'speak')));
  });

  it('a speaking score sent for it (e.g. by an older app) records nothing', async () => {
    const { childId, token, ids } = await setup(hindi);
    const res = await request
      .post('/api/speak-progress/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({ activityId: ids.speak, score: 0.95 });
    expect(res.status).toBe(200);
    expect(await prisma.speakProgress.count({ where: { childId } })).toBe(0);
    const p = await progressOf(childId, hindi.id);
    expect(p?.speakCompleted ?? false).toBe(false);
    expect(p?.speakStars ?? 0).toBe(0);
  });

  it('the lesson completes without it, with no speaking stars', async () => {
    const { childId } = await setup(hindi);
    await prisma.lessonProgress.create({
      data: { childId, lessonId: hindi.id, status: 'IN_PROGRESS', ...doneFlags(hindi, 'speak') },
    });
    await lessonCompletionService.completeLesson(childId, hindi.id);
    const p = await progressOf(childId, hindi.id);
    expect(p?.status).toBe('COMPLETED');
    expect(p?.speakCompleted).toBe(false);
    expect(p?.speakStars).toBe(0);
  });
});

describe('English speaking is unchanged', () => {
  it('records the score', async () => {
    const { childId, token, ids } = await setup(english);
    const res = await request
      .post('/api/speak-progress/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({ activityId: ids.speak, score: 0.95 });
    expect(res.status).toBe(200);
    expect(await prisma.speakProgress.count({ where: { childId, isCompleted: true } })).toBe(1);
  });

  it('is still required to finish the lesson', async () => {
    const { childId } = await setup(english);
    await prisma.lessonProgress.create({
      data: { childId, lessonId: english.id, status: 'IN_PROGRESS', ...doneFlags(english, 'speak') },
    });
    await expect(lessonCompletionService.completeLesson(childId, english.id)).rejects.toMatchObject({
      statusCode: 400,
      errors: { unfinished: ['speak'] },
    });
  });
});
