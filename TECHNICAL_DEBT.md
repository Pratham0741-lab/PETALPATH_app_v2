# Technical Debt Report

## Intentional Tradeoffs

| # | Area | Decision | Rationale |
|---|---|---|---|
| 1 | State Management | Dual system (Zustand + React Query) | Zustand predates React Query in this project; migration would be a full-phase effort |
| 2 | Navigation typing | `as any` casts in route handlers | Express `Request` type incompatible with `AuthenticatedRequest` — codebase convention |
| 3 | Backend versioning | Multiple v1 aliases (`/api/curriculum` + `/api/v1/curriculum`) | Legacy paths preserved for backward compatibility |
| 4 | Auth token storage | Zustand in-memory + storage abstraction | Sync access via `getState()` needed for ApiClient; AsyncStorage used for persistence |
| 5 | No `staleTime` per-query overrides | All queries use default 60s, no granular tuning | Acceptable for MVP; can optimize per endpoint later |

---

## Backend Limitations

| # | Limitation | Impact | Fix Priority |
|---|---|---|---|
| 1 | **Stories module**: All 5 endpoints return 501 Not Implemented | StoriesScreen shows empty data | High (needs backend implementation) |
| 2 | **Users module**: All 5 endpoints return 501 Not Implemented | No user CRUD from frontend | Low (auth covers user operations) |
| 3 | **Categories/Modules/Lessons/Activities**: No auth on CRUD endpoints | Admin operations unprotected | Medium (internal tooling needed) |
| 4 | **Test database**: PostgreSQL requires local instance, no CI connection available | Tests cannot run in CI without DB | High (needs CI database setup) |
| 5 | **Prisma migrations**: Schema gaps existed (assessments, notifications) | Required migration to add new models | Low (already migrated in Phase 3.4) |
| 6 | **No pagination on list endpoints**: Most lists return all records | Performance concerns at scale | Medium |

---

## Frontend Limitations

| # | Limitation | Impact | Fix Priority |
|---|---|---|---|
| 1 | **Offline sync**: Not implemented (no offline-first architecture) | App requires network connectivity | Medium (feature request) |
| 2 | **Push notifications**: Not implemented (backend has notifications API but no push delivery) | Users must open app to see notifications | Medium |
| 3 | **Localization (i18n)**: English-only | Non-English users excluded | Low |
| 4 | **Dynamic theme switching**: No dark mode / theme customization | Fixed light theme | Low |
| 5 | **Accessibility gaps**: Basic a11y added (roles, labels) but not comprehensive | Limited screen reader experience | Medium |
| 6 | **Speech verification**: `expo-speech-recognition` used but speech evaluation is placeholder | No real speech accuracy assessment | Medium |
| 7 | **Performance**: FlatList with few optimizations (no `getItemLayout` on all lists, no `useMemo` everywhere) | Potential scroll jank on large datasets | Low |
| 8 | **Error boundary granularity**: One global ErrorBoundary | One crashed section could take down entire app | Medium (add per-screen boundaries) |
| 9 | **No animation/transition system**: Only basic fade/slide | Basic UX feel | Low |
| 10 | **No image caching strategy**: Thumbnails fetched raw | Bandwidth usage | Low |

---

## Known Postponed Work

| # | Item | Reason Postponed | Target Phase |
|---|---|---|---|
| 1 | **Real curriculum content** (skills, subjects, dependencies) | Needs content team input | Phase 5+ |
| 2 | **Assessment question pool** | Needs content team + psychometric validation | Phase 5+ |
| 3 | **Mentor AI conversation** | Requires LLM integration | Phase 6 |
| 4 | **Multi-language support** | Requires i18n framework + translations | Phase 7 |
| 5 | **Parent communication features** (in-app chat, teacher connect) | Requires real-time infrastructure | Phase 8 |
| 6 | **Gamification expansion** (leaderboards, challenges) | Requires social infrastructure | Phase 9 |
| 7 | **Adaptive difficulty engine** (backend exists, frontend integration pending) | Backend APIs ready but no frontend consumption | Phase 4.x |
| 8 | **Session planner frontend** (backend ready with 18 endpoints) | No frontend screen consumes session APIs | Phase 5 |
| 9 | **`recommendations.ts` not in barrel** | Needs barrel re-export addition | Small fix |
| 10 | **Zustand → React Query migration** | Large refactoring effort | Phase 10+ |

---

## Future Improvements (Not Blockers)

| # | Improvement | Benefit |
|---|---|---|
| 1 | Per-query `staleTime` tuning (e.g., curriculum = 5min, notifications = 30s) | Reduced network requests |
| 2 | Pagination on all list endpoints | Scale to thousands of records |
| 3 | React Query `placeholderData` / `keepPreviousData` | Smoother pagination UX |
| 4 | Optimistic updates on mutations | Instant UI feedback |
| 5 | Comprehensive E2E testing (Detox/Playwright) | Regression prevention |
| 6 | Sentry/crash reporting integration | Production monitoring |
| 7 | Code splitting / lazy loading screens | Faster initial bundle |
| 8 | Service worker / PWA for web | Offline capability |
| 9 | Expo Updates (OTA) for instant fixes | Faster iteration |
| 10 | Storybook for component development | Developer productivity |

---

## State Duplication Inventory

| Duplicate | Locations | Severity | Notes |
|---|---|---|---|
| `stars`/`totalStars` | `appStore.stars` + `rewardsStore.totalStars` | Medium | Pre-existing; both write to same value via `rewardsStore.setState` |
| Progress % | `progressStore.completionPercentage` + `useAnalyticsProgress()` | Low | Different endpoints (`/progress/overview` vs `/analytics/progress`) |
| Rewards data | `rewardsStore` + `useAnalyticsRewards()` | Low | Different endpoints (`/rewards` vs `/analytics/rewards`) |
| Curriculum data | `roadmapStore` (lesson tree) + `useCurriculum()` (skill tree) | Low | Different data models; no identical endpoint overlap |
| `lives: 3` | 3 activity stores (listen, speak, write) | Low | Dead state — no consumers read or write it |

---

## Architectural Observations

```
Zustand (legacy, 11 stores)
  → Owns: auth, children, roadmap, progress, rewards, mentors, activities (video/audio/speak/write), tutorial
  → Pattern: store.action() → fetch → store.setState()
  → Issue: Server state cached in Zustand, no built-in deduplication or cache invalidation

React Query (new, 5 hook files)
  → Owns: analytics, assessments, notifications, curriculum, recommendations
  → Pattern: useQuery(key, fetcher) → automatic cache + staleness
  → Issue: No migration plan for legacy Zustand stores
```

The project has two complete, independent state management systems. Data flows through separate paths with no cross-system invalidation. This is the single largest architectural debt item.
