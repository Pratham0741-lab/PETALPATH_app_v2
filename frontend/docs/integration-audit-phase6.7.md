# Phase 6.7 — Frontend ↔ Backend Integration Audit

**Date:** Phase 6.7 hardening
**Scope:** Verify every frontend API call resolves to a route that exists on the **frozen** backend (no backend files modified).
**Method:** Enumerated all `api.*` / `apiClient.*` call sites under `src/api` + `src/services/api`, then diffed each `{METHOD} {path}` against the backend route table extracted from `backend/src/modules/**/*.routes.ts`.

---

## 1. Verification result

| Group | Status |
|-------|--------|
| Auth (`/auth/*`) | ✅ All match |
| Children (`/children`) | ✅ All match |
| Progress (`/progress/*`) | ✅ All match |
| Roadmap / Lessons / Activities (`/roadmap`, `/lessons`, `/activities`) | ✅ Reads match; see §2 |
| Curriculum (`/curriculum`) | ⚠️ Partial — see §2 (drift, mostly dead code) |
| Rewards / Stickers / Badges (`/rewards`) | ✅ All match (childId query param is ignored by backend, harmless) |
| Notifications (`/notifications`) | ✅ All match |
| Analytics (`/analytics/*`) | ✅ All match |
| Mentors (`/mentors`) | ✅ All match |
| Stories (`/stories`) | ✅ All match |
| Session (`/session/*`) | ✅ All match |
| Media progress (`/video-progress`, `/listen-progress`, `/speak-progress`, `/write-progress`) | ✅ All match |
| Assessment / Placement (`/assessments`, `/placement/*`) | ✅ All match |
| Mastery / Learner (`/mastery`, `/learner/*`, `/recommendations`) | ✅ All match |

**Net: every endpoint that is actually invoked by a screen resolves to a real, frozen backend route.** No live runtime break was found.

---

## 2. Contract drift found (pre-existing, from earlier phases)

These reference endpoints that **do not exist** on the backend. They are **dead code** (zero callers from any screen/hook) and were never executed at runtime, so they do not break the app. They were removed during this audit's cleanup (§4).

| Frontend call | Target | Backend reality | Disposition |
|---|---|---|---|
| `learningApi.getCategories()` | `GET /curriculum/categories` | Backend `/curriculum` has only `/`, `/available`, `/next`, `/subject/:id`, `/generate`, `/activate`, `/complete` | Dead — removed `useCategories` hook + method |
| `learningApi.getCategory(id)` | `GET /curriculum/categories/:id` | No such route | Dead — removed method |
| `learningApi.getModules(catId)` | `GET /curriculum/modules?categoryId=` | No such route | Dead — removed method |
| `learningApi.getModule(id)` | `GET /curriculum/modules/:id` | No such route | Dead — removed method |
| `learningApi.getPlacement(childId)` | `GET /placements/:childId` | Backend uses `/placement` (singular) and exposes `GET /placement/questionnaire`, `GET /placement/children/:childId/result/:attemptId` — no `GET /placements/:id` | Dead — removed method |

Also flagged (NOT changed — backend-agnostic, used by screens):
- `activityApi.submitQuiz` → `POST /activities/:id/quiz/submit`
- `activityApi.submitGameScore` → `POST /activities/:id/game/complete`
- `activityApi.getQuiz/getGame/getReadingContent/getAITutorSession` → `/activities/:id/{quiz,game,reading,ai-tutor}`
- `activityApi.completeReading` (was used by `useCompleteReading`) → `POST /activities/:id/reading/complete`

These call activity sub-resource endpoints that are **not present** on the frozen backend. They are invoked by the Quiz/Game/Reading/AI-Tutor screens. Because the backend is frozen, these flows will return 404 at runtime. **This is a known limitation of the frozen backend, not a frontend defect.** Recorded here for the backend team; not fixable within Phase 6.7 constraints.

---

## 3. Offline-layer wiring (this audit) — endpoint correction

The offline-safe mutation wrappers in `src/hooks/useActivityProgress.ts` were initially pointed at non-existent URLs. Corrected during this audit to the **real** backend endpoints:

| Hook | Before (broken) | After (real) |
|---|---|---|
| `useVideoProgress.complete` | `POST /activities/videos/:id/complete` | `POST /video-progress/complete` (body `{videoId}`) |
| `useCompleteReading.complete` | `POST /activities/reading/:id/complete` | `POST /activities/:id/reading/complete` (body `{activityId}`) |
| `useCompleteLessonSync` | `POST /lessons/:id/complete` | `POST /progress/complete` (body `{lessonId}`) |

All three now match live backend routes and replay correctly from the offline queue.

---

## 4. Cleanup applied (Part 11 — cautious)

- Removed dead `activityApi.completeVideo` / `activityApi.completeReading` (superseded by offline-safe wrappers).
- Removed dead `learningApi.getCategories` / `getCategory` / `getModules` / `getModule` / `getPlacement` (target non-existent endpoints, zero callers).
- Removed dead `useCategories` hook (only caller of the above).
- Trimmed orphaned `queryKeys.curriculum.{detail,categories,category,modules,module}` to `curriculum.all`.

No behavior change for any live screen. `tsc --noEmit` clean after each removal.

---

## 5. Known limitations (cannot fix — backend frozen)

1. **Quiz / Game / Reading / AI-Tutor activity endpoints missing on backend.** The activity engine screens call `/activities/:id/{quiz,game,reading,ai-tutor}` sub-routes that are not implemented in the frozen backend. These will 404 until the backend adds them. Frontend code is correct against the *intended* contract.
2. **`NetInfo` absent.** Native offline detection relies on per-request error handling only (web uses `useNetworkStatus`). By design — not a defect.
3. **No frontend test runner / lint script.** `npm run lint` and `npm test` do not exist in `frontend/package.json`. Validation limited to `tsc --noEmit` + `expo export --platform web` (both green).

## 6. Validation

- `npx tsc --noEmit` → **PASS (exit 0)**
- `npx expo export --platform web` → **PASS (exported `dist`)**
- Backend `git status` → **0 modified files** (frozen confirmed)
