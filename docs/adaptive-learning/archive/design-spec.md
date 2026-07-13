# PetalPath Adaptive Learning Engine — Design Specification

**Document status:** Draft v1.0 — Design Only, Awaiting Approval
**Scope:** Backend orchestration, database extensions, frontend integration, algorithms, migration/rollback
**Authors:** Architecture proposal grounded in the existing code read of `backend/src/modules/{mastery,adaptive,curriculum,reinforcement,session,roadmap,analytics,rewards,mentors}/*` and `backend/prisma/schema.prisma` (905 lines, 40 models)
**Non-goals:** Rewriting existing engines; retiring legacy roadmap in this pass; ML-based recommendation (rules-based first, ML-ready by design)

---

## 1. High-Level Architecture

### 1.1 Layering

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Expo RN)                              │
│                                                                       │
│  screens/session/*, components/RecommendationCard, MasteryMap,       │
│  ReviewInbox                                                          │
│         │                                                             │
│  hooks/useLearnerState, useNextRecommendation, useSession,           │
│        useSubmitPerformance                                          │
│         │                                                             │
│  @tanstack/react-query cache + persistence (offline)                 │
│         │                                                             │
│  api/learner.ts  ──HTTPS──┐                                          │
│  Zustand: learnerStore (session runtime UI state)                    │
└────────────────────────────┼──────────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    BACKEND: Facade Layer                              │
│                                                                       │
│  routes/learner.routes.ts                                            │
│         │                                                             │
│  modules/learner/learner.controller.ts     (thin HTTP)               │
│         │                                                             │
│  modules/learner/learner-facade.service.ts (orchestration)           │
│  ├─ recordPerformance()                                              │
│  ├─ getNextRecommendation()                                          │
│  ├─ startSession() / advanceSession()                                │
│  ├─ getLearnerState()                                                │
│  └─ getMentorContext()                                               │
└──────────────────────────────────────────────────────────────────────┘
                             │
      ┌──────────────────────┼──────────────────────┬──────────────────┐
      ▼                      ▼                      ▼                  ▼
┌───────────┐          ┌─────────────┐        ┌────────────┐     ┌──────────┐
│  Mastery  │          │  Adaptive   │        │Reinforce-  │     │Curriculum│
│  Engine   │          │  Engine     │        │ ment       │     │  Engine  │
│ (existing)│          │ (existing)  │        │  Engine    │     │(existing)│
└───────────┘          └─────────────┘        │ (existing) │     └──────────┘
      │                      │                └────────────┘           │
      │                      │                      │                  │
      │      ┌───────────────┴──────────────┐       │                  │
      │      ▼                              ▼       ▼                  │
      │  ┌──────────────┐            ┌───────────────────────┐         │
      │  │  Session     │            │  Streak Service (NEW) │         │
      │  │  Planner     │            └───────────────────────┘         │
      │  │ (refactored) │                                              │
      │  └──────────────┘                                              │
      └────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│           LEARNER STATE READ MODEL (NEW, materialized)                │
│  learner_state (one row per child) — aggregate of the 6 engines      │
└──────────────────────────────────────────────────────────────────────┘
                             │
      ┌──────────────────────┼──────────────────────┐
      ▼                      ▼                      ▼
┌──────────┐          ┌─────────────┐        ┌─────────────┐
│  Rewards │          │  Analytics  │        │ AI Mentor   │
│(refactor:│          │(refactor:   │        │ context     │
│ rule     │          │ read from   │        │ endpoint    │
│ engine)  │          │ LearnerState│        │             │
└──────────┘          └─────────────┘        └─────────────┘
                             │
                             ▼
                  ┌───────────────────────┐
                  │  PostgreSQL (Prisma)  │
                  └───────────────────────┘
```

### 1.2 Architectural principles

- **Facade over merge.** Six existing engines keep their surface; `LearnerFacade` composes them. No engine loses cohesion; the "next best action" decision has one owner.
- **Materialized read model.** `LearnerState` is upserted after every write; every downstream consumer (mentor, analytics, parent dashboard, FE recommendation card) reads one row instead of joining across six tables.
- **Config over code.** Every threshold currently hardcoded in `mastery.service.ts`, `adaptive-learning-engine.service.ts`, `reinforcement-engine.service.ts`, and `session-planner.service.ts` moves behind `engine.config.ts`. Behavior on day one is identical; tuning without code changes becomes possible.
- **Rule registry over switches.** `rewards.service.ts` hardcoded badge-name switch (`Golden Speaker`, `Perfect Lesson`, etc.) becomes `Badge.rule` JSON evaluated by a rule registry.
- **Append-only events, derived state.** `LearningEvent` is authoritative history; `LearnerState` is a projection. Recovery/rebuild is by replay.
- **Deprecation without removal.** Existing `/adaptive`, `/mastery`, `/curriculum`, `/reinforcement`, `/session` endpoints stay for one release cycle with `X-Deprecation` headers; no client breakage.

### 1.3 Data flow: `POST /v1/learner/:childId/performance`

```
Client → assertChildOwnership → learner.controller
                                       │
                                       ▼
                         learnerFacade.recordPerformance
                                       │
     ┌─────────────────────────────────┼─────────────────────────────────┐
     ▼                                 ▼                                 ▼
1. masteryEngine              2. adaptiveEngine              3. reinforcementEngine
   .processPerformance           .processChildPerformance       .detectWeakSkills
   → SkillHealth upsert          → LearningProfile upsert       → ReinforcementQueue upsert
   → SkillHistory create         → ModalityPerformance upsert   → ReinforcementEvent create
   → RegressionLog (if drop)     → AdaptationEvent create
   → ReviewSchedule upsert       → RegressionLog (adaptive-side)
                                 → LearningEvent append
     └─────────────────────────────────┼─────────────────────────────────┘
                                       ▼
                         4. curriculumEngine.onSkillProgress  (NEW hook)
                            → ChildSkillCurriculum state transitions
                                       │
                                       ▼
                         5. streakService.registerActivity
                            → Streak upsert
                                       │
                                       ▼
                         6. rewardsRuleEngine.evaluate
                            → ChildBadge / ChildSticker creates for matching rules
                                       │
                                       ▼
                         7. learnerStateBuilder.rebuild(childId)
                            → LearnerState upsert  (single row)
                                       │
                                       ▼
                             { learnerState, unlocked: [badges,stickers], nextRecommendation }
```

All 7 steps run in one Prisma `$transaction` per request. Target P95 latency: 100 ms.

---

## 2. New Prisma Models

Four new models. All additive; no existing model is renamed or dropped.

### 2.1 `LearnerState` (materialized aggregate)

```prisma
model LearnerState {
  id                        String   @id @default(cuid())
  childId                   String   @unique
  child                     Child    @relation(fields: [childId], references: [id], onDelete: Cascade)

  // Aggregate mastery
  overallMasteryScore       Float    @default(0)     // weighted avg over SkillHealth
  masteredSkillCount        Int      @default(0)
  strongSkillCount          Int      @default(0)
  weakSkillCount            Int      @default(0)
  totalSkillCount           Int      @default(0)

  // Weak / strong / due — denormalized top-N (JSON of skill id arrays)
  topWeakSkillIds           Json     @default("[]")   // top 5 by ascending mastery
  topStrongSkillIds         Json     @default("[]")   // top 5 by descending mastery
  reviewsDueCount           Int      @default(0)      // ReinforcementQueue where nextReviewDate <= now
  reviewsDueSkillIds        Json     @default("[]")

  // Session
  activeSessionPlanId       String?
  lastCompletedSessionAt    DateTime?

  // Streak / engagement
  streakDays                Int      @default(0)
  longestStreakDays         Int      @default(0)
  engagementScore           Float    @default(0)      // rolling avg of last N sessions

  // Adaptive preferences (snapshot from LearningProfile)
  preferredModality         ActivityType?
  optimalSessionDurationMin Int      @default(15)

  // Last recommendation (denormalized for speed)
  lastRecommendationKind    RecommendationKind?
  lastRecommendationSkillId String?
  lastRecommendationAt      DateTime?
  lastRecommendationTTLSec  Int      @default(60)

  // Cache metadata
  updatedAt                 DateTime @updatedAt
  version                   Int      @default(1)     // incremented per rebuild; used for optimistic concurrency

  @@index([childId])
  @@index([updatedAt])
}

enum RecommendationKind {
  NEW_SKILL
  REVIEW
  PRACTICE
  CHALLENGE
  MIXED_PRACTICE
  REST
}
```

**Rationale.** Every FE query for "how is my child doing" and every mentor query for "current state" reads this single row. Cost of maintenance: one upsert per performance event. `version` supports optimistic concurrency for offline sync merges.

### 2.2 `Streak`

```prisma
model Streak {
  id              String   @id @default(cuid())
  childId         String   @unique
  child           Child    @relation(fields: [childId], references: [id], onDelete: Cascade)
  currentDays     Int      @default(0)
  longestDays     Int      @default(0)
  lastActivityDate DateTime?
  updatedAt       DateTime @updatedAt

  @@index([childId])
}
```

**Rationale.** Streak logic currently doesn't exist as a first-class concept — it's implied inside `analytics.service.ts` engagement computation. Extracting it makes streak-based rewards possible and mentor-observable.

### 2.3 `RewardRule`

Instead of adding a column to `Badge`, introduce a first-class rule table so stickers and badges share the same evaluator and rules can be added without a migration:

```prisma
enum RewardRuleKind {
  MASTERY_GAIN
  MASTERY_ABSOLUTE
  STREAK
  REINFORCEMENT_SUCCESS
  WEAK_SKILL_RECOVERED
  SESSION_COMPLETED
  PERFECT_SESSION
  FIRST_LESSON
  CATEGORY_COMPLETED       // legacy compatibility
  LESSON_PERFECT           // legacy compatibility
  MODALITY_MASTERY         // e.g. Golden Speaker
}

enum RewardKind {
  BADGE
  STICKER
}

model RewardRule {
  id            String          @id @default(cuid())
  rewardKind    RewardKind
  badgeId       String?         @unique
  badge         Badge?          @relation(fields: [badgeId], references: [id], onDelete: Cascade)
  stickerId     String?         @unique
  sticker       Sticker?        @relation(fields: [stickerId], references: [id], onDelete: Cascade)
  kind          RewardRuleKind
  params        Json            // rule-specific: {threshold: 80, window: "7d", modality: "SPEAKING"}
  enabled       Boolean         @default(true)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([kind, enabled])
}
```

**Rationale.** Data-driven rules; new badges/stickers require an INSERT, not a code change. Preserves the current hardcoded rules by seeding them as rows.

### 2.4 `PerformanceIdempotency`

For offline sync — the client sends a UUID with every performance event; the server rejects duplicates:

```prisma
model PerformanceIdempotency {
  key         String   @id
  childId     String
  createdAt   DateTime @default(now())
  learnerStateVersion Int    // the LearnerState.version this event produced — replayable
  responseHash        String  // sha256 of the response, so replays can return the same payload

  @@index([childId, createdAt])
}
```

**Rationale.** The audit's Offline Mode readiness gap. Idempotency keys are cheap on the write path and eliminate the "did my last performance record actually save" ambiguity for reconnecting clients.

---

## 3. Database Changes (beyond the four models above)

### 3.1 Enum extensions

- Add `RecommendationKind` (defined in §2.1).
- Add `RewardRuleKind`, `RewardKind` (defined in §2.3).
- **No existing enum is changed.**

### 3.2 New indexes on existing tables (performance)

| Table | Index | Reason |
|---|---|---|
| `SkillHealth` | `@@index([childId, masteryScore])` | Weak/strong-skill top-N queries in the state builder |
| `SkillHealth` | `@@index([childId, nextReviewDate])` | Due-review scan |
| `ReinforcementQueue` | `@@index([childId, nextReviewDate])` | Due queue scan (currently missing) |
| `SessionEvent` | `@@index([sessionPlanId, createdAt])` | Session timeline reads |
| `AdaptationEvent` | `@@index([childId, createdAt(sort: Desc)])` | Recent-events endpoint |
| `LearningEvent` | `@@index([childId, createdAt(sort: Desc)])` | Replay + mentor-context reads |
| `ChildSkillCurriculum` | `@@index([childId, state])` | Available/active skill scans |
| `AnalyticsHistory` | `@@index([childId, metricType, date])` | Analytics window queries |
| `RegressionLog` | `@@index([childId, createdAt(sort: Desc)])` | Recent-regression detection |

### 3.3 Backfill

- `LearnerState`: one row per existing `Child` — built by `learnerStateBuilder.rebuild(childId)`.
- `Streak`: one row per child, `currentDays=0` (streaks are forward-looking; not backfilled from history).
- `RewardRule`: seeded from the existing hardcoded badge names in `rewards.service.ts:69–102` — one row per hardcoded rule preserving current behavior.
- `PerformanceIdempotency`: empty; forward-only.

### 3.4 One migration file

`backend/prisma/migrations/<ts>_add_adaptive_learner_state/`:
- Creates `LearnerState`, `Streak`, `RewardRule`, `PerformanceIdempotency`
- Adds `RecommendationKind`, `RewardRuleKind`, `RewardKind` enums
- Adds all indexes in §3.2
- Runs backfill in a separate Prisma script `scripts/backfill-learner-state.ts` (not in the SQL migration — keeps the migration atomic and re-runnable in test environments without data)

---

## 4. New Backend Services

### 4.1 `modules/learner/`

**`learner-facade.service.ts`** — the orchestrator

```ts
export interface RecordPerformanceInput {
  idempotencyKey: string;
  skillId: string;
  activityType: ActivityType;
  accuracy: number;              // 0–100
  responseTimeMs: number;
  attempts: number;
  retries: number;
  helpRequests: number;
  engagementScore: number;       // 0–100
  sessionDurationSec: number;
  sessionPlanId?: string;
  blockId?: string;
}

export interface RecordPerformanceResult {
  learnerState: LearnerStateDto;
  unlocked: { badges: BadgeDto[]; stickers: StickerDto[] };
  nextRecommendation: RecommendationDto;
  adaptationEvents: AdaptationEventDto[];
}

export interface RecommendationDto {
  kind: RecommendationKind;
  skillId?: string;
  sessionPlanId?: string;
  activityType?: ActivityType;
  reasonCode: string;            // machine-readable
  reasonText: string;            // human-readable, i18n-ready key
  confidence: number;            // 0–1
  ttlSec: number;
  computedAt: string;
}

class LearnerFacadeService {
  recordPerformance(childId: string, input: RecordPerformanceInput): Promise<RecordPerformanceResult>;
  getLearnerState(childId: string): Promise<LearnerStateDto>;
  getNextRecommendation(childId: string, options?: { forceRecompute?: boolean }): Promise<RecommendationDto>;
  startSession(childId: string, options?: { templateId?: string }): Promise<SessionPlanDto>;
  advanceSession(childId: string, sessionPlanId: string, event: SessionAdvanceEvent): Promise<{ session: SessionPlanDto; nextRecommendation: RecommendationDto }>;
  getMentorContext(childId: string): Promise<MentorContextDto>;
  getAnalytics(childId: string, window: 'DAILY'|'WEEKLY'|'MONTHLY'|'LIFETIME'): Promise<AnalyticsDto>;
}
```

**`learner-state.builder.ts`** — pure function `build(childId, prismaClient): Promise<LearnerStatePayload>`. No side effects; called by the facade inside the transaction.

**`learner-state.repository.ts`** — upsert / findByChildId / bump-version.

**`recommendation.service.ts`** — the decision layer (algorithm in §7); pure function over `LearnerState` + `ReinforcementQueue` + `LearningProfile`.

**`learner.controller.ts`** + **`learner.routes.ts`** + **`learner.validator.ts`** — HTTP glue with Zod validation.

### 4.2 `modules/streaks/`

`streak.service.ts` — `registerActivity(childId, date)`, `getStreak(childId)`.

### 4.3 `modules/rewards/rules/`

- `rule.registry.ts` — `register(kind, evaluator)` / `evaluate(rule, context)`.
- `evaluators/mastery-gain.ts`
- `evaluators/streak.ts`
- `evaluators/reinforcement-success.ts`
- `evaluators/weak-skill-recovered.ts`
- `evaluators/session-completed.ts`
- `evaluators/perfect-session.ts`
- `evaluators/first-lesson.ts` (legacy)
- `evaluators/category-completed.ts` (legacy)
- `evaluators/lesson-perfect.ts` (legacy)
- `evaluators/modality-mastery.ts` (Golden Speaker, Writing Wizard)

Each evaluator: `(rule: RewardRule, context: EvaluationContext) => boolean`. Context includes the just-updated `LearnerState`, delta from previous state, and the `LearningEvent` that triggered the transaction.

### 4.4 `shared/config/engine.config.ts`

```ts
export const engineConfig = {
  mastery: {
    weights: { knowledge: 0.35, retention: 0.25, confidence: 0.20, engagement: 0.10, consistency: 0.10 },
    stateThresholds: { learning: 40, weak: 60, strong: 85 },
    reviewCadenceDays: { learning: 2, weak: 1, strong: 7, mastered: 30 },
    retention: { decayFactor: 0.995, initialRetention: 100, successThreshold: 80, successBoost: 30, failurePenalty: 10 },
    regressionDropThreshold: 20,
    consistencyWindowSize: 5,
  },
  adaptive: {
    weaknessThreshold: 50, strengthThreshold: 85, regressionDropThreshold: 20,
    engagementLowThreshold: 50, engagementHighThreshold: 85,
    confidenceLowThreshold: 50, confidenceHighThreshold: 85,
    modalityScoreWeights: { accuracy: 0.4, engagement: 0.4, confidence: 0.2 },
    sessionDuration: { min: 10, max: 45, step: 5, default: 15 },
  },
  reinforcement: {
    weakSkillThreshold: 85, retentionDropThreshold: 50, priorityLowMasteryBoost: 20,
    priorityWeights: { masteryGap: 0.5, retentionGap: 0.3, confidenceGap: 0.2 },
    frequencyDaysByState: { weak: 1, strong: 2, mastered: 3 },
    modalityRotation: ['VIDEO','GAME','SPEAKING','STORY','WRITING'],
  },
  session: {
    strictMode: false,   // gates validateSession/calculatePriority/getBlockCountForAge
    maxReinforcementRatio: 0.3,
    maxSubjectsPerSession: 2,
    ageBlockCounts: [{ maxAge: 3, blocks: 4 }, { maxAge: 5, blocks: 5 }, { maxAge: 999, blocks: 6 }],
    priorityWeights: { curriculum: 0.4, reinforcement: 0.3, modality: 0.2, recency: 0.1 },
  },
  curriculum: {
    unlockRatioThreshold: 70, skillCompletionThreshold: 85,
    priorityWeights: { masteryGap: 0.5, subjectPriority: 0.3, recency: 0.2 },
    defaultSubjectPriority: 50,
  },
  recommendation: {
    ttlSec: 60,
    weights: { dueReviews: 0.4, weakSkills: 0.3, curriculum: 0.2, engagement: 0.1 },
    restRecommendationThresholdMin: 45,
  },
  analytics: {
    trendMinDelta: 5, trendDedupeWindowHours: 24,
    // Explicitly NOT setting fake baselines — new accounts return null, not 70/75
  },
};
```

All values equal the current hardcoded constants. No behavior change on day 1.

### 4.5 `middleware/assert-child-ownership.ts`

```ts
export async function assertChildOwnership(req, res, next) {
  const { childId } = req.params;
  const child = await prisma.child.findUnique({ where: { id: childId }, select: { userId: true } });
  if (!child) return next(new NotFoundError('Child not found'));
  if (child.userId !== req.user.id) return next(new ForbiddenError('Not authorized for this child'));
  next();
}
```

Applied to **every** `/v1/learner/:childId/*` route and, in the same pass, retro-applied to `/adaptive/*`, `/mastery/*`, `/curriculum/*`, `/reinforcement/*`, `/session/*`, `/progress/*` for the IDOR fix.

---

## 5. API Changes

### 5.1 New endpoints (all under `/v1/learner`)

| Method | Path | Purpose | Idempotent |
|---|---|---|---|
| POST | `/v1/learner/:childId/performance` | Record a performance event | Yes (idempotencyKey) |
| GET | `/v1/learner/:childId/state` | Return `LearnerState` aggregate | Yes |
| GET | `/v1/learner/:childId/recommendation` | Next best action | Yes (60s cache) |
| POST | `/v1/learner/:childId/session` | Generate + start a new session plan | No |
| GET | `/v1/learner/:childId/session/:sessionId` | Session plan + blocks + status | Yes |
| POST | `/v1/learner/:childId/session/:sessionId/advance` | Complete/skip a block | Yes (idempotencyKey) |
| POST | `/v1/learner/:childId/session/:sessionId/complete` | End session | Yes |
| GET | `/v1/learner/:childId/analytics?window=DAILY\|WEEKLY\|MONTHLY\|LIFETIME` | Analytics rollup | Yes |
| GET | `/v1/learner/:childId/mentor-context` | AI-mentor read model | Yes |
| GET | `/v1/learner/:childId/reviews/due` | Due reinforcement items | Yes |

Response envelope (uniform):

```json
{
  "data": { ... },
  "meta": {
    "generatedAt": "2026-07-03T12:34:56Z",
    "cacheAge": 0,
    "learnerStateVersion": 42
  }
}
```

All GETs return `ETag: "<learnerStateVersion>"` and honor `If-None-Match` with a 304.
All POSTs accept `Idempotency-Key` header (RFC-draft convention) as an alternative to body-carried keys.

### 5.2 Deprecated but functional (one release cycle)

- `POST /adaptive/performance` → 200 OK + `X-Deprecation: use /v1/learner/:childId/performance`
- `GET /adaptive/profile`, `/adaptive/recommendations`, `/adaptive/events`, `/adaptive/modality-performances`
- `GET /mastery/*`, `/curriculum/*`, `/reinforcement/*`, `/session/*`, `/analytics/*`

Each returns identical payloads to today. Removal deferred to the next major version.

### 5.3 Modified endpoints

- **All existing `/adaptive`, `/mastery`, `/curriculum`, `/reinforcement`, `/session`, `/progress`, `/rewards` routes** gain `assertChildOwnership` middleware. This is a security fix — IDOR-vulnerable endpoints today become IDOR-safe. Client contract unchanged.
- **`/roadmap/:childId`** — return payload gains one optional field `adaptiveCurrentLesson: LessonId | null`. When present, the FE prefers it over the linear-traversal `currentLesson`. Absent when `LearnerState.activeSessionPlanId` is null.

### 5.4 No breaking changes to existing consumers

- The FE currently calls `/roadmap`, `/lessons/:id`, `/activities`, `/progress/*`, `/rewards*`, `/mentors`. Every one of those keeps its exact contract.

---

## 6. Frontend State Changes

### 6.1 New dependencies

- `@tanstack/react-query@^5`
- `@tanstack/react-query-persist-client@^5`
- `@tanstack/query-async-storage-persister@^5` (or `@tanstack/query-sync-storage-persister` — RN's `AsyncStorage`)

### 6.2 New files

```
frontend/src/
├─ api/
│  └─ learner.ts                      # endpoint client for /v1/learner/*
├─ query/
│  ├─ client.ts                       # QueryClient config (staleTime, gcTime, retry)
│  ├─ persist.ts                      # persistence adapter over AsyncStorage
│  └─ mutation-queue.ts               # offline performance-event queue
├─ hooks/
│  ├─ useLearnerState.ts
│  ├─ useNextRecommendation.ts
│  ├─ useSession.ts
│  ├─ useSubmitPerformance.ts         # mutation hook, idempotency-key aware
│  └─ useMasteryMap.ts
├─ store/
│  └─ learnerStore.ts                 # session runtime UI state only (not server state)
├─ components/
│  ├─ RecommendationCard.tsx          # ONE component, responsive-internal, no Mobile/Tablet/Desktop fork
│  ├─ MasteryMap.tsx
│  ├─ ReviewInbox.tsx
│  └─ StreakBadge.tsx
└─ screens/
   └─ session/
      ├─ SessionRunner.tsx
      ├─ SessionBlockView.tsx
      └─ SessionSummary.tsx
```

### 6.3 State ownership (clarification)

- **Server state** → react-query cache (`useLearnerState`, `useNextRecommendation`, `useSession`, analytics, mentor context, reviews-due). Never mirrored into Zustand.
- **UI state during a session** (currently-active block index, hint-visible, timer state) → `learnerStore` (Zustand).
- **Auth / active child** → existing `appStore`, `childStore`. Unchanged.
- **Existing `progressStore`, `roadmapStore`, `rewardsStore`, `mentorStore`** — unchanged in behavior; internally, on child-switch they still call their `refresh*` methods. In a subsequent PR (not this one) they can be replaced by react-query hooks.

### 6.4 Offline strategy

- `useSubmitPerformance` writes to the mutation queue if offline; queue is persisted in `AsyncStorage`; on reconnect the queue drains in insertion order with idempotency keys.
- All GET queries have `staleTime: 30s`, `gcTime: 24h`, `networkMode: 'offlineFirst'`.
- `LearnerState` and `nextRecommendation` are the two queries kept warm on child-switch.

### 6.5 Screen convention (new screens only)

New screens use **one file with responsive internals** (`useResponsive()` hook + conditional layout) rather than the existing `*Mobile.tsx`/`*Tablet.tsx`/`*Desktop.tsx` fork pattern. This is the "start the new pattern for new work" recommendation from the audit; existing screens are not retrofitted in this pass.

---

## 7. Algorithms

### 7.1 Mastery algorithm (unchanged formula — moved to config)

Given a performance event on `(childId, skillId)`:

**Inputs:**
- `accuracy ∈ [0, 100]`
- `attempts ∈ ℤ⁺`, `retries ∈ ℤ⁺`, `helpRequests ∈ ℤ⁺`
- `engagementScore ∈ [0, 100]`
- `previousHealth: SkillHealth | null` (may be null for first attempt)
- `history: SkillHistory[]` (last `consistencyWindowSize - 1 = 4` records)

**Sub-scores:**

```
knowledgeScore     = accuracy
confidenceScore    = 100 · (1 − min(retries, 5)/5) · 0.5
                     + 100 · (1 − min(helpRequests, 5)/5) · 0.5
consistencyScore   = 100 − stddev(last N accuracies including current) · 2  (clamped 0..100)

retentionScore =
    if previousHealth is null:
        initialRetention                                          // 100
    else:
        daysSinceLastReview = (now − previousHealth.updatedAt) / days
        decayed = previousHealth.retentionScore · decayFactor^daysSinceLastReview
        if accuracy ≥ successThreshold:                          // ≥80
            min(100, decayed + successBoost)                     // +30
        else:
            max(0,   decayed − failurePenalty)                   // −10
```

**Mastery score:**

```
masteryScore =
    0.35 · knowledgeScore
  + 0.25 · retentionScore
  + 0.20 · confidenceScore
  + 0.10 · engagementScore
  + 0.10 · consistencyScore
```

**State assignment:**

```
if masteryScore < 40  → LEARNING
elif masteryScore < 60 → WEAK
elif masteryScore < 85 → STRONG
else                   → MASTERED
```

**Regression flag:** if `previousHealth != null` and `previousHealth.masteryScore − masteryScore > 20`, mark regression.

**Next review date:** by state — LEARNING +2d, WEAK +1d, STRONG +7d, MASTERED +30d — computed by `mastery.service.ts:calculateNextReviewDate` unchanged.

**Written:** `SkillHealth` upsert, `SkillHistory` append, `RegressionLog` if regressed, `ReviewSchedule` upsert.

**Complexity:** O(consistencyWindowSize) reads + O(1) writes; deterministic; unit-testable without a DB (pure functions in `mastery.service.ts:calculateKnowledgeScore` etc. already are).

### 7.2 Recommendation algorithm (new — the "what next" decision)

Given `LearnerState` and current context:

```
function nextRecommendation(state: LearnerState, context: Ctx): Recommendation {
  // 1. Cache
  if state.lastRecommendationAt && (now − state.lastRecommendationAt) < ttlSec:
      return state.lastRecommendation

  // 2. Guardrail: rest
  if context.currentSessionDurationMin ≥ restThreshold (45):
      return { kind: REST, reasonCode: 'FATIGUE' }

  // 3. Critical review path
  if state.reviewsDueCount > 0:
      urgentReview = highest-priority queue entry (see 7.3)
      if urgentReview.priority ≥ 80 OR state.weakSkillCount ≥ 5:
          return { kind: REVIEW, skillId: urgentReview.skillId, reasonCode: 'HIGH_PRIORITY_REVIEW' }

  // 4. Weak-skill path
  if state.weakSkillCount ≥ 3:
      weakestSkill = state.topWeakSkillIds[0]
      return { kind: PRACTICE, skillId: weakestSkill, activityType: state.preferredModality, reasonCode: 'WEAK_SKILL_FOCUS' }

  // 5. Progress path (curriculum)
  next = curriculumEngine.recommendNextSkills(childId, limit=1)[0]
  if next != null:
      return { kind: NEW_SKILL, skillId: next.skillId, activityType: state.preferredModality, reasonCode: 'CURRICULUM_PROGRESSION' }

  // 6. Challenge path (strong skills, curriculum exhausted)
  if state.strongSkillCount > 0:
      return { kind: CHALLENGE, skillId: state.topStrongSkillIds[0], reasonCode: 'CHALLENGE' }

  // 7. Fallback
  return { kind: MIXED_PRACTICE, reasonCode: 'DEFAULT_PRACTICE' }
}
```

**Scoring (weighted, for tie-breaks and confidence field):**

```
score = w_reviews · reviewsDueCount / max(1, totalSkillCount)
      + w_weak    · weakSkillCount / max(1, totalSkillCount)
      + w_curric  · (1 if next != null else 0)
      + w_engage  · engagementScore / 100

confidence = clamp(score, 0..1)
```

`w_reviews = 0.4`, `w_weak = 0.3`, `w_curric = 0.2`, `w_engage = 0.1`.

**All thresholds live in `engineConfig.recommendation`**; ML replacement later drops in behind the same function signature.

**Complexity:** O(1) — reads one `LearnerState` row, at most one `ReinforcementQueue` head, at most one curriculum call. Target < 30 ms.

### 7.3 Reinforcement priority (unchanged — moved to config)

Per `reinforcement-engine.service.ts:calculatePriority`:

```
masteryGap    = 100 − masteryScore
retentionGap  = 100 − retentionScore
confidenceGap = 100 − confidenceScore

priority = 0.5 · masteryGap + 0.3 · retentionGap + 0.2 · confidenceGap
if masteryScore < 50: priority += 20
priority = clamp(priority, 0..120)
```

Higher priority ⇒ sooner review.

### 7.4 Session generation (activation of dead code, gated by `engineConfig.session.strictMode`)

Current `session-planner.service.ts:generateSession` iterates the template's `blockSequence` in order and doesn't call `calculatePriority`, `validateSession`, or `getBlockCountForAge`. Refactored:

```
function generateSession(childId):
  child = getChild(childId)
  profile = getLearningProfile(childId)
  template = pickTemplate(child.age, profile.optimalSessionDurationMin)

  // NEW: age-based block count overrides template length when strictMode on
  blockCount = strictMode ? getBlockCountForAge(child.age) : template.blockSequence.length

  candidates = [
    ...curriculumEngine.recommendNextSkills(childId, limit=blockCount),
    ...reinforcementEngine.getDueSkills(childId),
  ]

  // NEW: score every candidate
  scored = candidates.map(c => ({
    ...c,
    score: calculatePriority(
      c.curriculumPriority,
      c.reinforcementPriority,
      c.activityType == profile.preferredModality,
      daysSince(c.lastPracticed)
    )
  }))

  blocks = greedySelect(scored, blockCount, constraints={
    maxReinforcementRatio: 0.3,
    maxSubjectsPerSession: 2,
    noConsecutiveSameModality: true,
  })

  // NEW: strictMode gates final validation
  if strictMode && !validateSession(blocks):
      blocks = fallbackToTemplate(template)   // safety net

  // Attach difficulty curve (existing logic)
  blocks = attachDifficulty(blocks, template)
  return createSessionPlan(childId, blocks)
```

`strictMode: false` on day 1 → behavior identical to today. Flip to `true` after 2 weeks of telemetry.

### 7.5 Reward rule evaluation

Every performance event, after `LearnerState` upsert, in the same transaction:

```
context = { learnerState, previousLearnerState, learningEvent, delta }
for each enabled RewardRule r:
  evaluator = registry.get(r.kind)
  if evaluator(r, context) && !alreadyOwned(childId, r):
    create ChildBadge or ChildSticker
    push to result.unlocked
```

Evaluators are pure functions; each has a unit-test spec covering unlock and no-unlock cases.

Example: `MasteryGainRule` with `params = {threshold: 20, windowDays: 7, subjectId?: string}`:

```
gain = LearnerState.overallMasteryScore − avgMasteryScoreOverWindow(childId, windowDays)
return gain ≥ threshold
```

---

## 8. Spaced Repetition Strategy

Two existing systems currently answer "when should this concept reappear":
1. `mastery.service.ts:calculateNextReviewDate` — sets `ReviewSchedule.nextReviewDate` per skill: LEARNING +2, WEAK +1, STRONG +7, MASTERED +30.
2. `reinforcement-engine.service.ts:calculateNextReviewDate` — sets `ReinforcementQueue.nextReviewDate` per weak-skill queue entry: WEAK +1, STRONG +2, MASTERED +3.

These two schedules **disagree** (mastery says STRONG=7, reinforcement says STRONG=2). Today they don't collide because `ReviewSchedule` isn't yet consumed by the recommendation surface. This design **resolves** the disagreement rather than perpetuating it.

### 8.1 Unified schedule

- **Mastery review** governs "when should this concept naturally reappear because time has passed" (long-range spacing).
- **Reinforcement review** governs "when should this concept be re-tested because it looked weak" (short-range remediation).

They serve different purposes and both continue to exist. The unification is in **how the recommendation layer reads them**:

```
dueReviews(childId) =
      ReviewSchedule where nextReviewDate <= now         (mastery-driven, long spacing)
   ∪  ReinforcementQueue where nextReviewDate <= now     (reinforcement-driven, short spacing)

sorted by priority DESC, then nextReviewDate ASC
```

### 8.2 SM-2-inspired cadence (kept close to today's, formalized)

The user requirement calls out 1d/3d/7d/14d/30d. Current code implements ~1/2/7/30. Adjust to:

| State | Base interval | With good performance (≥ 80% accuracy) | With poor performance (< 60%) |
|---|---|---|---|
| LEARNING | 1d | ×1.5 → 1.5d | ×0.5 → 12h (min clamp 12h) |
| WEAK | 3d | ×1.5 → 4.5d | ×0.5 → 1.5d |
| STRONG | 7d | ×1.5 → 10.5d | ×0.5 → 3.5d |
| MASTERED | 30d | ×1.3 → 39d | ×0.3 → 9d |

**Ease factor** per skill (added to `SkillHealth`):

```prisma
easeFactor    Float   @default(2.5)   // SM-2 baseline; range 1.3–3.0
```

Update rule per event (SM-2 inspired):

```
q = quality ∈ {0,1,2,3,4,5}
   0..2  = incorrect responses
   3..5  = correct responses of varying quality (derived from accuracy + hints)

q = round(5 · accuracy/100) − helpRequests    (clamped 0..5)

easeFactor = max(1.3, easeFactor + (0.1 − (5−q)·(0.08 + (5−q)·0.02)))
```

Base intervals become `baseInterval · easeFactor / 2.5`.

### 8.3 Backfill

Existing `SkillHealth` rows get `easeFactor: 2.5` at migration. No historical replay needed — the schedule diverges gradually from event 1 forward.

### 8.4 Guardrails

- Minimum interval: 12h (prevents thrashing after a single bad response).
- Maximum interval: 90d (concepts still cycle back).
- On regression detection, `easeFactor` resets to 2.5 and interval falls to the state-appropriate minimum.

---

## 9. Migration Plan

**Phase A — Prep (2 days, no user-visible change)**

1. Rotate `backend/.env` secrets (audit blocker, unrelated but blocking).
2. Add `assertChildOwnership` middleware; wire to existing `/adaptive`, `/mastery`, `/curriculum`, `/reinforcement`, `/session`, `/progress`, `/rewards`, `/roadmap` routes. IDOR fix ships here.
3. Extract every hardcoded threshold into `engine.config.ts` with today's values. Behavior identical.

**Phase B — Data model (2 days)**

4. Author migration `add_adaptive_learner_state`:
   - `LearnerState`, `Streak`, `RewardRule`, `PerformanceIdempotency` tables.
   - `RecommendationKind`, `RewardRuleKind`, `RewardKind` enums.
   - `SkillHealth.easeFactor` column.
   - All indexes from §3.2.
5. Author `scripts/backfill-learner-state.ts` — idempotent; safe to re-run.
6. Author `scripts/seed-reward-rules.ts` — seeds `RewardRule` from the hardcoded switch in current `rewards.service.ts`.
7. Run on staging; verify backfill produces one `LearnerState` per `Child` and `RewardRule` count matches existing badges.

**Phase C — Backend facade (1 week)**

8. Implement `learnerFacade`, `learnerStateBuilder`, `recommendation.service`, `streak.service`, `rewards.rule.registry` + all evaluators, `learner.controller`, `learner.routes`.
9. Wire `POST /adaptive/performance` to delegate to `learnerFacade.recordPerformance` under the hood. Same request/response contract — verified via contract test.
10. Expose `/v1/learner/*` publicly, still marked as beta in docs.
11. Add contract tests for all deprecated endpoints; add unit tests for facade + algorithms + rule evaluators. Target 80% coverage on the new module.

**Phase D — Session-planner refactor (2 days)**

12. Activate `calculatePriority`, `validateSession`, `getBlockCountForAge` behind `engineConfig.session.strictMode: false`.
13. Ship dark. Add logging on validation failures to gather baseline.

**Phase E — Analytics + Rewards correctness (2 days)**

14. Fix `analytics.service.ts` window bug at `findAggregateInWindow(sevenDaysAgo, sevenDaysAgo)` — pass a real window.
15. Remove fake baselines (80/70/75) from analytics; empty accounts return `null` metrics. FE displays "not enough data yet" state.
16. Rewrite `rewards.service.ts` to delegate to `rule.registry`. Legacy hardcoded switch removed after backfill confirms parity.

**Phase F — Frontend integration (1.5–2 weeks)**

17. Install react-query + persistence adapter. Configure `QueryClient` with `staleTime: 30s`, `gcTime: 24h`, `networkMode: 'offlineFirst'`.
18. Implement `frontend/src/api/learner.ts` + hooks.
19. Implement mutation queue + idempotency-key handling.
20. Add `RecommendationCard` to Home (feature-flagged `adaptive.homeCard` in `frontend/src/config`).
21. Add `SessionRunner` screen.
22. Add `ReviewInbox`, `MasteryMap`.
23. Update `roadmap.service.ts` to include `adaptiveCurrentLesson`; update FE `roadmapStore` to prefer it when present.

**Phase G — Cutover (1 week)**

24. Enable `sessionPlanner.strictMode: true` after 2 weeks of shadow telemetry.
25. Turn on the FE feature flag for adaptive UI to 10 % of accounts, then 50 %, then 100 %.
26. After one full release cycle, delete the deprecated `/adaptive/performance` compatibility shim.

**Total ETA:** 4–6 calendar weeks. Each phase independently deployable. No phase requires taking the API down.

---

## 10. Rollback Plan

Every phase has an explicit rollback. No rollback requires data loss.

**Phase A** (secrets + IDOR middleware + engine.config extraction)
- **Rollback:** revert the commits. Middleware removal is one PR. Config extraction is behavior-neutral so rollback is optional.
- **Data:** none written.

**Phase B** (migration + backfill)
- **Rollback:** the `add_adaptive_learner_state` migration is **additive**. Rollback = keep tables in place, don't consume them. If tables must be dropped: `DROP TABLE learner_state, streak, reward_rule, performance_idempotency; ALTER TABLE skill_health DROP COLUMN ease_factor;` — safe because no existing code reads them. Ship a `down.sql` alongside `migration.sql`.
- **Data:** backfill is idempotent; re-run at will. `LearnerState` and `Streak` are derived, so dropping them is safe.

**Phase C** (backend facade)
- **Rollback:** the `POST /adaptive/performance` shim (step 9) is a one-line function call; reverting it restores the previous direct controller behavior. `/v1/learner/*` endpoints just stop being called — no removal needed. Kill switch: `engineConfig.facade.enabled: false` short-circuits the facade back to the previous controller path.
- **Data:** `LearnerState` upserts stop. Re-enabling later re-runs backfill. `LearningEvent` remains append-only, so no history is lost.

**Phase D** (session-planner refactor)
- **Rollback:** flip `engineConfig.session.strictMode: false`. Behavior returns to current template-driven output. Config-only change; no restart required if config is hot-reloaded, otherwise one deploy.

**Phase E** (analytics + rewards correctness)
- **Rollback for analytics:** the window bug fix and baseline removal are behind `engineConfig.analytics.legacyBaselines: false`. Flip to `true` to restore the old numbers. The trend-event write is idempotent.
- **Rollback for rewards:** `engineConfig.rewards.useRuleRegistry: false` flips back to the hardcoded switch. Legacy code stays in `rewards.service.ts` until the flag is decommissioned. Already-awarded `ChildBadge` rows are not revoked (award ledger is append-only).

**Phase F** (frontend integration)
- **Rollback:** the FE feature flag `adaptive.homeCard`, `adaptive.sessionRunner`, `adaptive.masteryMap`, `adaptive.reviewInbox` — each individually off-switchable via remote config. Turning them off restores the existing Home / Journey / Progress screens.
- **Data:** react-query cache is client-local. `AsyncStorage` cache can be purged via `queryClient.clear()`. No server rollback.

**Phase G** (cutover)
- **Rollback:** `strictMode → false`; feature flag `adaptive.* → false`. Deprecated `/adaptive/performance` shim is not removed until this phase, so it remains available.

**Rollback beyond a single phase:**

- **Data-loss risk points:** none. All new tables are derived (`LearnerState`, `Streak`) or additive (`RewardRule`, `PerformanceIdempotency`, `easeFactor`). The `LearningEvent` history table is the source of truth and is only appended to.
- **Full replay:** if `LearnerState` becomes corrupt, `scripts/rebuild-learner-state.ts` walks every child, runs `learnerStateBuilder.build`, and upserts. Idempotent; O(children).
- **Emergency toggle:** `engineConfig.facade.enabled: false` + FE flags off + `strictMode: false` = pre-project behavior, with no code revert required.

**What we cannot rollback cleanly (documented risks):**
- Once a `ChildBadge` is awarded by the new rule engine, it is not automatically revoked if the rule is changed retroactively. Rewards are permanent by design. Mitigation: the seeded legacy-equivalent rules preserve current unlocks; new rules can only add badges, not remove them.
- `SkillHealth.easeFactor` values that drift under the new spacing schedule cannot be reconstructed to their pre-migration state (they didn't exist before). Rollback resets them to 2.5; historical intervals used are captured in `SkillHistory` for audit.

---

## Appendix A — Hardcoded values consolidated (informational)

Every value below moves to `engineConfig` in Phase A; day-1 behavior unchanged.

| File | Value | Meaning |
|---|---|---|
| `mastery.service.ts` | `0.35 / 0.25 / 0.20 / 0.10 / 0.10` | Mastery weight vector |
| `mastery.service.ts` | `40 / 60 / 85` | LEARNING/WEAK/STRONG/MASTERED thresholds |
| `mastery.service.ts` | `2 / 1 / 7 / 30` | Review cadence days by state |
| `mastery.service.ts` | `0.995`, `100`, `80`, `30`, `10` | Retention decay/init/threshold/boost/penalty |
| `mastery.service.ts` | `20` | Regression drop threshold |
| `mastery.service.ts` | `5` | Retries/help normalization ceiling |
| `mastery.service.ts` | `4` | Consistency history window |
| `adaptive-learning-engine.service.ts` | `50 / 85 / 20` | Weakness/strength/regression |
| `adaptive-learning-engine.service.ts` | `50 / 85` | Engagement low/high |
| `adaptive-learning-engine.service.ts` | `50 / 85` | Confidence low/high |
| `adaptive-learning-engine.service.ts` | `0.4 / 0.4 / 0.2` | Modality weights |
| `adaptive-learning-engine.service.ts` | `10 / 45 / 5 / 15` | Duration min/max/step/default |
| `reinforcement-engine.service.ts` | `85 / 50` | Weak / retention drop thresholds |
| `reinforcement-engine.service.ts` | `0.5 / 0.3 / 0.2 / +20` | Priority weights + low-mastery boost |
| `reinforcement-engine.service.ts` | `1 / 2 / 3` | Frequency days |
| `reinforcement-engine.service.ts` | `[VIDEO,GAME,SPEAKING,STORY,WRITING]` | Modality rotation |
| `session-planner.service.ts` | `0.3 / 2` | Max reinforcement ratio / max subjects |
| `session-planner.service.ts` | `4 / 5 / 6` | Age-band block counts |
| `session-planner.service.ts` | `0.4 / 0.3 / 0.2 / 0.1` | Session priority weights |
| `curriculum-engine.service.ts` | `70 / 85` | Unlock ratio / completion threshold |
| `curriculum-engine.service.ts` | `0.5 / 0.3 / 0.2` | Curriculum priority weights |
| `analytics.service.ts` | `80 / 70 / 75 / 80` | Fake baselines (**to be removed**) |
| `analytics.service.ts` | `5 / 24h` | Trend delta / dedupe |
| `rewards.service.ts` | `80`, `8` | Modality mastery threshold / perfect-lesson star count |

---

## Approval Requested

This document is the design specification requested. To proceed to implementation, please confirm on these seven points:

1. **Facade approach** vs monolithic engine merge — recommend facade.
2. **`@tanstack/react-query`** on the frontend — recommend adopt.
3. **Roadmap posture** — recommend projection over the legacy `Category/Module/Lesson` tree.
4. **`sessionPlanner.strictMode`** — recommend ship as `false`, flip to `true` after 2 weeks.
5. **Rewards migration** — recommend data-driven `RewardRule` with backfill preserving current unlocks.
6. **Pre-work order** — recommend secrets rotation + `assertChildOwnership` middleware in Phase A before anything else.
7. **Scope** — recommend full Phases A–G (~4–6 weeks). Alternatives: stop after Phase E (backend only, ~2 weeks), or MVP = Phases A + B + facade only + one FE recommendation card (~2 weeks).

**No code, migrations, or dependency installations will occur until this specification is approved or amended.**
