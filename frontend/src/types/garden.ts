/**
 * "Your Garden" — the shape of the GET /curriculum/garden response.
 *
 * Mirrors backend/src/modules/curriculum/garden-view.ts (`buildGarden`) plus the
 * per-subject visual fields the controller merges in from the Subject row (icon,
 * colour, description, displayOrder). The backend is the sole authority on each
 * flower's `stage`, its live `masteryState` and whether it `needsWater`; the app
 * only draws what it is handed, so the band-order trap can never reach the UI.
 */

/** The five stages of a flower, weakest to fullest. Named by shape, never a number. */
export type BloomStage = 'seed' | 'sprout' | 'bud' | 'opening' | 'bloom';

/** The mastery bands, as the backend enum spells them. Not ordered by severity. */
export type MasteryBand = 'LEARNING' | 'WEAK' | 'STRONG' | 'MASTERED';

/** One flower, already resolved to what the app draws. */
export interface GardenSkill {
  skillId: string;
  title: string;
  difficulty: number;
  /** Curriculum state for this child: LOCKED / AVAILABLE / ACTIVE / COMPLETED. */
  state: string;
  /** Today's mastery — decayed, rounded, 0 for anything not yet engaged. */
  masteryScore: number;
  /** Today's band, or null until the child engages the skill. */
  masteryState: MasteryBand | null;
  stage: BloomStage;
  needsWater: boolean;
}

export interface BrightestBloom {
  skillId: string;
  title: string;
  masteryScore: number;
  masteryState: MasteryBand;
}

export interface GardenSubject {
  // --- aggregates from buildGarden ---
  id: string;
  name: string;
  skillCount: number;
  /** Mean live mastery over every flower in the patch, 0-100. */
  growthPercent: number;
  /** How many flowers sit at each stage. Sums to `skillCount`. */
  bloomTally: Record<BloomStage, number>;
  /** Finished flowers that have started to fade — the ones to water. */
  thirstyCount: number;
  /** The fullest flower, for the patch's focal bloom. Null when nothing is engaged. */
  brightestBloom: BrightestBloom | null;
  skills: GardenSkill[];
  // --- visual fields merged from the Subject row (or the unseeded failsafe) ---
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
}

export interface GardenTotals {
  subjectCount: number;
  skillCount: number;
  completedCount: number;
  thirstyCount: number;
  /** Mean live mastery across every flower in every patch. */
  overallGrowthPercent: number;
}

export interface Garden {
  subjects: GardenSubject[];
  totals: GardenTotals;
}
