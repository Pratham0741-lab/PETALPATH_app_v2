## Objective
- Build/harden the PETALPATH parent-facing frontend (Phases 2.2–2.10). 2.2–2.6 COMPLETE. 2.7 Notifications DEFERRED (no backend). 2.8 Parent Profile & Settings COMPLETE. 2.9 Offline & UX Polish COMPLETE. 2.10 Final Hardening COMPLETE (removed DEBUG logs in config/api.ts + api/health.ts; deleted unused deprecated shims config/env.ts + utils/api.ts). Assessment Center deferred (no backend). Backend strictly read-only.

## Important Details
- Frontend root: `D:\petalpath\PETALPATH_app_v2.0\frontend\`. Expo/RN (React 19, zustand, AsyncStorage, @tanstack/react-query v5).
- Backend MUST NOT be modified (all phases). Rule 13: ≤15 files/phase. Rule 24–27: no `any`/`ts-ignore`/unsafe casts.
- Single cache architecture = React Query (QueryProvider). Feature data = Zustand stores (childStore, progressStore, rewardsStore, roadmapStore). Reuse shared components: ScreenContainer, AppCard, AppButton, LoadingSpinner, ErrorState, EmptyState; helpers: `toUserMessage` (api/errors), `useApi`/api client (api/client.ts).
- Recommendation endpoint (verified, real): `GET /learner/:childId/recommendation` → `{ success, data: LearnerRecommendation, meta:{generatedAt} }`. `data` is a SINGLE object: `{ kind, skillId(null), sessionPlanId(null), activityType(string e.g. "VIDEO"), optimalSessionDurationMin(number), reasonCode(string), reasonText(string), confidence(number 0..1), ttlSec(number), computedAt(ISO) }`. No Phase-1 action endpoint → Recommendations screen is info-only (no action button).

## Work State
### Completed
- Phase 2.2: `isValidEmail` in `src/auth/index.ts`; `LoginScreen.tsx` + `RegisterScreen.tsx` UX parity (password toggle, validation, `useMutation`, `toUserMessage`, a11y); logout in `ProfileMobile.tsx`/`ProfileTablet.tsx` clears React Query cache. tsc+export pass.
- Phase 2.3: Verified child management already exists (ChildSelectionScreen, AddEditChildScreen, childStore, api/children.ts; backend children CRUD + select-child). No changes. tsc+export pass.
- Phase 2.4: Created `src/screens/dashboard/ParentDashboardScreen.tsx`; repointed `RootNavigator.tsx` (`Home`→dashboard, `Journey`→garden HomeScreen). Uses Zustand stores. tsc+export pass.
- Phase 2.5: Extended `HomeMobile.tsx`/`HomeTablet.tsx`/`HomeDesktop.tsx` with ErrorState, EmptyState, RefreshControl, useFocusEffect, `toUserMessage`; reused roadmapStore.error. tsc+export pass.
- Phase 2.6 (AI Recommendations): Created `src/api/recommendations.ts` (typed `getRecommendation`); `src/screens/recommendations/RecommendationsScreen.tsx` (React Query `useQuery` key `['recommendation', childId]`, loading/error/empty/refresh/focus-refresh, info-only card); added `Recommendations` route to both RootNavigator stacks; added "Recommendations" quick-action tile in ParentDashboardScreen. tsc+export pass.
- Phase 2.8 (Parent Profile & Settings): Extended `src/screens/profile/ProfileMobile.tsx` and `ProfileTablet.tsx` (Desktop reuses Tablet). Added real-data **parent initials avatar** (derived from `user.name`), a **role label**, and static **Privacy / About / Help & Support** cards. Existing Account (name/email), sound/music/voice prefs, Children Profiles, and Logout already present. Notifications/Theme/change-password/language/delete-account deferred (no backend). tsc+export pass.
- Phase 2.9 (Offline & UX Polish): NEW `src/hooks/useNetworkStatus.ts` (dependency-free web online/offline detection; native assumes online). NEW `src/components/common/OfflineBanner.tsx` (global, memoized, uses existing `checkServerHealth()` for Retry → `queryClient.refetchQueries`). Wired into `src/providers/AppProviders.tsx` (returns null when online → zero layout impact). Added accessibility (`accessibilityRole`/`accessibilityLabel`/`accessibilityHint`/`accessibilityLiveRegion`) to `ErrorState.tsx`, `EmptyState.tsx`, `LoadingSpinner.tsx` for consistent SR support. tsc+export pass.
- Phase 2.10 (Final Hardening): Removed DEBUG-only `console.log` blocks + obsolete `// DEBUG ONLY` comments from `config/api.ts` and `api/health.ts` (behavior unchanged). Deleted unused deprecated shims `config/env.ts` and `utils/api.ts` (verified zero references + no barrels). Audit of navigation (all registered routes resolve; export succeeds), React Query (single QueryClient, consistent retry/4xx + staleTime 1m/gcTime 5m, one useQuery key `['recommendation', childId]`), and Zustand (clear per-domain stores, no duplicates) — all clean. tsc+export pass.

### Active
- (none)

### Blocked
- Assessment Center (Phase 2.6 first attempt): no functional backend endpoint (`/questionnaires` returns 501 stub; no `/assessments` route). Deferred per Rule 33.
- Phase 2.7 Notifications & Communication: **DEFERRED** — backend exposes NO notifications capability. Verified: no `notifications`/`alerts`/`inbox`/`messages` router, controller, service, DTO, validator, or Prisma model exists anywhere in `backend/` (only node_modules mentions). Frontend has no existing notification screen to extend. Per Rules 5/16/34, no fake UI was built.

## Next Move
1. (none pending) All implementable user-story phases done.
2. If Assessment Center is needed, backend must first provide an endpoint (currently 501).
3. Run `npx tsc --noEmit` + `npx expo export --platform web` after any future change.

## Relevant Files
- `D:\petalpath\PETALPATH_app_v2.0\backend\dist\modules\learner\learner.routes.js` / `learner.controller.js` / `learner-facade.service.js` — recommendation endpoint contract (read-only verification).
- `D:\petalpath\PETALPATH_app_v2.0\frontend\src\api\recommendations.ts` — new typed API client for recommendations.
- `D:\petalpath\PETALPATH_app_v2.0\frontend\src\screens\recommendations\RecommendationsScreen.tsx` — new Recommendations screen.
- `D:\petalpath\PETALPATH_app_v2.0\frontend\src\navigation\RootNavigator.tsx` — added `Recommendations` route (mobile + tablet/desktop stacks).
- `D:\petalpath\PETALPATH_app_v2.0\frontend\src\screens\dashboard\ParentDashboardScreen.tsx` — added "Recommendations" quick-action tile.
- `D:\petalpath\PETALPATH_app_v2.0\frontend\src\store\childStore.ts` — `activeChild` provides `:childId`.
- `D:\petalpath\PETALPATH_app_v2.0\frontend\src\providers\QueryProvider.tsx` — React Query cache (reused for recommendations).
