# Navigation Architecture

## Navigator Tree

```
App
│
├── [Session Loading]
│   └── FullScreen ActivityIndicator (dark background)
│
├── [Not Authenticated] → AuthNavigator (Stack, headerShown: false)
│   ├── "Login"           → LoginScreen
│   ├── "Register"        → RegisterScreen
│   ├── "ForgotPassword"  → ForgotPasswordScreen
│   └── "ResetPassword"   → ResetPasswordScreen
│
├── [Authenticated, No Active Child] → ChildSelectionStack (Stack)
│   ├── "ChildSelection"  → ChildSelectionScreen
│   ├── "AddChild"        → AddEditChildScreen
│   └── "MentorSelection" → MentorSelectionScreen
│
├── [Authenticated, Active Child, deviceType === 'mobile'] → MobileStack (Stack)
│   ├── "MainTabs" → MobileTabs (BottomTabNavigator, tabBar: BottomNavigation)
│   │   ├── "Home"    → ParentDashboardScreen
│   │   ├── "Journey" → HomeScreen (garden)
│   │   ├── "Mentor"  → MentorScreen
│   │   ├── "Rewards" → RewardsScreen
│   │   └── "Profile" → ProfileScreen
│   │
│   ├── "LessonOverview"    → LessonOverviewScreen
│   ├── "Video"             → VideoScreen
│   ├── "VideoCompleted"    → VideoCompletedScreen
│   ├── "Listen"            → ListenScreen
│   ├── "Speak"             → SpeakScreen
│   ├── "Write"             → WriteScreen
│   ├── "LessonComplete"    → LessonCompleteScreen
│   ├── "ModuleComplete"    → ModuleCompleteScreen
│   ├── "CategoryComplete"  → CategoryCompleteScreen
│   ├── "Progress"          → ProgressScreen (analytics dashboard)
│   ├── "Stories"           → StoriesScreen
│   ├── "ChildSelection"    → ChildSelectionScreen (re-auth)
│   ├── "AddChild"          → AddEditChildScreen
│   ├── "MentorSelection"   → MentorSelectionScreen
│   ├── "Recommendations"   → RecommendationsScreen
│   ├── "AssessmentCenter"  → AssessmentCenterScreen
│   ├── "AssessmentSession" → AssessmentSessionScreen
│   ├── "AssessmentResult"  → AssessmentResultScreen
│   ├── "NotificationCenter"→ NotificationCenterScreen
│   ├── "CurriculumExplorer"→ CurriculumExplorerScreen
│   └── "SkillDetail"       → SkillDetailScreen
│
└── [Authenticated, Active Child, deviceType === 'tablet' | 'desktop'] → TabletDesktopLayout
    ├── Side: SidebarNavigation (persistent, tabs: Roadmap/Explore/Garden/Progress/Profile)
    └── Content: TabletDesktopStack (Stack, animation: 'fade')
        ├── "Home"              → ParentDashboardScreen
        ├── "Journey"           → HomeScreen
        ├── "Mentor"            → MentorScreen
        ├── "Rewards"           → RewardsScreen
        ├── "Profile"           → ProfileScreen
        ├── "LessonOverview"    → LessonOverviewScreen
        ├── "Video"             → VideoScreen
        ├── "VideoCompleted"    → VideoCompletedScreen
        ├── "Listen"            → ListenScreen
        ├── "Speak"             → SpeakScreen
        ├── "Write"             → WriteScreen
        ├── "LessonComplete"    → LessonCompleteScreen
        ├── "ModuleComplete"    → ModuleCompleteScreen
        ├── "CategoryComplete"  → CategoryCompleteScreen
        ├── "Progress"          → ProgressScreen
        ├── "Stories"           → StoriesScreen
        ├── "ChildSelection"    → ChildSelectionScreen
        ├── "AddChild"          → AddEditChildScreen
        ├── "MentorSelection"   → MentorSelectionScreen
        ├── "Recommendations"   → RecommendationsScreen
        ├── "AssessmentCenter"  → AssessmentCenterScreen
        ├── "AssessmentSession" → AssessmentSessionScreen
        ├── "AssessmentResult"  → AssessmentResultScreen
        ├── "NotificationCenter"→ NotificationCenterScreen
        ├── "CurriculumExplorer"→ CurriculumExplorerScreen
        └── "SkillDetail"       → SkillDetailScreen
```

---

## Navigation Flow Map

### Auth Flow
```
[Launch]
  → loadSession() → check storage for token
    → [no token] → AuthNavigator
      → Login → [success] → [no child] → ChildSelectionStack
      → Register → [success] → [no child] → ChildSelectionStack
      → ForgotPassword → email sent → back to Login
      → ResetPassword → password reset → back to Login
    → [token found] → [no activeChild] → ChildSelectionStack
    → [token + activeChild] → Main Screen
```

