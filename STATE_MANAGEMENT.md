# State Management Architecture

## Overview

The project uses **two parallel state management systems**:

1. **React Query (TanStack Query v5)** — Server state for Phase 4+ features
2. **Zustand v5** — UI state + legacy server state (original architecture)

---

## React Query Architecture

### Provider Configuration (`QueryProvider.tsx`)

| Setting | Value |
|---|---|
| Default `staleTime` | 60 seconds |
| Default `gcTime` | 5 minutes |
| Retry (queries) | No retry on 4xx; max 2 retries on 5xx/network |
| Retry (mutations) | No retry on 4xx; max 1 retry on 5xx/network |
| `refetchOnWindowFocus` | `false` |
| `refetchOnReconnect` | `true` |
| Devtools | Web-only in development |

### Query Key Ownership

| Key Pattern | Owner Hook | Source API | Enabled Condition |
|---|---|---|---|
| `['curriculum']` | `useCurriculum` | `curriculumApi.getCurriculum()` | Always |
| `['curriculum', 'available']` | `useAvailableSkills` | `curriculumApi.getAvailableSkills()` | Always |
| `['curriculum', 'subject', id]` | `useSubjectCurriculum` | `curriculumApi.getSubjectCurriculum(id)` | `!!subjectId` |
| `['notifications', page]` | `useNotifications` | `notificationsApi.getNotifications(page, 20)` | Always |
| `['notifications-unread']` | `useUnreadCount` | `notificationsApi.getUnreadCount()` | Always (poll 30s) |
| `['assessments', childId]` | `useAssessmentsList` | `assessmentsApi.getAssessments()` | `!!childId` |
| `['assessment', id]` | `useAssessmentDetail` | `assessmentsApi.getAssessment(id)` | `!!id` |
| `['attempts', childId]` | `useAssessmentsList` | `assessmentsApi.getAttempts(childId)` | `!!childId` |
| `['attempt', childId, attemptId]` | `useAttemptDetail` | `assessmentsApi.getAttempt(childId, attemptId)` | `!!childId && !!attemptId` |
| `['analytics-overview', childId]` | `useAnalyticsOverview` | `analyticsApi.getAnalyticsOverview(childId)` | `!!childId` |
| `['analytics-activity', period, childId]` | `useAnalyticsActivity` | `analyticsApi.getAnalyticsActivity(period, childId)` | `!!childId` |
| `['analytics-progress', childId]` | `useAnalyticsProgress` | `analyticsApi.getAnalyticsProgress(childId)` | `!!childId` |
| `['analytics-rewards', childId]` | `useAnalyticsRewards` | `analyticsApi.getAnalyticsRewards(childId)` | `!!childId` |
| `['analytics-timeline', page, childId]` | `useAnalyticsTimeline` | `analyticsApi.getAnalyticsTimeline(page, 20, childId)` | `!!childId` |
| `['analytics-subjects', childId]` | `useAnalyticsSubjects` | `analyticsApi.getAnalyticsSubjects()` | `!!childId` |
| `['recommendation', childId]` | `RecommendationsScreen` (inline) | `getRecommendation(childId)` | `!!childId` |

### Mutation Invalidation Map

| Mutation Hook | Invalidated After Success |
|---|---|
| `useCreateAttempt` | `['assessments']` prefix, `['attempts', childId]` |
| `useSubmitAttempt` | `['assessments']` prefix, `['attempts', childId]`, `['attempt', childId, attemptId]` |
| `useActivateSkill` | `['curriculum']`, `['curriculum', 'available']`, `['curriculum', 'subject']` prefix |
| `useMarkRead` | `['notifications']` prefix, `['notifications-unread']` |
| `useMarkAllRead` | `['notifications']` prefix, `['notifications-unread']` |
| `useDeleteNotification` | `['notifications']` prefix, `['notifications-unread']` |

### Cache Hierarchy

```
React Query Cache
├── curriculum
│   ├── ['curriculum']                        # Full skill tree
│   ├── ['curriculum', 'available']           # Unlocked skills
│   └── ['curriculum', 'subject', id]         # Per-subject curriculum
├── notifications
│   ├── ['notifications', page]               # Paginated list (one key per page)
│   └── ['notifications-unread']              # Badge count (polled)
├── assessments
│   ├── ['assessments', childId]              # Assessment catalog
│   ├── ['assessment', id]                    # Single assessment
│   ├── ['attempts', childId]                 # Attempt history
│   └── ['attempt', childId, attemptId]       # Single attempt
├── analytics
│   ├── ['analytics-overview', childId]
│   ├── ['analytics-activity', period, childId]
│   ├── ['analytics-progress', childId]
│   ├── ['analytics-rewards', childId]
│   ├── ['analytics-timeline', page, childId]
│   └── ['analytics-subjects', childId]
└── recommendation
    └── ['recommendation', childId]           # Single recommendation object
```

**No duplicate cache owners**: Each key pattern is owned by exactly one hook.
**No stale-time override**: All queries use the default 60s staleTime.

---

## Zustand Architecture

### Store Inventory (11 stores)

