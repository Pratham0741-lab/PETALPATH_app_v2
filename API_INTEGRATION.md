# API Integration Reference

## Architecture

```
Screen → Custom Hook → API Module → ApiClient → Backend
                           ↑
                    index.ts (barrel)
```

All API modules use the shared `api` client instance from `client.ts`, which handles:
- JWT auto-attach from `appStore.token`
- 20-second timeout via AbortController
- Automatic token refresh on 401 (single retry)
- Structured error: `ApiError { statusCode, userMessage, isNetworkError }`
- Dev-mode request/response logging

---

## API Module Reference

### `api/index.ts` — Barrel

**Re-exports**: `api`, `ApiError`, `toUserMessage`, `checkServerHealth`, `authApi`, `childrenApi`, `roadmapApi`, `progressApi`, `rewardsApi`, `mentorsApi`, `mediaApi`, `analyticsApi`, `sessionsApi`, `assessmentsApi`, `notificationsApi`, `curriculumApi`

**Note**: `recommendations` module exists but is NOT re-exported from barrel (imported directly).

---

### `auth.ts`

| Function | Method | Endpoint | Request | Response |
|---|---|---|---|---|
| `login(email, password)` | POST | `/auth/login` | `{ email, password }` | Session (token + user) |
| `register(name, email, password)` | POST | `/auth/register` | `{ name, email, password }` | Session |
| `loginWithGoogle(idToken)` | POST | `/auth/google` | `{ idToken }` | Session |
| `forgotPassword(email)` | POST | `/auth/forgot-password` | `{ email }` | Success message |
| `resetPassword(token, newPassword)` | POST | `/auth/reset-password` | `{ token, newPassword }` | Success |
| `logout(refreshToken)` | POST | `/auth/logout` | `{ refreshToken }` | Success |
| `selectChild(childId)` | POST | `/auth/select-child` | `{ childId }` | New token with childId claim |

**React Query**: None (inline `useMutation` in Login/Register screens)

---

### `children.ts`

| Function | Method | Endpoint | Request |
|---|---|---|---|
| `getChildren()` | GET | `/children` | — |
| `createChild(data)` | POST | `/children` | `{ name, age, avatarUrl? }` |
| `updateChild(id, data)` | PUT | `/children/:id` | Partial fields |
| `deleteChild(id)` | DELETE | `/children/:id` | — |

**React Query**: None (Zustand `childStore` manages calls directly)

---

### `roadmap.ts`

| Function | Method | Endpoint | Params |
|---|---|---|---|
| `getRoadmap()` | GET | `/roadmap` | — |
| `getLesson(lessonId)` | GET | `/lessons/:lessonId` | — |
| `getActivities(lessonId)` | GET | `/activities` | `?lessonId=` |
| `getActivity(activityId)` | GET | `/activities/:activityId` | — |

**React Query**: None (Zustand `roadmapStore` manages calls directly)

---

### `progress.ts`

| Function | Method | Endpoint | Request |
|---|---|---|---|
| `getProgressOverview()` | GET | `/progress/overview` | — |
| `completeLesson(lessonId)` | POST | `/progress/complete` | `{ lessonId }` |
| `resetProgress()` | POST | `/progress/reset` | `{}` |

**React Query**: None (Zustand `progressStore` manages calls directly)

---

### `rewards.ts`

| Function | Method | Endpoint |
|---|---|---|
| `getRewardsOverview()` | GET | `/rewards` |
| `getStickers()` | GET | `/rewards/stickers` |
| `getBadges()` | GET | `/rewards/badges` |

**React Query**: None (Zustand `rewardsStore` manages calls directly)

---

### `mentors.ts`

| Function | Method | Endpoint |
|---|---|---|
| `getMentors()` | GET | `/mentors` |

**React Query**: None (Zustand `mentorStore` manages calls directly)

---

### `media.ts`

