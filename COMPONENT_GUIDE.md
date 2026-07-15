# Reusable Component Catalog

**Total: 40 components across 39 files**

---

## buttons/ (3 components)

### AppButton
| Property | Value |
|---|---|
| **File** | `frontend/src/components/buttons/AppButton.tsx` |
| **Purpose** | Core reusable button with press feedback, loading spinner, icon slot, 6 color variants |
| **Props** | `label`, `onPress`, `variant?` (primary/secondary/accent/success/reward/danger), `disabled?`, `loading?`, `style?`, `labelStyle?`, `icon?` |
| **Used by** | 17 screens (auth, assessment, curriculum, dashboard, lesson, mentor, notifications, profile, video) |

### PrimaryButton
| Property | Value |
|---|---|
| **File** | `frontend/src/components/buttons/PrimaryButton.tsx` |
| **Purpose** | Wrapper around AppButton with `variant="primary"` |
| **Used by** | Not directly imported; convention-based usage |

### SecondaryButton
| Property | Value |
|---|---|
| **File** | `frontend/src/components/buttons/SecondaryButton.tsx` |
| **Purpose** | Wrapper around AppButton with `variant="secondary"` |
| **Used by** | Not directly imported; convention-based usage |

---

## canvas/ (1 component)

### TracingCanvas
| Property | Value |
|---|---|
| **File** | `frontend/src/components/canvas/TracingCanvas.tsx` |
| **Purpose** | Drawing canvas for Write activity — guide shapes, user strokes, toolbar (Undo/Clear/Check) |
| **Props** | `guideName`, `strokes`, `onAddStroke`, `onUndo`, `onClear`, `onComplete`, `isCompleted` |
| **Used by** | WriteDesktop, WriteMobile, WriteTablet |

---

## cards/ (11 components)

### AppCard
| Property | Value |
|---|---|
| **File** | `frontend/src/components/cards/AppCard.tsx` |
| **Purpose** | Base card container — surface background, rounded corners, shadow, optional pressable |
| **Props** | `children`, `style?`, `onPress?`, `outlined?` |
| **Used by** | 12 screens (assessment, curriculum, dashboard, profile, mentor, recommendations, video) |

### ActivityCard
| Property | Value |
|---|---|
| **File** | `frontend/src/components/cards/ActivityCard.tsx` |
| **Purpose** | Activity display — icon badge (color-coded by type), title, duration, lock state |
| **Used by** | LessonOverview screens (desktop/mobile/tablet) |

### AnimatedCard
| Property | Value |
|---|---|
| **File** | `frontend/src/components/cards/AnimatedCard.tsx` |
| **Purpose** | Entry animation wrapper (fade + slide-up) around AppCard, with stagger delay |
| **Used by** | Not yet imported externally (available for future use) |

### AvatarCard
| Property | Value |
|---|---|
| **File** | `frontend/src/components/cards/AvatarCard.tsx` |
| **Purpose** | Mentor/avatar card — colored circle, paw icon, name, species, fun fact, selected state |
| **Used by** | 12 screens (journey, lesson overview, listen, mentor, speak, write) |

### CategoryCard
| Property | Value |
|---|---|
| **File** | `frontend/src/components/cards/CategoryCard.tsx` |
| **Purpose** | Category display — colored left border, themed icon, title, description |
| **Used by** | Internal (expected usage in home/curriculum screens via barrel) |

### ContinueLearningCard
| Property | Value |
|---|---|
| **File** | `frontend/src/components/cards/ContinueLearningCard.tsx` |
| **Purpose** | Premium navy-themed card — "Continue Learning" with progress bar + play button |
| **Used by** | Internal (expected usage in home screen components) |

### LessonCard
| Property | Value |
|---|---|
| **File** | `frontend/src/components/cards/LessonCard.tsx` |
| **Purpose** | Lesson display — status (completed/in_progress/locked), subtitle, progress bar, star count |
| **Used by** | Internal |

### LessonNode
| Property | Value |
|---|---|
| **File** | `frontend/src/components/cards/LessonNode.tsx` |
| **Purpose** | Journey screen lesson node — lock/complete state, difficulty badge, title, chevron |
| **Used by** | JourneyDesktop, JourneyTablet, JourneyMobile |

### ResumeCard
| Property | Value |
|---|---|
| **File** | `frontend/src/components/cards/ResumeCard.tsx` |
| **Purpose** | "Continue Watching" card — video thumbnail, play button, remaining time |
| **Used by** | Internal |

### RewardCard
| Property | Value |
|---|---|
| **File** | `frontend/src/components/cards/RewardCard.tsx` |
| **Purpose** | Reward/achievement — trophy/lock icon, title, description, star value badge |
| **Used by** | RewardsDesktop, RewardsMobile, RewardsTablet |

