/**
 * "My Story" — the child's own progress retold as a cheerful comic adventure.
 *
 * The Explore garden shows *where* a child is; this shows *how they got there*,
 * as a story a five-year-old can follow: they start as a tiny seed, journey
 * through each subject's land, meet a test/exam as a boss to face, stumble and
 * get back up, and bloom by the end. Nothing here is predicted or invented —
 * every beat is a fact the app already recorded (first vs. latest mastery,
 * completed assessment attempts, regression dips), simply arranged into an arc.
 *
 * Kept pure — no prisma, no repositories, no clock of its own — for the same
 * reason `garden-view.ts` is: the arc can be unit-tested and the harness can
 * replay a frozen `now`. The controller does the I/O and hands plain facts in.
 *
 * Deliberately NOT machine learning: there is nothing to train or predict. The
 * child's history is known, so this is templated narration of that history. AI
 * captions could later replace `caption` strings, but the fact-collection and
 * the arc stay exactly as they are here.
 */

/** The kinds of panel the comic can draw, in the order they typically appear. */
export type StoryBeatKind = 'opening' | 'chapter' | 'boss' | 'stumble' | 'growth' | 'finale';

/** The mood tints the comic renderer maps to a palette and an expression. */
export type StoryMood = 'happy' | 'brave' | 'triumph' | 'gentle' | 'cheer';

export interface StoryBossInput {
  /** The assessment's title, e.g. "Counting to Ten". */
  readonly title: string;
  /** Best/final percentage on the attempt, 0-100, or null if never scored. */
  readonly percentage: number | null;
  /** True when the child passed — the boss was defeated. */
  readonly defeated: boolean;
  /** When the attempt was faced, for ordering. Null sorts last. */
  readonly when: Date | null;
}

export interface StorySubjectInput {
  readonly name: string;
  /** Earliest recorded mastery for this subject, 0-100. */
  readonly before: number;
  /** Latest (live) mastery for this subject, 0-100. */
  readonly after: number;
}

export interface StoryInput {
  readonly childName: string;
  readonly gradeTitle: string;
  /** When the journey began (earliest history/attempt), or null if brand new. */
  readonly startedAt: Date | null;
  readonly now: Date;
  /** Mean earliest mastery across the grade, 0-100. */
  readonly overallBefore: number;
  /** Mean latest mastery across the grade, 0-100. */
  readonly overallAfter: number;
  readonly subjects: readonly StorySubjectInput[];
  readonly bosses: readonly StoryBossInput[];
  /** How many times a mastered skill dipped — the story's setbacks. */
  readonly stumbles: number;
}

export interface StoryBeat {
  readonly id: string;
  readonly kind: StoryBeatKind;
  readonly title: string;
  readonly caption: string;
  readonly mood: StoryMood;
  /** A big glyph for the comic panel — the story's emoji language. */
  readonly emoji: string;
  readonly subject?: string;
  readonly stat?: { before?: number; after?: number; percentage?: number };
}

export interface ProgressStory {
  readonly title: string;
  readonly hero: string;
  /** True when there is real history to tell — false renders a "start your story" prompt. */
  readonly hasJourney: boolean;
  readonly beats: readonly StoryBeat[];
}

/**
 * Boss-like adjectives. The villain is the test's own topic dressed up as a foe —
 * e.g. "Counting to Ten" becomes "the Mighty Counting to Ten" — so the child sees
 * exactly what they beat, just made to sound like a boss. The adjective is chosen
 * deterministically from the title (a tiny char-sum) so the same test always wears
 * the same title and the story never flickers between reads.
 */
const BOSS_ADJECTIVES: readonly string[] = [
  'Mighty',
  'Fearsome',
  'Grumpy',
  'Giant',
  'Sneaky',
  'Roaring',
  'Spiky',
  'Wicked',
  'Grand',
  'Tricky',
];

/** Stable char-sum so the same string always picks the same variant. */
function hashOf(s: string): number {
  let sum = 0;
  for (let i = 0; i < s.length; i += 1) sum += s.charCodeAt(i);
  return sum;
}

function bossTitleFor(topic: string): string {
  const clean = topic.trim() || 'Big Test';
  const adjective = BOSS_ADJECTIVES[hashOf(clean) % BOSS_ADJECTIVES.length];
  return `the ${adjective} ${clean}`;
}

/** A big glyph per subject-land, so each chapter panel looks different at a glance. */
const SUBJECT_EMOJI: ReadonlyArray<{ keyword: string; emoji: string }> = [
  { keyword: 'math', emoji: '🔢' },
  { keyword: 'english', emoji: '🔤' },
  { keyword: 'hindi', emoji: '🪷' },
  { keyword: 'motor', emoji: '✋' },
  { keyword: 'cognitive', emoji: '🧩' },
  { keyword: 'social', emoji: '🤝' },
  { keyword: 'emotional', emoji: '💛' },
  { keyword: 'environment', emoji: '🌍' },
  { keyword: 'awareness', emoji: '🌍' },
];

function subjectEmoji(subject: string): string {
  const lower = subject.toLowerCase();
  for (const { keyword, emoji } of SUBJECT_EMOJI) {
    if (lower.includes(keyword)) return emoji;
  }
  return '🌸';
}

/** A small growth is a sprout; a big one is a dazzling bloom — words, never numbers, for the child. */
function growthWord(before: number, after: number): string {
  const gain = after - before;
  if (gain >= 40) return 'burst into a dazzling full bloom';
  if (gain >= 20) return 'grew tall, bright and strong';
  if (gain >= 5) return 'sprouted brave new leaves';
  if (gain > 0) return 'kept on growing, day by day';
  return 'is getting ready to sprout';
}

