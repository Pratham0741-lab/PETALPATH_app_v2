/**
 * A lesson is completed only by finishing its activities, never by asking.
 *
 * `POST /api/progress/complete` (lessonCompletionService.completeLesson) must
 * refuse a lesson whose activities have not been recorded as finished by their
 * own endpoints, and must not count coming-soon media as required.
 */
import { prisma } from '../helpers/setup.js';
import { createAuthenticatedContext } from '../helpers/auth.js';
import { createTestCategory, createTestModule, createTestLessonData } from '../helpers/factories.js';
import { curriculumLoader } from '../../modules/curriculum/curriculum-loader.js';
import { expectedModalitiesOf } from '../../modules/progress/lesson-evidence.js';
import { lessonCompletionService } from '../../modules/progress/lesson-completion.service.js';
import { COMING_SOON } from '../../shared/utils/media-paths.js';

// A real curriculum lesson with a video and at least one other modality.
const node = curriculumLoader
  .getLessons('prenursery')
  .find((n) => {
    const m = expectedModalitiesOf(n.activities);
    return m.includes('video') && m.length >= 2;
  })!;
const expected = expectedModalitiesOf(node.activities);
const TYPE = { video: 'video', listen: 'listen', speak: 'speak', write: 'write' } as const;

async function setup(videoKey: string) {
  const { child } = await createAuthenticatedContext();
  const category = await createTestCategory({ title: 'Pre-Nursery' });
  const mod = await createTestModule(category.id);
  await prisma.lesson.create({ data: { ...createTestLessonData(mod.id), id: node.id } });
  for (const [i, m] of expected.entries()) {
    const activity = await prisma.activity.create({
      data: { lessonId: node.id, title: m, activityType: TYPE[m], displayOrder: i },
    });
    if (m === 'video') await prisma.video.create({ data: { activityId: activity.id, title: 'v', videoKey } });
    if (m === 'listen') {
      await prisma.audio.create({ data: { activityId: activity.id, title: 'a', audioKey: 'audio/PRE_NURSERY/x.mp3' } });
    }
  }
  return child.id;
}

const flags = (done: readonly string[]) => ({
  videoCompleted: done.includes('video'),
  listenCompleted: done.includes('listen'),
  speakCompleted: done.includes('speak'),
  writeCompleted: done.includes('write'),
});

const statusOf = async (childId: string) =>
  (await prisma.lessonProgress.findUnique({ where: { childId_lessonId: { childId, lessonId: node.id } } }))?.status;

describe('lesson completion gate', () => {
  it('uses a lesson with several modalities', () => {
    expect(node).toBeDefined();
    expect(expected.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects a bare "mark complete" with no finished activity, and writes nothing', async () => {
    const childId = await setup('videos/PRE_NURSERY/real.mp4');
    await expect(lessonCompletionService.completeLesson(childId, node.id)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(await statusOf(childId)).toBeUndefined();
  });

  it('rejects while any doable activity is unfinished', async () => {
    const childId = await setup('videos/PRE_NURSERY/real.mp4');
    await prisma.lessonProgress.create({
      data: { childId, lessonId: node.id, status: 'IN_PROGRESS', ...flags(expected.slice(0, -1)) },
    });
    await expect(lessonCompletionService.completeLesson(childId, node.id)).rejects.toMatchObject({
      statusCode: 400,
      errors: { unfinished: [expected[expected.length - 1]] },
    });
    expect(await statusOf(childId)).toBe('IN_PROGRESS');
  });

  it('completes once every activity has been finished', async () => {
    const childId = await setup('videos/PRE_NURSERY/real.mp4');
    await prisma.lessonProgress.create({
      data: { childId, lessonId: node.id, status: 'IN_PROGRESS', ...flags(expected) },
    });
    await lessonCompletionService.completeLesson(childId, node.id);
    expect(await statusOf(childId)).toBe('COMPLETED');
  });

  it('does not require, or count, a coming-soon video', async () => {
    const childId = await setup(COMING_SOON);
    const rest = expected.filter((m) => m !== 'video');
    await prisma.lessonProgress.create({
      data: { childId, lessonId: node.id, status: 'IN_PROGRESS', ...flags(rest) },
    });
    await lessonCompletionService.completeLesson(childId, node.id);
    const row = await prisma.lessonProgress.findUnique({
      where: { childId_lessonId: { childId, lessonId: node.id } },
    });
    expect(row?.status).toBe('COMPLETED');
    expect(row?.videoCompleted).toBe(false);
  });
});
