/**
 * Unit coverage for the pure progress-story builder. No database: the builder
 * takes plain facts and returns an arc, so these assert the arc directly. Lives
 * under integration/ only because that is the sole path the jest config globs.
 */
import { buildProgressStory, StoryInput } from '../../modules/curriculum/progress-story.js';

const NOW = new Date('2026-08-27T00:00:00.000Z');

function baseInput(overrides: Partial<StoryInput> = {}): StoryInput {
  return {
    childName: 'Mila',
    gradeTitle: 'Nursery',
    startedAt: new Date('2026-06-01T00:00:00.000Z'),
    now: NOW,
    overallBefore: 10,
    overallAfter: 60,
    subjects: [{ name: 'Maths', before: 10, after: 55 }],
    bosses: [],
    stumbles: 0,
    ...overrides,
  };
}

describe('buildProgressStory', () => {
  it('returns a gentle single-beat prompt when nothing has happened', () => {
    const story = buildProgressStory(
      baseInput({ subjects: [], bosses: [], overallBefore: 0, overallAfter: 0, startedAt: null }),
    );
    expect(story.hasJourney).toBe(false);
    expect(story.beats).toHaveLength(1);
    expect(story.beats[0].kind).toBe('opening');
  });

  it('builds a full arc: opening, chapter, growth and finale', () => {
    const story = buildProgressStory(baseInput());
    expect(story.hasJourney).toBe(true);
    const kinds = story.beats.map((b) => b.kind);
    expect(kinds[0]).toBe('opening');
    expect(kinds).toContain('chapter');
    expect(kinds).toContain('growth');
    expect(kinds[kinds.length - 1]).toBe('finale');
    // The child's name is the hero throughout.
    expect(story.hero).toBe('Mila');
    expect(story.beats.every((b) => b.caption.length > 0)).toBe(true);
  });

  it('turns a passed assessment into a triumphant boss beat', () => {
    const story = buildProgressStory(
      baseInput({ bosses: [{ title: 'Counting to Ten', percentage: 90, defeated: true, when: NOW }] }),
    );
    const boss = story.beats.find((b) => b.kind === 'boss');
    expect(boss).toBeDefined();
    expect(boss!.mood).toBe('triumph');
    expect(boss!.stat?.percentage).toBe(90);
  });

  it('keeps an undefeated boss brave, not defeated', () => {
    const story = buildProgressStory(
      baseInput({ bosses: [{ title: 'Big Test', percentage: 40, defeated: false, when: NOW }] }),
    );
    const boss = story.beats.find((b) => b.kind === 'boss');
    expect(boss!.mood).toBe('brave');
  });

  it('adds a stumble beat only when there were setbacks', () => {
    expect(buildProgressStory(baseInput({ stumbles: 0 })).beats.some((b) => b.kind === 'stumble')).toBe(false);
    expect(buildProgressStory(baseInput({ stumbles: 3 })).beats.some((b) => b.kind === 'stumble')).toBe(true);
  });

  it('orders boss beats by when they were faced', () => {
    const story = buildProgressStory(
      baseInput({
        bosses: [
          { title: 'Later', percentage: 80, defeated: true, when: new Date('2026-07-01') },
          { title: 'Earlier', percentage: 70, defeated: true, when: new Date('2026-06-15') },
        ],
      }),
    );
    const bossTitles = story.beats.filter((b) => b.kind === 'boss').map((b) => b.title);
    expect(bossTitles).toEqual(['Boss Battle: Earlier', 'Boss Battle: Later']);
  });
});