/** A few chapter openings, chosen by subject so the panels don't all read the same. */
const CHAPTER_TEMPLATES: ReadonlyArray<(hero: string, subject: string, grew: string) => string> = [
  (h, s, g) => `🌸 In the sunny Land of ${s}, ${h} planted a little seed and ${g}!`,
  (h, s, g) => `🚪 A door opened to the World of ${s}. ${h} stepped in, tried hard, and ${g}.`,
  (h, s, g) => `🗺️ Deep in ${s} valley, ${h} practiced and practiced — and ${g}!`,
  (h, s, g) => `⭐ ${s} was full of surprises! ${h} explored every corner and ${g}.`,
];

/**
 * Build the whole story. Pure: same facts in, same arc out. The arc is always
 * opening → chapters → bosses (woven where they land) → a stumble → growth →
 * finale, but any section with no facts is simply skipped.
 */
export function buildProgressStory(input: StoryInput): ProgressStory {
  const hero = input.childName?.trim() || 'Little Explorer';
  const beats: StoryBeat[] = [];

  const engagedSubjects = input.subjects.filter((s) => s.after > 0 || s.before > 0);
  const facedBosses = [...input.bosses].sort((a, b) => {
    const at = a.when ? a.when.getTime() : Number.MAX_SAFE_INTEGER;
    const bt = b.when ? b.when.getTime() : Number.MAX_SAFE_INTEGER;
    return at - bt;
  });

  const hasJourney = engagedSubjects.length > 0 || facedBosses.length > 0;

  if (!hasJourney) {
    // Nothing has happened yet: one gentle prompt rather than an empty book.
    beats.push({
      id: 'opening',
      kind: 'opening',
      title: 'A New Adventure Awaits',
      caption: `🌱 ${hero}'s story is about to begin in the magical ${input.gradeTitle} kingdom. Play a lesson to write the very first page!`,
      mood: 'gentle',
      emoji: '🌱',
    });
    return { title: `${hero}'s Big Adventure`, hero, hasJourney: false, beats };
  }

  // 1) Opening — the hero sets off.
  beats.push({
    id: 'opening',
    kind: 'opening',
    title: 'Once Upon a Time…',
    caption: `🌱 Once upon a time, ${hero} the Brave stepped into the magical ${input.gradeTitle} kingdom — a tiny seed with a heart full of big dreams!`,
    mood: 'happy',
    emoji: '🌱',
  });

  // 2) A chapter per engaged subject — how the seed grew in that land.
  for (const subject of engagedSubjects) {
    const grew = growthWord(subject.before, subject.after);
    const template = CHAPTER_TEMPLATES[hashOf(subject.name) % CHAPTER_TEMPLATES.length];
    beats.push({
      id: `chapter-${subject.name}`,
      kind: 'chapter',
      title: `The Land of ${subject.name}`,
      caption: template(hero, subject.name, grew),
      mood: 'happy',
      emoji: subjectEmoji(subject.name),
      subject: subject.name,
      stat: { before: Math.round(subject.before), after: Math.round(subject.after) },
    });
  }

  // 3) Boss battles — each completed test is a foe faced.
  for (let i = 0; i < facedBosses.length; i += 1) {
    const boss = facedBosses[i];
    const name = bossTitleFor(boss.title);
    if (boss.defeated) {
      beats.push({
        id: `boss-${i}`,
        kind: 'boss',
        title: `Boss Battle: ${boss.title}`,
        caption: `⚔️ BOOM! ${hero} raised their brave wand and defeated ${name}! The whole kingdom cheers — VICTORY! 🎉`,
        mood: 'triumph',
        emoji: '⚔️',
        stat: boss.percentage != null ? { percentage: Math.round(boss.percentage) } : undefined,
      });
    } else {
      beats.push({
        id: `boss-${i}`,
        kind: 'boss',
        title: `Boss Battle: ${boss.title}`,
        caption: `🛡️ ${name} was a tricky one! ${hero} isn't the winner yet — but every hero trains harder and comes back stronger! 💪`,
        mood: 'brave',
        emoji: '🛡️',
        stat: boss.percentage != null ? { percentage: Math.round(boss.percentage) } : undefined,
      });
    }
  }

  // 4) A stumble — setbacks make the comeback sweeter.
  if (input.stumbles > 0) {
    beats.push({
      id: 'stumble',
      kind: 'stumble',
      title: 'A Bumpy Path',
      caption: `🌧️ Some days the path got bumpy and ${hero} slipped a little. But brave heroes always dust off and climb right back up! 🧗`,
      mood: 'brave',
      emoji: '🌧️',
    });
  }

  // 5) Growth — the whole journey, start against now.
  beats.push({
    id: 'growth',
    kind: 'growth',
    title: 'Look How You Grew!',
    caption: `✨ From a tiny seed to a shining star, ${hero} ${growthWord(input.overallBefore, input.overallAfter)} across the whole kingdom! 🌟`,
    mood: 'cheer',
    emoji: '🌟',
    stat: { before: Math.round(input.overallBefore), after: Math.round(input.overallAfter) },
  });

  // 6) Finale — the adventure goes on.
  beats.push({
    id: 'finale',
    kind: 'finale',
    title: 'To Be Continued…',
    caption: `🏆 And so ${hero}'s adventure rolls on — new lands to explore, new blooms to grow. Onward, hero! 🚀`,
    mood: 'cheer',
    emoji: '🏆',
  });

  return { title: `${hero}'s Big Adventure`, hero, hasJourney: true, beats };
}