| Store | Responsibility | Server State | Async Actions | React Query Integration |
|---|---|---|---|---|
| `appStore` | Auth tokens, user, session, preferences, stars, mentor | ✅ (tokens/user/stars/mentor) | `setSession`, `setToken`, `clearSession`, `loadSession` | None |
| `childStore` | Active child, children list | ✅ | `setActiveChild`, `refreshChildren`, `addChild`, `updateChild`, `removeChild` | None (consumed by RQ hooks via `activeChild.id`) |
| `progressStore` | Progress overview (%, continue learning, achievements) | ✅ | `refreshProgress`, `completeLesson` | None |
| `roadmapStore` | Full roadmap tree + selection state | ✅ | `loadRoadmap`, `loadActivities`, `completeLesson`, `resetProgress` | None |
| `rewardsStore` | Stars, stickers, badges | ✅ | `refreshRewards` | None |
| `mentorStore` | Mentor catalog | ✅ | `refreshMentors` | None |
| `videoStore` | Current video, playback state, progress | ✅ | `loadVideo`, `savePosition`, `completeVideo` | None |
| `listenStore` | Current audio, selection, completion | ✅ | `loadAudio`, `submitAnswer`, `completeActivity` | None |
| `speakStore` | Current phrase, transcript, recording state | ✅ | `loadSpeak`, `stopRecording`, `completeActivity` | None |
| `writeStore` | Current guide, strokes, accuracy | ✅ | `loadWrite`, `completeActivity` | None |
| `tutorialStore` | Guide settings, seen tutorials, inactivity | ❌ (client-only) | `loadSettings` (storage only) | None |

### Server State Duplication Analysis

| Zustand Store | Server Data | React Query Duplicate? |
|---|---|---|
| **appStore** (stars) | Star count from `/rewards` | **Partial**: `useAnalyticsRewards()` → `/analytics/rewards` (different endpoint) |
| **childStore** | Children list, active child | **None**: RQ hooks only read childId, not child data |
| **progressStore** | Completion %, continue learning | **Partial**: `useAnalyticsProgress()` → `/analytics/progress` (different endpoint, different response shape) |
| **roadmapStore** | Full curriculum tree with lesson states | **Conceptual**: `useCurriculum()` → `/curriculum` (different data model — skill tree vs lesson tree) |
| **rewardsStore** | Stars, stickers, badges | **Partial**: `useAnalyticsRewards()` → `/analytics/rewards` (different endpoint) |
| **mentorStore** | Mentor list | **None**: No React Query hook reads `/mentors` |
| **videoStore** | Video metadata, progress | **None**: No React Query equivalent |
| **listenStore** | Audio metadata, progress | **None**: No React Query equivalent |
| **speakStore** | Speak progress | **None**: No React Query equivalent |
| **writeStore** | Write progress | **None**: No React Query equivalent |

**Verdict**: No exact duplicate of the same API endpoint exists between Zustand and React Query. The overlaps are conceptual (different endpoints, different response shapes for similar domains).

### Zustand Async Action → Endpoint Map

| Store | Action | Endpoint | Method |
|---|---|---|---|
| childStore | refreshChildren | `/children` | GET |
| childStore | setActiveChild | `/auth/select-child` | POST |
| childStore | addChild | `/children` | POST |
| childStore | updateChild | `/children/:id` | PUT |
| childStore | removeChild | `/children/:id` | DELETE |
| roadmapStore | loadRoadmap | `/roadmap` | GET |
| roadmapStore | loadActivities | `/activities?lessonId=` | GET |
| roadmapStore | completeLesson | `/progress/complete` | POST |
| roadmapStore | resetProgress | `/progress/reset` | POST |
| progressStore | refreshProgress | `/progress/overview` | GET |
| progressStore | completeLesson | `/progress/complete` | POST |
| rewardsStore | refreshRewards | `/rewards` + `/rewards/stickers` + `/rewards/badges` | GET |
| mentorStore | refreshMentors | `/mentors` | GET |
| videoStore | loadVideo | `/videos?activityId=` + `/video-progress/:id` | GET |
| videoStore | savePosition | `/video-progress` | POST |
| videoStore | completeVideo | `/video-progress/complete` | POST |
| listenStore | loadAudio | `/audio?activityId=` + `/listen-progress/:id` | GET |
| listenStore | submitAnswer | `/listen-progress/complete` | POST |
| speakStore | loadSpeak | `/speak-progress/:id` | GET |
| speakStore | stopRecording | `/speak-progress/complete` | POST |
| writeStore | loadWrite | `/write-progress/:id` | GET |
| writeStore | completeActivity | `/write-progress/complete` | POST |
| appStore | setSession | (internal — stores tokens) | — |
| appStore | loadSession | (internal — reads storage) | — |
| appStore | clearSession | (internal — clears storage) | — |
| tutorialStore | loadSettings | (internal — reads storage) | — |

### Cross-Store Dependencies

```
childStore.setActiveChild()
  → rewardsStore.refreshRewards()  (imperative import)
  → progressStore.refreshProgress() (imperative import)

roadmapStore.completeLesson()
  → POST /progress/complete
  → roadmapStore.loadRoadmap() (re-read full roadmap)

roadmapStore.resetProgress()
  → POST /progress/reset
  → roadmapStore.loadRoadmap()
  → progressStore.refreshProgress()
  → rewardsStore.refreshRewards()

progressStore.completeLesson()
  → POST /progress/complete
  → useRewardsStore.setState({ totalStars }) (direct state mutation)

videoStore.savePosition()
  → debounced (2s) POST /video-progress

appStore.loadSession()
  → childStore (hydrates activeChild from storage)
```

### State Flow Patterns

**Read Pattern (Zustand)**:
```
Screen → useStore(selector) → re-render on change
```

**Write Pattern (Zustand)**:
```
Screen → store.action() → async API call → store.setState()
  → re-render all subscribers
```

**Read Pattern (React Query)**:
```
Screen → useCustomHook() → useQuery(key, fetcher)
  → returns { data, isLoading, error }
```

**Write Pattern (React Query)**:
```
Screen → useMutation({ mutationFn, onSuccess: invalidateQueries })
  → on success → invalidation triggers re-fetch
```
