# Frontend Architecture — PetalPath

> Last updated: Phase 6.7A (Frontend Freeze). Reflects the frozen production codebase.

## Stack
- React Native + Expo (SDK 56), React 19, TypeScript (strict mode)
- React Navigation v7 (native-stack + bottom-tabs)
- TanStack React Query v5 (server state)
- Zustand v5 (auth / UI / local state)
- React Hook Form + Zod (forms + validation)
- React Native Reanimated / SVG / Gesture Handler
- Axios (legacy `src/api` client) + typed `src/services/api` client (axios-based `apiClient`)

## Layering
```
src/
  api/            Legacy thin API functions (used by hooks: useAnalytics, useAssessments, useCurriculum, useNotifications, useStories)
  services/api/   Typed API services (used by RQ hooks: useLearningQueries, useActivityProgress, useRewards, usePlacement, useIntelligence)
  hooks/          React Query hooks (server state) + UI hooks (device type, responsive, network)
  store/          Zustand stores (auth, child, UI state, optimistic/local mirrors)
  components/     Reusable UI (common, layout, forms, cards, gamification, navigation, canvas)
  screens/        Feature screens (auth, home, lesson, video, listen, speak, write, stories, parent, gamification, placement, assessment)
  navigation/     RootNavigator (auth / onboarding / main stacks; mobile tabs + tablet/desktop sidebar)
  providers/      AppProviders (QueryClient, Auth, Theme, Offline indicator)
  theme/          Design tokens (colors, spacing, typography, radius, shadows)
  utils/          Formatters, storage, audio, offline queue helpers
  types/          Shared types + navigation param lists
```

## State management policy
- **Server state → React Query.** Reads for roadmap, lessons, activities, progress, rewards, mastery, recommendations, assessments, stories, notifications, analytics, placement, intelligence all flow through RQ hooks with centralized `queryKeys`.
- **Zustand → allowed local state only:** authentication/session, active child, UI state (selected module/lesson, expanded category), theme, preferences, onboarding, temporary optimistic mirrors.
- The 7 data stores (`roadmapStore`, `progressStore`, `rewardsStore`, `listenStore`, `speakStore`, `videoStore`, `writeStore`) act as an **optimistic/local mirror + write layer** (optimistic updates then background sync). This is an intentional, frozen hybrid — reads are sourced from React Query; these stores provide instant UI feedback and unlock progression.

## API contract
- Backend is **frozen** (read-only). All frontend endpoints verified in `docs/integration-audit-phase6.7.md`.
- Two API layers coexist by design: legacy `src/api` (namespace exports consumed by older hooks) and typed `src/services/api` (consumed by newer RQ hooks). Both target the same frozen backend.
- Known gap: activity sub-resource endpoints (`/activities/:id/{quiz,game,reading,ai-tutor}`) are referenced by the activity engine but **not implemented on the frozen backend** — they will 404 until the backend adds them. Frontend code is correct against the intended contract.

## Offline layer
- `services/offline/offlineQueue.ts` — AsyncStorage-backed durable queue (cap 200, max 5 attempts).
- `services/offline/syncManager.ts` — flush/replay with backoff; `SyncState` idle|syncing|offline|error.
- `services/offline/offlineMutation.ts` — `runOfflineSafeMutation` (network errors queued, 4xx/5xx surfaced).
- `hooks/useOfflineSync.ts` + `components/common/PendingSyncIndicator.tsx` bridge state to UI.
- Native offline detection relies on per-request errors (NetInfo not installed); web uses `useNetworkStatus`.

## Conventions
- Response shape `{ success, data }`; errors `ApiError` with `toUserMessage`.
- No `console.log` in production (dev-gated via `IS_DEV`/`__DEV__` or the `logger` util).
- Route params typed in `types/navigation.ts`; `RootStackParamList` is the single source of truth.

## Known technical debt (not fixed in freeze)
- ~268 explicit `any` casts remain (strict mode blocks *implicit* any; tsc passes). Concentrated in `audioPlayer`, `speechRecognition`, `client.ts`, video screens.
- `google-signin` is configured in `app.json` but no Google-login UI is wired.
- Dual API layer (legacy + typed) — intentional, not duplicated dead code.

See also: `docs/integration-audit-phase6.7.md`, `docs/RELEASE_CHECKLIST.md`, `docs/FREEZE_REPORT.md`.
