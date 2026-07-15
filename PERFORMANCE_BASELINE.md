# Performance Baseline — Phase 4 Freeze

Generated: 2026-07-15

---

## Frontend Metrics

| Metric | Value |
|---|---|
| **Total screens** | 35+ (18 screen directories × multiple device variants) |
| **Reusable components** | 40 (39 files across 9 subdirectories) |
| **Custom hooks** | 12 |
| **React Query hooks** | 16 (analytics: 6, assessments: 5, notifications: 4, curriculum: 4 — some shared) |
| **React Query query keys** | 16 unique patterns |
| **Zustand stores** | 11 |
| **API modules** | 16 (17 files including client.ts) |
| **API functions** | 71 |
| **Navigation stacks** | 4 (Auth, ChildSelection, MobileStack, TabletDesktopStack) |
| **Navigation routes** | 30 unique (24 authenticated, 4 auth, 2 shared) |
| **Navigation components** | 4 (BottomNavigation, SidebarNavigation, TopBar, navigationRef) |
| **Provider components** | 3 (QueryProvider, AuthProvider, AppProviders) |
| **Service files** | 1 (audioGuideService.ts) |
| **Utility files** | 7 |
| **Theme files** | 8 |
| **Constants files** | 2 |
| **Config files** | 1 |
| **Expo bundle size (web)** | 846 modules, ~2.1MB JS (index) + 250KB common chunk |
| **Expo bundle time (web)** | 698ms |
| **Bundled assets** | 31 (fonts, images) |
| **TypeScript strictness** | `strict: true` |
| **TypeScript errors** | 0 |

### Code Quality

| Metric | Count |
|---|---|
| `console.log` | 20 (all guarded by `__DEV__` or `IS_DEV`) |
| `console.warn` | 53 (all guarded by `__DEV__`) |
| `console.error` | 8 (guarded by `__DEV__` or ErrorBoundary) |
| `TODO` comments | 0 |
| `FIXME` comments | 0 |
| `@ts-ignore` / `@ts-expect-error` | 0 |
| Mock data in production code | 0 |
| Hardcoded curriculum | 0 |
| `any` in new code | Navigation only (codebase convention) |
| Direct `fetch()` calls (non-test) | 2 (health.ts + client.ts refreshToken — both intentional) |

---

## Backend Metrics

| Metric | Value |
|---|---|
| **Modules** | 30+ domain modules |
| **Unique endpoint definitions** | ~164 |
| **Mounted route paths** | ~210 (including version aliases) |
| **Auth-required endpoints** | ~140 |
| **Integration test files** | 19 |
| **Test factories** | Present (helpers/setup.ts, helpers/factories.ts, helpers/auth.ts) |
| **TypeScript strictness** | `strict: true` |
| **TypeScript errors** | 0 |

### Backend Endpoints by Module

| Module | Endpoints | Auth |
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
| Stories (stubbed) | 5 | ❌ |
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

---

## Build Verification

| Check | Status | Details |
|---|---|---|
| Frontend TypeScript | ✅ PASS | `npx tsc --noEmit` — 0 errors |
| Backend TypeScript | ✅ PASS | `npx tsc --noEmit` — 0 errors |
| Expo Web Export | ✅ PASS | 846 modules, 698ms, `dist/` |
| Backend Unchanged | ✅ PASS | No backend files modified during Phase 4 |
| Console.log in production | ✅ PASS | All guarded by `__DEV__` / `IS_DEV` |
| No mock data | ✅ PASS | All screens use real API endpoints |
| No TODO/FIXME | ✅ PASS | 0 occurrences |
