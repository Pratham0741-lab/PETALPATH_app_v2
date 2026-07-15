# PetalPath Architecture Overview

## Application Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | React Native (Expo) | SDK 56 / React 19.2 |
| Navigation | @react-navigation/native-stack + bottom-tabs | 7.x |
| State (Server) | @tanstack/react-query | 5.x |
| State (UI) | Zustand | 5.x |
| HTTP Client | Custom ApiClient (fetch-based) | — |
| Backend Runtime | Node.js + Express | 4.x / 22.x |
| ORM | Prisma | 5.x |
| Validation | Zod | 3.x |
| Auth | JWT (jsonwebtoken) + refresh token rotation | — |
| Audio Guides | expo-audio | 56.x |
| Drawing | react-native-svg + PanResponder | 15.x |
| Speech | expo-speech-recognition | 56.x |

---

## Repository Structure

```
PETALPATH_app_v2.0/
├── frontend/                         # Expo/React Native app
│   └── src/
│       ├── api/                      # HTTP client + typed API modules (17 files)
│       │   ├── client.ts             # ApiClient (fetch, JWT, refresh, timeout)
│       │   ├── errors.ts             # ApiError class + toUserMessage
│       │   ├── index.ts              # Barrel re-exports
│       │   ├── health.ts
│       │   ├── auth.ts               # POST /auth/*
│       │   ├── children.ts           # CRUD /children
│       │   ├── roadmap.ts            # GET /roadmap, /lessons, /activities
│       │   ├── progress.ts           # GET /progress/overview, POST /progress/complete
│       │   ├── rewards.ts            # GET /rewards, /stickers, /badges
│       │   ├── mentors.ts            # GET /mentors
│       │   ├── media.ts              # Video/audio/listen/speak/write progress
│       │   ├── curriculum.ts         # GET /curriculum, /available, POST /activate
│       │   ├── assessments.ts        # Assessment CRUD + attempts
│       │   ├── analytics.ts          # Analytics dashboards
│       │   ├── notifications.ts      # Notification CRUD
│       │   ├── sessions.ts           # Session lifecycle
│       │   └── recommendations.ts    # GET /learner/:childId/recommendation
│       ├── auth/                     # Auth helpers
│       │   └── index.ts              # isValidEmail
│       ├── components/               # Reusable UI (39 files, 40 components)
│       │   ├── buttons/              # AppButton, PrimaryButton, SecondaryButton
│       │   ├── canvas/               # TracingCanvas (write activity)
│       │   ├── cards/                # AppCard, LessonNode, AvatarCard, RewardCard, etc.
│       │   ├── common/               # ScreenContainer, LoadingSpinner, ErrorState, EmptyState, OfflineBanner
│       │   ├── navigation/           # TopBar, SidebarNavigation, BottomNavigation
│       │   ├── notifications/        # NotificationBell
│       │   ├── progress/             # ProgressBar, StarCounter, VideoProgressBar
│       │   ├── tutorial/             # NavigationGuide, HandPointer, TutorialBubble, etc.
│       │   └── ui/                   # Card, Button, Chip, Avatar, Badge, StatCard, etc.
│       ├── config/                   # api.ts (API_URL, IS_DEV)
│       ├── constants/                # mentors.ts, audioGuideMap.ts
│       ├── hooks/                    # Custom hooks (12 files)
│       │   ├── useAnalytics.ts       # React Query — analytics dashboards
│       │   ├── useApi.ts             # Returns api client instance
│       │   ├── useAppNavigation.ts   # Navigation helpers
│       │   ├── useAssessments.ts     # React Query — assessment CRUD + attempts
│       │   ├── useAuth.ts            # Auth context consumer
│       │   ├── useCurriculum.ts      # React Query — curriculum + skills
│       │   ├── useDeviceType.ts      # mobile/tablet/desktop detection
│       │   ├── useHandPointerAnimation.ts  # Tutorial hand animation
│       │   ├── useInactivityTimer.ts # Tutorial inactivity detection
│       │   ├── useLoading.ts         # Boolean loading state
│       │   ├── useNetworkStatus.ts   # Online/offline detection
│       │   └── useNotifications.ts   # React Query — notification list + mutations
│       ├── navigation/               # RootNavigator.tsx, navigationRef.ts
│       ├── providers/                # AppProviders, QueryProvider, AuthProvider
│       ├── screens/                  # 18 screen groups (35+ screens)
│       ├── services/                 # audioGuideService.ts
│       ├── store/                    # 11 Zustand stores
│       ├── theme/                    # colors, typography, spacing, breakpoints, etc.
│       └── utils/                    # storage, audioPlayer, alert, tracingAccuracy, etc.
│
├── backend/                          # Express/Prisma backend
│   └── src/
│       ├── modules/                  # 30+ domain modules
│       ├── middleware/               # authMiddleware, errorMiddleware
│       ├── routes/                   # Route mounting (33 mount paths)
│       ├── shared/                   # AppError hierarchy, logger
│       ├── tests/                    # 19 integration test files
│       └── utils/                    # JWT utilities
```

