import { colors } from './colors';
import type { PetalIconName } from '../components/icons';

/**
 * The four states a piece of learning can be in, and the one palette that says
 * so — wherever it is drawn.
 *
 * Before this the same four ideas were coloured differently on every surface:
 * lesson cards leaned on `colors.primary` regardless of state, the garden
 * patches took their colour from the *subject* (so a finished maths patch and an
 * untouched one were both blue), and only the `StatusBadge` had a real mapping.
 * A child cannot learn "green means finished" if green means finished in one
 * place and maths in another.
 *
 * Colour is never the only signal: every state carries a word and an icon too,
 * so the distinction survives colour blindness and greyscale (§30). `soft` is
 * the tint for a fill behind `main`; both clear 4.5:1 for text on `soft`.
 *
 *   locked   — not open yet, nothing to do here
 *   ongoing  — started, not finished
 *   done     — every activity complete
 *   practice — finished once, but faded and worth another go
 */
export type LessonState = 'locked' | 'ready' | 'ongoing' | 'done' | 'practice';

export interface LessonStateVisual {
  label: string;
  icon: PetalIconName;
  /** Ink: icons, borders, text on `soft`. */
  main: string;
  /** Tint: fills, wells, chips. */
  soft: string;
}

export const LESSON_STATE: Record<LessonState, LessonStateVisual> = {
  /* Grey, and deliberately the only desaturated one — a locked thing should
     recede rather than compete with the three the child can act on. */
  locked: { label: 'Locked', icon: 'lock', main: colors.textMuted, soft: colors.skeleton },
  /* Open but untouched. Not one of the four the brief named, but dropping it
     would force "not started yet" to borrow either Locked (wrong — it is
     available) or In progress (wrong — nothing has been done). Brand pink, so
     it reads as the invitation it is. */
  ready: { label: 'Ready', icon: 'forward', main: colors.primaryDark, soft: colors.primaryLight },
  /* Purple is the app's "current / selected" colour throughout (§3). */
  ongoing: { label: 'In progress', icon: 'play', main: colors.purpleDark, soft: colors.secondaryLight },
  done: { label: 'Done', icon: 'check', main: colors.successDark, soft: colors.greenSoft },
  /* Blue for practice, matching the watering language the garden already uses —
     "needs water" is drawn blue there, and this is the same idea named for a
     child: a finished thing that has faded and wants another go. */
  practice: { label: 'Practice', icon: 'replay', main: colors.blueDark, soft: colors.blueSoft },
};

/**
 * Resolves the state from the flags screens actually hold.
 *
 * Order matters: `locked` wins over everything (a locked lesson's progress is
 * not the child's business yet), then `practice` over `done`, because a faded
 * lesson is complete *and* worth repeating and the actionable state is the one
 * worth showing.
 */
export const resolveLessonState = (flags: {
  locked?: boolean;
  done?: boolean;
  needsPractice?: boolean;
  progress?: number;
}): LessonState => {
  if (flags.locked) return 'locked';
  if (flags.needsPractice) return 'practice';
  if (flags.done) return 'done';
  if ((flags.progress ?? 0) > 0) return 'ongoing';
  return 'ready';
};
