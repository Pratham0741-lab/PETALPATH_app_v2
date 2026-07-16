# Release Checklist — PetalPath Frontend (Phase 6.7A Freeze)

> Static-production-hardening release gate. Manual QA tasks are listed for **Phase 6.7B** and are NOT claimed complete here.

## Build & Verification (verified in 6.7A)
- [x] `npx tsc --noEmit` passes (0 errors) — strict mode enabled
- [x] `npx expo export --platform web` succeeds (dist exported)
- [x] No broken imports / no unresolved modules
- [x] Backend frozen — 0 backend files modified

## Authentication
- [x] Login / Register / Forgot / Reset flows present
- [x] `authMiddleware` → `req.user` contract honored; `select-child` wired
- [x] Session hydration (`loadSession`) on app launch
- [ ] Manual: end-to-end login on device/emulator (6.7B)
- [ ] Manual: token refresh on 401 (6.7B)

## Learning (Roadmap / Lessons / Activities)
- [x] Roadmap, Module, Lesson, Activity screens wired to React Query hooks
- [x] Lesson/video/listen/speak/write completion offline-safe (queue + replay)
- [ ] Manual: complete a full lesson on slow/flaky network (6.7B)
- [ ] Manual: verify unlock progression (6.7B)

## Stories
- [x] Story list / detail / reader / completion screens present
- [ ] Manual: read a story end-to-end (6.7B)

## Assessments & Placement
- [x] Assessment center / session / result + placement intro/session/question/result screens
- [x] Calls `/assessments`, `/placement/*` (verified against backend)
- [ ] Manual: complete an assessment (6.7B)

## Analytics / Parent Dashboard
- [x] Dashboard, Analytics, SkillMastery, CurriculumInsights, LearningHistory, Weekly/Monthly reports
- [x] All read `/analytics/*`, `/mastery`, `/learner/*`
- [ ] Manual: verify charts render with real data (6.7B)

## Rewards / Gamification
- [x] Rewards dashboard, badges, achievements, daily challenges, notification prefs
- [x] XP/Level/Coins derived from `totalStars` (no mock data)
- [ ] Manual: earn a badge / level-up animation (6.7B)

## Navigation
- [x] Mobile tab nav + tablet/desktop sidebar; 60+ routes in `RootStackParamList`
- [x] Route param types synchronized (`types/navigation.ts`)
- [ ] Manual: deep-link into AssessmentResult / BadgeDetail (6.7B)

## Offline
- [x] Offline queue + sync manager + `PendingSyncIndicator` + `OfflineBanner`
- [x] Video/listen/speak/write/reading/lesson completion offline-safe
- [ ] Manual: airplane mode → complete activity → reconnect → queue flushes (6.7B)

## Accessibility
- [x] Theme tokens (colors/spacing/typography) centralized; dark/light supported
- [x] LoadingSpinner / ErrorState / EmptyState present on data screens
- [ ] Manual: screen-reader pass (VoiceOver/TalkBack) (6.7B)
- [ ] Manual: dynamic font sizes / contrast (6.7B)

## Performance
- [x] Static: no synchronous blocking on import; React Query caching + staleTime set
- [ ] Manual: cold-start time + memory profile (6.7B)
- [ ] Manual: list virtualization on long roadmaps (6.7B)

## Security
- [x] Auth token in `expo-secure-store`; no secrets logged
- [x] No `console.log` debug noise in production (dev-gated or removed)
- [ ] Manual: TLS/cert pinning review (6.7B)
- [ ] Manual: pen-test of token storage (6.7B)

## Dark Mode
- [x] Theme supports light/dark via `colors` tokens
- [ ] Manual: toggle dark mode across all screens (6.7B)

## Tablet / Desktop
- [x] `useDeviceType` drives responsive layouts; sidebar for tablet/desktop
- [ ] Manual: landscape + multi-pane layout verification (6.7B)

## Deployment
- [ ] Build `eas build` for iOS / Android (6.7B)
- [ ] Web deploy of `dist/` (6.7B)
- [ ] Env vars / `app.json` review (6.7B)

## Manual QA Checklist (Phase 6.7B entry)
- [ ] Smoke test all 60+ routes on a physical device
- [ ] Offline → online sync replay
- [ ] Dark mode + tablet + desktop layouts
- [ ] Accessibility (screen reader, scaling)
- [ ] Performance profiling
- [ ] Security review of token storage

> Items left unchecked require runtime/device/manual testing and belong to **Phase 6.7B — Manual QA & Release Validation**.