---

## Frontend Architecture

### Provider Tree (Mount Order)
```
QueryProvider (TanStack Query)
  └── AuthProvider (session hydration + context)
       └── ErrorBoundary
            └── OfflineBanner (global)
                 └── App Screens
```

### Navigation Architecture

Three navigators based on authentication state and device type:

```
RootNavigator
├── [loadingSession]  → FullScreen Spinner
├── [!token]          → AuthNavigator (Stack)
│                        ├── Login
│                        ├── Register
│                        ├── ForgotPassword
│                        └── ResetPassword
├── [!activeChild]    → ChildSelectionStack (Stack)
│                        ├── ChildSelection
│                        ├── AddChild
│                        └── MentorSelection
├── [mobile]          → MobileStack (Stack)
│                        ├── MainTabs (BottomTabs)
│                        │    ├── Home     → ParentDashboardScreen
│                        │    ├── Journey  → HomeScreen (garden)
│                        │    ├── Mentor   → MentorScreen
│                        │    ├── Rewards  → RewardsScreen
│                        │    └── Profile  → ProfileScreen
│                        ├── LessonOverview
│                        ├── Video / VideoCompleted
│                        ├── Listen / Speak / Write
│                        ├── LessonComplete / ModuleComplete / CategoryComplete
│                        ├── Progress
│                        ├── Stories
│                        ├── ChildSelection / AddChild / MentorSelection
│                        ├── Recommendations
│                        ├── AssessmentCenter / AssessmentSession / AssessmentResult
│                        ├── NotificationCenter
│                        ├── CurriculumExplorer / SkillDetail
│                        └── MentorSelection
└── [tablet/desktop]  → TabletDesktopLayout (Row: Sidebar + Stack)
                         └── Stack (same screens as MobileStack without MainTabs)
                              └── SidebarNavigation on left
```

---

## State Management Strategy

**Two parallel state management systems:**

### 1. React Query — Server State (newer, Phase 4+)
- **Owns**: analytics, assessments, notifications, curriculum/skills, recommendations
- **Query keys**: Scoped arrays with childId where needed
- **Invalidation**: After mutations, related queries are invalidated
- **Config**: `staleTime: 60s`, `gcTime: 300s`, no retry on 4xx, max 2 retries on 5xx/network

### 2. Zustand — UI + Legacy Server State (original architecture)
- **Owns**: app auth, child profiles, roadmap, progress, rewards, mentors, tutorial settings, activity runtimes (video/listen/speak/write)
- **Server state duplicated**: childStore (children list), progressStore (overview), roadmapStore (full roadmap), rewardsStore (stars/stickers/badges), mentorStore (mentor list)
- **Async actions**: Direct fetch() calls via api client (not React Query)
- **Persistence**: Tutorial settings + seen-tutorials + auth tokens via storage abstraction

### Data Flow
```
User Action → Screen Component
  → Zustand Store Action (legacy) → api client → Backend → Zustand setState
  → React Query Hook (new) → api client → Backend → React Query cache
```

---

## Backend Architecture

### Layered Pattern (Controller → Service → Repository → Prisma)

```
routes/index.ts
  └── module.routes.ts
       └── module.controller.ts    # HTTP handlers
            └── module.service.ts  # Business logic
                 └── module.repository.ts  # Prisma queries
                      └── Prisma Client
```

