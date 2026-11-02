/**
 * A lesson is scored out of 3 stars per activity it offers, not a fixed 8,
 * and the match (drag-and-drop) game's stars count like any other activity's.
 */
import { prisma } from '../helpers/setup.js';
import { createAuthenticatedContext } from '../helpers/auth.js';
import { createTestCategory, createTestModule, createTestLessonData } from '../helpers/factories.js';
import { curriculumLoader } from '../../modules/curriculum/curriculum-loader.js';
import { expectedModalitiesOf } from '../../modules/progress/lesson-evidence.js';
import { hasMeaningfulDragDrop, isPerformableActivity } from '../../shared/utils/lesson-activity-plan.js';
import { lessonCompletionService } from '../../modules/progress/lesson-completion.service.js';
import { progressService } from '../../modules/progress/progress.service.js';
import { COMING_SOON } from '../../shared/utils/media-paths.js';
import { earnedStarsOf, maxStarsOf } from '../../shared/utils/lesson-stars.js';

const video = (videoKey: string) => ({ activityType: 'video', video: { videoKey } });
const listen = (audioKey: string) => ({ activityType: 'listen', audio: { audioKey } });

describe('maxStarsOf', () => {
  it('is 3 per activity kind offered', () => {
    expect(maxStarsOf([video('videos/PRE_NURSERY/a.mp4')])).toBe(3);
    expect(
      maxStarsOf([
        video('videos/PRE_NURSERY/a.mp4'),
        listen('audio/PRE_NURSERY/a.mp3'),
        { activityType: 'speak' },
        { activityType: 'trace' },
        { activityType: 'drag_drop' },
      ]),
    ).toBe(15);
  });

  it('counts each kind once, as the app shows one screen per kind', () => {
    expect(
      maxStarsOf([listen('audio/PRE_NURSERY/a.mp3'), { activityType: 'identify' }, { activityType: 'revision' }]),
    ).toBe(3);
  });

  it('leaves out activities whose media is coming soon', () => {
    expect(maxStarsOf([video(COMING_SOON), { activityType: 'speak' }])).toBe(3);
    expect(maxStarsOf([listen(COMING_SOON)])).toBe(0);
  });

  it('earned stars include the match game', () => {
    expect(earnedStarsOf({ videoStars: 3, listenStars: 2, speakStars: 0, writeStars: 1, dragDropStars: 3 })).toBe(9);
  });
});

// A real lesson with a video and other activities the child is offered.
const node = curriculumLoader
  .getLessons('prenursery')
  .find((n) => {
    const m = expectedModalitiesOf(n.activities);
    return m.includes('video') && m.length >= 2 && m.every((x) => isPerformableActivity(x, n));
  })!;
const expected = expectedModalitiesOf(node.activities);

async function setup() {
  const { child } = await createAuthenticatedContext();
  const category = await createTestCategory({ title: 'Pre-Nursery' });
  const mod = await createTestModule(category.id);
  await prisma.lesson.create({ data: { ...createTestLessonData(mod.id), id: node.id } });
  for (const [i, m] of expected.entries()) {
    const activity = await prisma.activity.create({
      data: { lessonId: node.id, title: m, activityType: m, displayOrder: i },
    });
    if (m === 'video') {
      await prisma.video.create({ data: { activityId: activity.id, title: 'v', videoKey: 'videos/PRE_NURSERY/real.mp4' } });
    }
    if (m === 'listen') {
      await prisma.audio.create({ data: { activityId: activity.id, title: 'a', audioKey: 'audio/PRE_NURSERY/x.mp3' } });
    }
  }
  return child.id;
}

describe('lesson completion reports the lesson maximum', () => {
  it('returns and stores 3 x the activities offered', async () => {
    const childId = await setup();
    for (const m of expected) await progressService.updateActivityCompletion(childId, node.id, m, 3);
    const result = await lessonCompletionService.completeLesson(childId, node.id);

    const kinds = expected.length + (hasMeaningfulDragDrop(node) ? 1 : 0);
    expect(result.maxStars).toBe(3 * kinds);
    expect(result.starsEarned).toBe(3 * expected.length);
    const row = await prisma.lessonProgress.findUnique({ where: { childId_lessonId: { childId, lessonId: node.id } } });
    expect(row?.maxStars).toBe(3 * kinds);
  });

  it("records the match game's stars in the lesson total", async () => {
    const childId = await setup();
    await progressService.updateActivityCompletion(childId, node.id, 'drag_drop', 2);
    const row = await prisma.lessonProgress.findUnique({ where: { childId_lessonId: { childId, lessonId: node.id } } });
    expect(row?.dragDropCompleted).toBe(true);
    expect(row?.dragDropStars).toBe(2);
    expect(row?.totalStars).toBe(2);
  });
});