| Function | Method | Endpoint |
|---|---|---|
| `getVideos(activityId)` | GET | `/videos?activityId=` |
| `getVideoProgress(videoId)` | GET | `/video-progress/:videoId` |
| `saveVideoProgress(data)` | POST | `/video-progress` |
| `completeVideo(data)` | POST | `/video-progress/complete` |
| `getAudio(activityId)` | GET | `/audio?activityId=` |
| `getAllAudio()` | GET | `/audio` |
| `getListenProgress(activityId)` | GET | `/listen-progress/:activityId` |
| `completeListenProgress(data)` | POST | `/listen-progress/complete` |
| `getSpeakProgress(activityId)` | GET | `/speak-progress/:activityId` |
| `completeSpeakProgress(data)` | POST | `/speak-progress/complete` |
| `getWriteProgress(activityId)` | GET | `/write-progress/:activityId` |
| `completeWriteProgress(data)` | POST | `/write-progress/complete` |

**React Query**: None (Zustand stores manage calls directly)

---

### `curriculum.ts`

| Function | Method | Endpoint | Params |
|---|---|---|---|
| `getCurriculum()` | GET | `/curriculum` | — |
| `getAvailableSkills()` | GET | `/curriculum/available` | — |
| `getNextSkills(limit)` | GET | `/curriculum/next` | `?limit=` |
| `getSubjectCurriculum(subjectId)` | GET | `/curriculum/subject/:subjectId` | — |
| `activateSkill(skillId)` | POST | `/curriculum/activate` | `{ skillId }` |
| `completeSkill(skillId)` | POST | `/curriculum/complete` | `{ skillId }` |

**React Query**: `useCurriculum` hook (keys: `['curriculum']`, `['curriculum', 'available']`, `['curriculum', 'subject', id]`)
**Invalidation**: After `useActivateSkill` → invalidates all three prefixes

---

### `assessments.ts`

| Function | Method | Endpoint | Request |
|---|---|---|---|
| `getAssessments()` | GET | `/assessments` | — |
| `getAssessment(id)` | GET | `/assessments/:id` | — |
| `createAttempt(childId, assessmentId)` | POST | `/assessments/:childId/attempts` | `{ assessmentId }` |
| `getAttempts(childId, assessmentId?)` | GET | `/assessments/:childId/attempts` | `?assessmentId=` |
| `getAttempt(childId, attemptId)` | GET | `/assessments/:childId/attempts/:attemptId` | — |
| `submitAttempt(childId, attemptId, responses)` | POST | `/assessments/:childId/attempts/:attemptId/submit` | `{ responses }` |

**React Query**: `useAssessments` hook (keys: `['assessments', childId]`, `['assessment', id]`, `['attempts', childId]`, `['attempt', childId, attemptId]`)
**Invalidation**: After create/submit attempt → invalidate `['assessments']`, attempts, specific attempt

---

### `analytics.ts`

| Function | Method | Endpoint | Params |
|---|---|---|---|
| `getAnalyticsOverview(childId?)` | GET | `/analytics/overview` | `?childId=` |
| `getAnalyticsActivity(period, childId?)` | GET | `/analytics/activity` | `?period=&childId=` |
| `getAnalyticsProgress(childId?)` | GET | `/analytics/progress` | `?childId=` |
| `getAnalyticsRewards(childId?)` | GET | `/analytics/rewards` | `?childId=` |
| `getAnalyticsTimeline(page, limit, childId?)` | GET | `/analytics/timeline` | `?page=&limit=&childId=` |
| `getAnalyticsSubjects()` | GET | `/analytics/subjects` | — |
| `getAnalyticsReport(window)` | GET | `/analytics/report` | `?window=` |

**React Query**: `useAnalytics` hook (6 query keys prefixed `analytics-*`)
**Invalidation**: None (read-only queries, no mutations)

---

### `notifications.ts`

| Function | Method | Endpoint | Params |
|---|---|---|---|
| `getNotifications(page, limit, unreadOnly?, type?)` | GET | `/notifications` | `?page=&limit=&unreadOnly=&type=` |
| `getUnreadCount()` | GET | `/notifications/unread-count` | — |
| `markNotificationRead(id)` | PATCH | `/notifications/:id/read` | — |
| `markAllNotificationsRead()` | PATCH | `/notifications/read-all` | — |
| `deleteNotification(id)` | DELETE | `/notifications/:id` | — |

**React Query**: `useNotifications` hook (keys: `['notifications', page]`, `['notifications-unread']`)
**Invalidation**: After any mutation → invalidate `['notifications']` prefix + `['notifications-unread']`
**Polling**: `useUnreadCount` has `refetchInterval: 30_000` (30 seconds)

