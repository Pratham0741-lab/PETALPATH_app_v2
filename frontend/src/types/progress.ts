/**
 * Shapes for the parent-locked progress analysis and the child's comic story,
 * both hung off the Explore tab. Mirror the backend:
 *   - GET /curriculum/story          -> ProgressStory   (progress-story.ts)
 *   - GET /analytics/grade-progress  -> GradeProgress    (analytics.service.ts)
 * The app only draws what it is handed; all grade scoping and scoring happen
 * server-side.
 */

// ---- Parent-locked analysis (the three charts) ----

export interface SubjectAccuracy {
  subjectId: string;
  subject: string;
  /** Today's accuracy for the subject, 0-100. */
  accuracy: number;
  /** Today's mastery for the subject, 0-100. */
  mastery: number;
  skillCount: number;
}

export interface MasteryPoint {
  /** Calendar day, YYYY-MM-DD. */
  date: string;
  /** Mean mastery recorded that day, 0-100. */
  mastery: number;
}

export interface BeforeAfterRow {
  subjectId: string;
  subject: string;
  before: number;
  after: number;
}

export interface GradeProgress {
  grade: { key: string; number: number; title: string };
  accuracyBySubject: SubjectAccuracy[];
  masteryTimeline: MasteryPoint[];
  beforeAfter: {
    overall: { before: number; after: number };
    bySubject: BeforeAfterRow[];
  };
}

// ---- Child comic story ----

export type StoryBeatKind = 'opening' | 'chapter' | 'boss' | 'stumble' | 'growth' | 'finale';
export type StoryMood = 'happy' | 'brave' | 'triumph' | 'gentle' | 'cheer';

export interface StoryBeat {
  id: string;
  kind: StoryBeatKind;
  title: string;
  caption: string;
  mood: StoryMood;
  /** A big glyph for the comic panel. */
  emoji: string;
  subject?: string;
  stat?: { before?: number; after?: number; percentage?: number };
}

export interface ProgressStory {
  title: string;
  hero: string;
  hasJourney: boolean;
  beats: StoryBeat[];
}
