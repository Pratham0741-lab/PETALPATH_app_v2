import { apiClient } from './apiClient';
import type { ApiResponse } from '../../types/api';
import type { MasteryStateName } from './masteryTypes';

/**
 * Re-exported so a screen reading the roadmap payload does not need to know that
 * the state vocabulary is owned by the mastery contract.
 */
export type { MasteryStateName };

/**
 * One stop on the journey, as `roadmap.service.getRoadmap` projects it.
 *
 * Only the fields the app actually reads are declared. `activities` and
 * `progress` stay loose because the lesson screens own those shapes.
 */
export interface RoadmapNode {
  id: string;
  title: string;
  themeId: string;
  /** Curriculum difficulty, 1 (easiest) to 5. Optional: older servers omit it. */
  difficulty?: number;
  isCompleted: boolean;
  isUnlocked: boolean;
  stars: number;
  xp: number;
  coins: number;
  attempts: number;
  mastery: number;
  completedAt: string | null;
  prerequisite: string | null;
  /**
   * True when the adaptive engine wants this finished lesson practiced again.
   * Always present — the projection writes `false` on every node first — so a
   * consumer can test the flag rather than its existence.
   */
  isReview?: boolean;
  /** A sentence a parent can read. Long: 60-100 characters. */
  reviewReason?: string;
  reviewPriority?: number;
  reviewDueAt?: string;
  /**
   * Why the padlock is on, when the review gate is the reason for it. Only ever
   * set under `gateMode: 'hard'`.
   */
  lockedReason?: string;
  activities?: unknown[];
  progress?: unknown;
}

/** What to practice before moving on, highest priority first. */
export interface RoadmapReview {
  lessonId: string;
  title: string;
  themeId: string;
  difficulty?: number;
  stars: number;
  /** Parent-readable sentence explaining why this came back. */
  reason: string;
  priority: number;
  dueAt: string;
  masteryState: MasteryStateName | null;
  /**
   * The way of working this child finds hardest, when there is enough evidence
   * to name one. Null far more often than not — treat it as "no suggestion"
   * rather than printing a default.
   */
  recommendedModality: string | null;
}

/**
 * Why the review list is the length it is. Without the counts, a child with
 * twelve weak skills and a child with two look identical.
 */
export interface RoadmapReviewGate {
  mode: 'soft' | 'hard';
  isBlocking: boolean;
  dueCount: number;
  surfacedCount: number;
  deferredCount: number;
  unreachableCount: number;
  reviewsDoneToday: number;
  dailyAllowance: number;
  nextLessonId: string | null;
}

/** How this child works, when `ModalityPerformance` has enough rows to say. */
export interface RoadmapModalityProfile {
  preferred: string;
  weakest: string | null;
  spread: number;
  evidencedCount: number;
}

/**
 * The day's reviews, described as one stop for the path.
 *
 * Not a lesson and not in `nodes[]` — the server sends a description and the app
 * assembles the stop at render time. That split is deliberate: `nodes[]` is the
 * curriculum, and every count taken from it (each theme's lesson total, the
 * journey progress bar, the "today is finished" test, the lesson numbering)
 * would be wrong if a practice stop were hiding among the lessons. Worst of all,
 * completion would *drop* the moment a skill went stale, so the app would
 * visibly punish a child for needing practice.
 *
 * `lessonIds` points at the same lessons `reviews` does. This is a second
 * framing of that list, not a second copy of it.
 */
export interface RoadmapPracticeSession {
  /** Stable for the whole local day, so it is safe as a list key. */
  id: string;
  title: string;
  /** One short line — the lesson's name when there is only one, else a count. */
  subtitle: string;
  /** The theme to draw the stop in. */
  themeId: string;
  /** Draw the stop immediately before this lesson. Null means at the end. */
  beforeLessonId: string | null;
  /** The lessons this session practices, highest priority first. */
  lessonIds: string[];
  count: number;
  estimatedMinutes: number;
  /** Only ever true under a hard gate, and never once the session is done. */
  isBlocking: boolean;
  isCompleted: boolean;
  scheduledFor: string;
}

export interface RoadmapTheme {
  id: string;
  title: string;
  order?: number;
  nodes?: Array<{ id: string }>;
}

/**
 * The whole `/roadmap` payload.
 *
 * This call used to be untyped, which is why the three fields Stage 5 added —
 * `reviews`, `reviewGate` and `modalityProfile` — could be shipped by the server
 * and read by nobody: `apiClient.get` with no type argument resolves to
 * `unknown`, so every consumer cast to `any` and only found the keys it already
 * knew the names of.
 */
export interface RoadmapPayload {
  grade: string;
  themes: RoadmapTheme[];
  nodes: RoadmapNode[];
  currentNode: RoadmapNode | null;
  reviews: RoadmapReview[];
  /** Null-guarded: absent when talking to a server that predates Stage 5. */
  reviewGate?: RoadmapReviewGate | null;
  /**
   * Null when there is nothing to practice and nothing was practiced today.
   * Optional as well as nullable, so an older server simply means "no stop" and
   * the app falls back to marking the reviewed lessons in place.
   */
  practiceSession?: RoadmapPracticeSession | null;
  modalityProfile?: RoadmapModalityProfile | null;
  progress: { completedCount: number; totalCount: number };
  completion: number;
  nextGrade: string | null;
  /** Backwards-compatibility aliases the older screens still read. */
  roadmap: unknown[];
  currentLesson: RoadmapNode | null;
}

export const learningApi = {
  getDashboardOverview: (childId: string) => apiClient.get(`/progress/overview?childId=${childId}`),

  getRoadmap: (childId: string) =>
    apiClient.get<ApiResponse<RoadmapPayload>>(`/roadmap?childId=${childId}`),

  getCurriculum: () => apiClient.get('/curriculum'),

  getLesson: (id: string) => apiClient.get(`/lessons/${id}`),
  getLessonsByModule: (moduleId: string) => apiClient.get(`/lessons?moduleId=${moduleId}`),

  getActivities: (lessonId: string) => apiClient.get(`/activities?lessonId=${lessonId}`),
  getActivity: (id: string) => apiClient.get(`/activities/${id}`),

  getProgressOverview: (childId: string) => apiClient.get(`/progress/overview?childId=${childId}`),
  completeLesson: (lessonId: string) => apiClient.post('/progress/complete', { lessonId }),
  resetProgress: () => apiClient.post('/progress/reset', {}),

  getMastery: (childId: string) => apiClient.get(`/mastery?childId=${childId}`),

  getRecommendation: (childId: string) => apiClient.get(`/v1/learner/${childId}/recommendation`),

  getRewards: (childId: string) => apiClient.get(`/rewards?childId=${childId}`),
  getStickers: (childId: string) => apiClient.get(`/rewards/stickers?childId=${childId}`),
  getBadges: (childId: string) => apiClient.get(`/rewards/badges?childId=${childId}`),
};