### VideoCard
| Property | Value |
|---|---|
| **File** | `frontend/src/components/cards/VideoCard.tsx` |
| **Purpose** | Video thumbnail — play overlay, duration badge, completed checkmark |
| **Used by** | Internal |

---

## common/ (7 components)

### ScreenContainer
| Property | Value |
|---|---|
| **File** | `frontend/src/components/common/ScreenContainer.tsx` |
| **Purpose** | Standard screen wrapper — SafeAreaView, StatusBar, interaction tracking for tutorial |
| **Props** | `children`, `style?` |
| **Used by** | 35+ screens (virtually every screen) |

### LoadingSpinner / FullPageLoader
| Property | Value |
|---|---|
| **File** | `frontend/src/components/common/LoadingSpinner.tsx` |
| **Purpose** | Configurable inline spinner (`LoadingSpinner`) + centered full-screen loader (`FullPageLoader`) |
| **Used by** | 10 screens (assessment, curriculum, dashboard, notifications, progress, recommendations, stories) |

### ErrorState / NetworkError
| Property | Value |
|---|---|
| **File** | `frontend/src/components/common/ErrorState.tsx` |
| **Purpose** | Generic error display with emoji, title, message, retry button (`ErrorState`), plus pre-filled connectivity variant (`NetworkError`) |
| **Used by** | 12 screens (assessment, curriculum, dashboard, home, notifications, progress, recommendations) |

### EmptyState
| Property | Value |
|---|---|
| **File** | `frontend/src/components/common/EmptyState.tsx` |
| **Purpose** | Placeholder with icon emoji, title, message for empty lists/sections |
| **Used by** | 10 screens (assessment, curriculum, dashboard, home, notifications, progress, recommendations, stories) |

### ErrorBoundary
| Property | Value |
|---|---|
| **File** | `frontend/src/components/common/ErrorBoundary.tsx` |
| **Purpose** | React error boundary with friendly fallback, "Try Again" reset, component stack in dev |
| **Used by** | AppProviders (wraps entire app) |

### OfflineBanner
| Property | Value |
|---|---|
| **File** | `frontend/src/components/common/OfflineBanner.tsx` |
| **Purpose** | Global amber offline bar — shows/hides based on network, Retry button re-checks server + refreshes RQ cache |
| **Used by** | AppProviders (persistent overlay) |

### SectionHeader
| Property | Value |
|---|---|
| **File** | `frontend/src/components/common/SectionHeader.tsx` |
| **Purpose** | Section title + optional subtitle + optional right element |
| **Used by** | ProfileMobile, ProfileTablet |

---

## navigation/ (3 components)

### TopBar
| Property | Value |
|---|---|
| **File** | `frontend/src/components/navigation/TopBar.tsx` |
| **Purpose** | Top navigation bar — title, back button, mentor indicator, notification bell, star counter |
| **Props** | `title`, `showBack?`, `style?` |
| **Used by** | 21 screens (curriculum, journey, lesson, listen, mentor, notifications, profile, progress, rewards, speak, stories, write) |

### SidebarNavigation
| Property | Value |
|---|---|
| **File** | `frontend/src/components/navigation/SidebarNavigation.tsx` |
| **Purpose** | Persistent sidebar — logo, 5 tabs (Roadmap/Explore/Garden/Progress/Profile), mentor footer |
| **Used by** | RootNavigator (tablet/desktop layout) |

### BottomNavigation
| Property | Value |
|---|---|
| **File** | `frontend/src/components/navigation/BottomNavigation.tsx` |
| **Purpose** | Phone bottom tab bar — 5 tabs with press feedback, active/inactive styling |
| **Used by** | RootNavigator (mobile MainTabs tabBar) |

---

## notifications/ (1 component)

### NotificationBell
| Property | Value |
|---|---|
| **File** | `frontend/src/components/notifications/NotificationBell.tsx` |
| **Purpose** | Bell icon with unread count badge (99+ cap) — navigates to NotificationCenter |
| **Used by** | ParentDashboardScreen, TopBar (indirectly ~20+ screens) |

---

## progress/ (3 components)

### ProgressBar
| Property | Value |
|---|---|
| **File** | `frontend/src/components/progress/ProgressBar.tsx` |
| **Purpose** | Animated progress bar — configurable height, color, track color (0-1 normalized) |
| **Used by** | SkillDetailScreen, LessonCard (internal) |

### StarCounter
| Property | Value |
|---|---|
| **File** | `frontend/src/components/progress/StarCounter.tsx` |
| **Purpose** | Compact star badge pill — reads totalStars from rewardsStore |
| **Used by** | TopBar (indirectly ~20+ screens) |