### Error Hierarchy
```
AppError (base)
├── NotFoundError        → 404
├── ValidationError      → 400
├── UnauthorizedError    → 401
├── ForbiddenError       → 403
└── ConflictError        → 409
```

### Auth Flow
1. Register/Login → JWT access token + refresh token
2. Access token in `Authorization: Bearer` header
3. `authMiddleware` → `req.user = { userId, role, childId? }`
4. `assertChildOwnership` middleware for child-scoped routes
5. Token refresh on 401 → automatic rotation
6. Clear session on refresh failure

---

## Major Flows

### Authentication Flow
```
LoginScreen
  → useMutation (inline)
    → authApi.login(email, password)
      → POST /auth/login
        → { success, data: { token, refreshToken, user } }
    → appStore.setSession(data) → persists to storage
    → Navigate to ChildSelection or Dashboard
```

### Child Selection Flow
```
ChildSelectionScreen
  → childStore.refreshChildren()
    → GET /children → update childrenList
  → Select child
    → childStore.setActiveChild(child)
      → POST /auth/select-child → new token with childId claim
      → rewardsStore.refreshRewards() + progressStore.refreshProgress()
      → Navigate to Dashboard
```

### Learning Flow
```
HomeScreen (garden) → select category
  → roadmapStore.expandCategory()
  → Select lesson → LessonOverviewScreen
    → Select activity → VideoScreen / ListenScreen / SpeakScreen / WriteScreen
      → Complete activity → POST /x-progress/complete
      → LessonCompleteScreen
        → ModuleCompleteScreen → CategoryCompleteScreen
```

### Assessment Flow
```
AssessmentCenterScreen
  → useAssessmentsList() → React Query
    → GET /assessments → assessment list
    → GET /assessments/:childId/attempts → attempt history
  → Start attempt
    → useCreateAttempt() → mutation
      → POST /assessments/:childId/attempts
  → AssessmentSessionScreen → answer questions
    → useSubmitAttempt() → mutation
      → POST /assessments/:childId/attempts/:id/submit
  → AssessmentResultScreen → show score
```

### Analytics Flow
```
Progress/Recommendations screens
  → useAnalyticsOverview() / useAnalyticsActivity() / useAnalyticsProgress()
    → React Query (staleTime: 60s)
      → GET /analytics/overview, /analytics/activity, /analytics/progress
```

### Curriculum Flow
```
CurriculumExplorerScreen
  → useCurriculum() → React Query
    → GET /curriculum
  → Select skill → SkillDetailScreen
    → useSubjectCurriculum(subjectId) → React Query
      → GET /curriculum/subject/:subjectId
    → Activate skill → useActivateSkill() → mutation
      → POST /curriculum/activate
```

### Notification Flow
```
NotificationCenterScreen
  → useNotifications(page) → React Query (staleTime: 60s)
    → GET /notifications?page=&limit=20
  → NotificationBell (in TopBar)
    → useUnreadCount() → React Query (refetchInterval: 30s)
      → GET /notifications/unread-count
  → Mark read → useMarkRead() → mutation
    → PATCH /notifications/:id/read
```

### Rewards Flow
```
RewardsScreen
  → rewardsStore.refreshRewards()
    → GET /rewards + /rewards/stickers + /rewards/badges
  → StarCounter (in TopBar) → useRewardsStore → totalStars
```

### Mentor Flow
```
MentorScreen / MentorSelectionScreen
  → mentorStore.refreshMentors()
    → GET /mentors
  → Select mentor
    → appStore.setMentor(mentorId)
```

---

## Key Architectural Decisions

| Decision | Rationale |
|---|---|
| Dual state (Zustand + React Query) | Legacy pre-dates React Query; migration deferred |
| Custom fetch-based ApiClient | No axios dependency; full control over JWT refresh |
| No offline-first architecture | Backend required for all operations; OfflineBanner for connectivity feedback |
| EmptyState/ErrorState per screen | Consistent UX; every async screen handles all states |
| tablet/desktop = single code path | Same screens, same navigation stack, only layout differs (Sidebar vs BottomTabs) |
| `as any` casts in route handlers | Codebase convention (Express type mismatch with AuthenticatedRequest) |