---

### `sessions.ts`

| Function | Method | Endpoint |
|---|---|---|
| `generateSession()` | POST | `/session/generate` |
| `getTodaySession()` | GET | `/session/today` |
| `getSessionHistory(limit)` | GET | `/session/history?limit=` |
| `getSession(id)` | GET | `/session/:id` |
| `startSession(id)` | POST | `/session/:id/start` |
| `pauseSession(id)` | POST | `/session/:id/pause` |
| `resumeSession(id)` | POST | `/session/:id/resume` |
| `completeSession(id)` | POST | `/session/:id/complete` |
| `abandonSession(id)` | POST | `/session/:id/abandon` |
| `completeBlock(sessionId, blockId)` | POST | `/session/:sessionId/block/complete` |
| `skipBlock(sessionId, blockId)` | POST | `/session/:sessionId/block/skip` |

**React Query**: None (not currently consumed by any frontend screen)

---

### `recommendations.ts`

| Function | Method | Endpoint |
|---|---|---|
| `getRecommendation(childId)` | GET | `/learner/:childId/recommendation` |

**Response DTO**:
```
{ success, data: { kind, skillId, sessionPlanId, activityType,
  optimalSessionDurationMin, reasonCode, reasonText, confidence,
  ttlSec, computedAt }, meta: { generatedAt } }
```

**React Query**: Inline in `RecommendationsScreen` (key: `['recommendation', childId]`)
**Invalidation**: None (read-only)

---

### `health.ts`

| Function | Method | Endpoint |
|---|---|---|
| `checkServerHealth()` | GET | `/health` (raw fetch, no auth) |

---

### `client.ts` — Internal

| Method | Internal Use |
|---|---|
| `refreshToken(token)` | POST `/auth/refresh` — rotates JWT |
| `getUserMessage(statusCode, serverMessage)` | Maps HTTP codes to user-friendly strings |

---

## API Coverage Summary

| Module | Total Functions | React Query | Zustand | Inline |
|---|---|---|---|---|
| auth | 7 | — | — | ✅ (mutations) |
| children | 4 | — | ✅ | — |
| roadmap | 4 | — | ✅ | — |
| progress | 3 | — | ✅ | — |
| rewards | 3 | — | ✅ | — |
| mentors | 1 | — | ✅ | — |
| media | 12 | — | ✅ | — |
| curriculum | 6 | ✅ | — | — |
| assessments | 6 | ✅ | — | — |
| analytics | 7 | ✅ | — | — |
| notifications | 5 | ✅ | — | — |
| sessions | 11 | — | — | — |
| recommendations | 1 | ✅ | — | — |
| health | 1 | — | — | ✅ |
| **Total** | **71** | **6 files** | **7 files** | — |

## Backend Endpoint Summary

| Module | Endpoints | Auth Required |
|---|---|---|
| Auth | 9 | Partial |
| Children | 5 | ✅ |
| Mentors | 2 | ✅ |
| Categories | 5 | ❌ |
| Modules | 5 | ❌ |
| Lessons | 5 | ❌ |
| Activities | 5 | ❌ |
| Videos | 5 | ❌ |
| Video Progress | 3 | ✅ |
| Audio | 2 | ✅ |
| Listen Progress | 3 | ✅ |
| Speak Progress | 3 | ✅ |
| Write Progress | 3 | ✅ |
| Progress | 7 | ✅ |
| Rewards | 3 | ✅ |
| Stories | 5 (stubbed 501) | ❌ |
| Assessments | 7 | ✅ |
| Mastery | 4 | ✅ |
| Curriculum | 7 | ✅ |
| Adaptive | 5 | ✅ |
| Reinforcement | 5 | ✅ |
| Session | 18 | ✅ |
| Analytics | 11 | ✅ |
| Learner | 2 | ✅ |
| Notifications | 6 | ✅ |
| Roadmap | 1 | ✅ |
| Adaptive Learning | 9 | ✅ |
| Intelligence Core | 10 | ✅ |
| Adaptive Planning | 29 | ✅ |
| Health | 1 | ❌ |
| **Total** | **~164 unique (210 mounted)** | — |