### VideoProgressBar
| Property | Value |
|---|---|
| **File** | `frontend/src/components/progress/VideoProgressBar.tsx` |
| **Purpose** | Interactive video seek bar — time display, percentage, clickable track, draggable thumb |
| **Used by** | Internal (video player screens) |

---

## tutorial/ (7 components + barrel)

### NavigationGuide
| Property | Value |
|---|---|
| **File** | `frontend/src/components/tutorial/NavigationGuide.tsx` |
| **Purpose** | Orchestrator — composes TutorialBubble + AudioGuideButton + HandPointer, handles first-time playback and inactivity recovery |
| **Used by** | 11 screens (home, lesson complete, listen, speak, video, write) |

### AudioGuideButton
| Property | Value |
|---|---|
| **File** | `frontend/src/components/tutorial/AudioGuideButton.tsx` |
| **Purpose** | Floating speaker icon — replays tutorial audio, pulse animation while playing |
| **Used by** | NavigationGuide (indirect) |

### HandPointer
| Property | Value |
|---|---|
| **File** | `frontend/src/components/tutorial/HandPointer.tsx` |
| **Purpose** | White cartoon finger — supports tap/bounce/move animations, respects reduceMotion |
| **Used by** | NavigationGuide (indirect) |

### TutorialBubble
| Property | Value |
|---|---|
| **File** | `frontend/src/components/tutorial/TutorialBubble.tsx` |
| **Purpose** | Speech bubble — instruction text near mentor avatar, fade-in/out, triangle pointer |
| **Used by** | NavigationGuide (indirect) |

### GlowTarget
| Property | Value |
|---|---|
| **File** | `frontend/src/components/tutorial/GlowTarget.tsx` |
| **Purpose** | Pulsing border glow ring to highlight elements during tutorials |
| **Used by** | ModuleNode (home components) |

### GhostTracer
| Property | Value |
|---|---|
| **File** | `frontend/src/components/tutorial/GhostTracer.tsx` |
| **Purpose** | Animated dashed SVG path preview for Write activity — sparkle dot follower |
| **Used by** | Internal (write activity) |

### SpotlightOverlay
| Property | Value |
|---|---|
| **File** | `frontend/src/components/tutorial/SpotlightOverlay.tsx` |
| **Purpose** | Full-screen dark overlay with transparent cutout for focus |
| **Used by** | Internal |

---

## ui/ (11 components in 1 barrel file)

| Component | Purpose |
|---|---|
| `Card` | Generic card container |
| `Button` | Configurable pressable button |
| `Chip` | Toggleable filter chip |
| `Avatar` | Circular image or placeholder |
| `ProgressBar` | Simple progress bar (0-100%) |
| `Badge` | Colored pill label |
| `StatCard` | Icon + value + title stats display |
| `IllustrationCard` | Image + title card |
| `SectionHeader` | Section title + subtitle |
| `SearchBar` | Search input with magnifying glass |
| `EmotionCard` | Emoji + label pressable card |

**Used by**: Journey screens, LessonOverview, LessonComplete, ModuleComplete, Mentor, Progress, Video, Rewards, Stories, Assessment

---

## Component Usage Heatmap

| Component | Auth | Home | Journey | Lesson | Video | Listen | Speak | Write | Progress | Mentor | Rewards | Profile | Assessment | Curriculum | Notifications | Stories | Dashboard | Recommendations |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ScreenContainer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| TopBar | | | ✅ | ✅ | | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | | ✅ | ✅ | ✅ | | |
| AppButton | ✅ | | | | ✅ | | | | | ✅ | | ✅ | ✅ | ✅ | ✅ | | ✅ | |
| AppCard | | | | | ✅ | | | | | ✅ | | ✅ | ✅ | ✅ | | | ✅ | ✅ |
| LoadingSpinner | | | | | | | | | ✅ | | | | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ErrorState | | ✅ | | | | | | | ✅ | | | | ✅ | ✅ | ✅ | | ✅ | ✅ |
| EmptyState | | ✅ | | | | | | | ✅ | | | | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| AvatarCard | | | ✅ | ✅ | | ✅ | ✅ | ✅ | | ✅ | | | | | | | | |
| NavigationGuide | | ✅ | | ✅ | ✅ | ✅ | ✅ | ✅ | | | | | | | | | | |
| RewardCard | | | | | | | | | | | ✅ | | | | | | | |
| LessonNode | | | ✅ | | | | | | | | | | | | | | | |
| NotificationBell | | | | | | | | | | | | | | | | | ✅ | |
| TracingCanvas | | | | | | | | ✅ | | | | | | | | | | |
