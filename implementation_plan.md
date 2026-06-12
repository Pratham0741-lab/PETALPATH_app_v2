# Implementation Plan - PetalPath Foundation

Build a scalable, clean frontend foundation for PetalPath using React Native, React Native Web, Expo, TypeScript, React Navigation, and Zustand.

## Proposed Architecture & Design Decisions

1. **Responsive System & Layouts**:
   - Create a hook `useDeviceType()` that reads window width from `useWindowDimensions()` and maps it to `mobile`, `tablet`, or `desktop` based on:
     - width < 600px: `mobile`
     - 600px <= width < 1024px: `tablet`
     - width >= 1024px: `desktop`
   - Use a master `ScreenContainer` that takes layouts or dynamically mounts `HomeMobile`/`HomeTablet`/`HomeDesktop`, etc.
   - Implement side-nav/sidebar-nav for tablet/desktop, and custom bottom-nav for mobile.
   - Prevent UI stretching on larger screens (e.g., center-align content with max-widths where appropriate, sidebars on desktop).

2. **Styling & Theme**:
   - Establish a dark theme tailored for children in `src/theme/`.
   - Primary colors: Navy background, Purple accent, Blue accent, Green accent, Yellow stars, Soft white text.
   - Rounded components (`radius.ts`), playful layout (`spacing.ts`), and premium visual shadows (`shadows.ts`).
   - Use pure React Native `StyleSheet` styling referencing these token files. No hardcoded padding, colors, font sizes, or border radii.
   - No emojis. Use basic vector icons (`@expo/vector-icons`) styled to look modern.

3. **Navigation & State Management**:
   - React Navigation for screen stack handling.
   - Zustand store to track current screen navigation, active user/mentor preferences, active task progress, and star count.
   - Maintain active tab highlighted correctly in bottom-nav, side-nav, or sidebar.

4. **Mentors**:
   - Add static definitions for child-friendly non-human mentors (e.g., Dax the Dinosaur, Finn the Fox, Penny the Penguin, Benny the Bear, Ellie the Elephant) inside `src/constants/mentors.ts`.

## Proposed Changes

### Configuration Files

#### [MODIFY] [package.json](file:///d:/petalpath/AND_APP/petalpath_app_v2/package.json)
- Add required dependencies: `zustand`, `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`, `react-native-safe-area-context`, `react-native-screens`. (Web support is usually preconfigured, but verify dependencies).

### Theme System (`src/theme/`)

#### [NEW] [colors.ts](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/theme/colors.ts)
- Children-focused dark mode colors:
  - Background: Deep navy (`#0B0E26`, `#12163A`)
  - Purple Accent: `#8A5CF6` (playful medium-bright purple)
  - Blue Accent: `#3B82F6` (vibrant sky blue)
  - Green Accent: `#10B981` (bright mint green)
  - Star Yellow: `#FBBF24` (warm amber yellow)
  - Text: `#F3F4F6` (soft white)
  - Secondary/Muted: `#9CA3AF`

#### [NEW] [typography.ts](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/theme/typography.ts)
- Scale of sizes and weights appropriate for child readability.

#### [NEW] [spacing.ts](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/theme/spacing.ts)
- Base grids (e.g., 4, 8, 12, 16, 24, 32, 48).

#### [NEW] [radius.ts](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/theme/radius.ts)
- Playful rounded styles (e.g., small=8, medium=16, large=24, full=9999).

#### [NEW] [shadows.ts](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/theme/shadows.ts)
- Soft shadows for cards to look premium.

#### [NEW] [animations.ts](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/theme/animations.ts)
- Basic duration and easing constants for transitions.

#### [NEW] [breakpoints.ts](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/theme/breakpoints.ts)
- Breakpoint constants (600, 1024).

### State Management (`src/store/`)

#### [NEW] [navigationStore.ts](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/store/navigationStore.ts)
- Keep track of current screen, active mentor, and current progress context.

### Responsive Hooks (`src/hooks/`)

#### [NEW] [useDeviceType.ts](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/hooks/useDeviceType.ts)
- Hook returning `'mobile' | 'tablet' | 'desktop'`.

### Layout System (`src/layouts/`)

#### [NEW] [mobile/](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/layouts/mobile)
- Standard layout with a header `TopBar` and a `BottomNavigation`.

#### [NEW] [tablet/](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/layouts/tablet)
- Side navigation layout with content centered with bounds.

#### [NEW] [desktop/](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/layouts/desktop)
- Sidebar navigation layout with full desktop spacing.

### Navigation Coordinator

#### [NEW] [RootNavigator.tsx](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/navigation/RootNavigator.tsx)
- Unified router that mounts the active layout and screens dynamically based on device type.

### Placeholder Screens (`src/screens/`)
Create index and responsive files for:
- Home (Roadmap)
- Journey
- Mentor
- Rewards
- Profile
- Video
- Listen
- Speak
- Write
- Progress
- Stories

Each screen directory will contain:
- `index.tsx`: Coordinates between Mobile/Tablet/Desktop files.
- `[ScreenName]Mobile.tsx`: Mobile view.
- `[ScreenName]Tablet.tsx`: Tablet view.
- `[ScreenName]Desktop.tsx`: Desktop view.

### Reusable Components (`src/components/`)
- **Buttons**: `AppButton`, `PrimaryButton`, `SecondaryButton` in `src/components/buttons/`
- **Cards**: `AppCard`, `AnimatedCard`, `AvatarCard`, `RewardCard`, `ActivityCard`, `LessonCard` in `src/components/cards/`
- **Progress**: `ProgressBar`, `StarCounter` in `src/components/progress/`
- **Navigation**: `BottomNavigation`, `SidebarNavigation`, `TopBar` in `src/components/navigation/`
- **Common**: `SectionHeader`, `ScreenContainer` in `src/components/common/`

## Verification Plan

### Automated Tests
- Run TS compilation checks (`npx tsc`).
- Start Expo dev server (`npm run web` / `npm run android`) to confirm startup without runtime crashes.

### Manual Verification
- Resize the web browser window to verify seamless transitions between Mobile, Tablet, and Desktop layouts (at 600px and 1024px).
- Verify the active navigation state aligns with bottom-bar, side-nav, and sidebar indicators.
- Inspect responsiveness (no UI stretching) on simulated tablet/desktop dimensions.