### Dashboard Flow
```
Dashboard (ParentDashboardScreen)
  ├── Quick Actions
  │   ├── Recommendations → RecommendationsScreen
  │   ├── Assessment Center → AssessmentCenterScreen
  │   ├── Child Selection → ChildSelectionScreen
  │   └── Notification Center → NotificationCenterScreen
  │
  └── Active Lesson → Continue Learning → LessonOverviewScreen
```

### Learning Flow
```
HomeScreen (Journey/Garden)
  → Select category → roadmapStore.expandCategory()
  → Select module → roadmapStore.selectModule()
  → Select lesson → roadmapStore.selectLesson() + navigate("LessonOverview")
  → LessonOverviewScreen
    → Select activity
      → "Video" → VideoScreen → VideoCompletedScreen
      → "Listen" → ListenScreen
      → "Speak" → SpeakScreen
      → "Write" → WriteScreen
    → Complete activity
      → LessonCompleteScreen
        → ModuleCompleteScreen (if all lessons done)
          → CategoryCompleteScreen (if all modules done)
            → goBack() to HomeScreen
```

### Assessment Flow
```
Dashboard → "Assessment Center" → AssessmentCenterScreen
  → Select assessment → AssessmentSessionScreen
    → Answer questions → Submit → AssessmentResultScreen
      → goBack() → AssessmentCenterScreen
```

### Curriculum Flow
```
ProgressScreen → "Curriculum Explorer" → CurriculumExplorerScreen
  → Select subject → SkillDetailScreen
    → Activate skill → goBack() → CurriculumExplorerScreen
```

### Notification Flow
```
TopBar NotificationBell → NotificationCenterScreen
  → View notifications → Mark read / Delete
    → goBack() → Previous screen
```

### Profile Flow
```
ProfileScreen
  ├── Account (name/email)
  ├── Sound/Music/Voice preferences
  ├── Children Profiles → ChildSelectionScreen / AddEditChildScreen
  ├── Mentors → MentorSelectionScreen
  ├── Privacy / About / Help & Support (static)
  └── Logout → clearSession → AuthNavigator
```

---

## Reachability Verification

| Route | Auth | Child | Mobile | Tablet/Desktop | Reachable |
|---|---|---|---|---|---|
| Login | ❌ | ❌ | ❌ | ❌ | ✅ |
| Register | ❌ | ❌ | ❌ | ❌ | ✅ |
| ForgotPassword | ❌ | ❌ | ❌ | ❌ | ✅ |
| ResetPassword | ❌ | ❌ | ❌ | ❌ | ✅ |
| ChildSelection | ✅ | ❌ | ✅ | ✅ | ✅ |
| AddChild | ✅ | ❌ | ✅ | ✅ | ✅ |
| MentorSelection | ✅ | ❌ | ✅ | ✅ | ✅ |
| Home (Dashboard) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Journey | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mentor | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rewards | ✅ | ✅ | ✅ | ✅ | ✅ |
| Profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| LessonOverview | ✅ | ✅ | ✅ | ✅ | ✅ |
| Video | ✅ | ✅ | ✅ | ✅ | ✅ |
| VideoCompleted | ✅ | ✅ | ✅ | ✅ | ✅ |
| Listen | ✅ | ✅ | ✅ | ✅ | ✅ |
| Speak | ✅ | ✅ | ✅ | ✅ | ✅ |
| Write | ✅ | ✅ | ✅ | ✅ | ✅ |
| LessonComplete | ✅ | ✅ | ✅ | ✅ | ✅ |
| ModuleComplete | ✅ | ✅ | ✅ | ✅ | ✅ |
| CategoryComplete | ✅ | ✅ | ✅ | ✅ | ✅ |
| Progress | ✅ | ✅ | ✅ | ✅ | ✅ |
| Stories | ✅ | ✅ | ✅ | ✅ | ✅ |
| Recommendations | ✅ | ✅ | ✅ | ✅ | ✅ |
| AssessmentCenter | ✅ | ✅ | ✅ | ✅ | ✅ |
| AssessmentSession | ✅ | ✅ | ✅ | ✅ | ✅ |
| AssessmentResult | ✅ | ✅ | ✅ | ✅ | ✅ |
| NotificationCenter | ✅ | ✅ | ✅ | ✅ | ✅ |
| CurriculumExplorer | ✅ | ✅ | ✅ | ✅ | ✅ |
| SkillDetail | ✅ | ✅ | ✅ | ✅ | ✅ |

**Total routes: 30 unique (24 authenticated, 4 auth-only, 2 shared)**
**All routes reachable: ✅**
**No orphan screens: ✅**
**No duplicate registrations: ✅**

## Navigation Components

| Component | Purpose | Used In |
|---|---|---|
| `BottomNavigation` | 5-tab bar (Home/Explore/Garden/Progress/Profile) | MobileTabs (tabBar) |
| `SidebarNavigation` | Persistent sidebar with 5 icon+label tabs | Tablet/Desktop layout |
| `TopBar` | Title, back button, mentor indicator, notification bell, star counter | Individual screens |
| `navigationRef` | Imperative navigation (used outside React components) | Standalone |
