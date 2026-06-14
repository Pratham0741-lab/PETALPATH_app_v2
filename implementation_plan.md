# Implementation Plan - Phase 1 Frontend & Curriculum Integration

Implement frontend integration for Phase 1 (Backend Foundation & Database Curriculum) in the React Native/Expo application. This connects the Home (roadmap) and Journey (activities path) screens to fetch real database data from the Express backend instead of rendering static mock arrays.

## User Review Required

> [!WARNING]
> **Database Startup Blocker**
> The PostgreSQL server is currently unreachable on port `5432`. Our checks indicate that `postgres.exe` fails to start because the `lib/` directory inside `C:\Program Files\PostgreSQL\18\` is missing.
> We found the installer executable `postgresql-18.4-2-windows-x64.exe` in your `Downloads` directory.
> 
> Please let us know:
> 1. Do you want us to help you run the installer to repair the installation, or do you want to start the database server yourself?
> 2. Once the database is reachable, we will run the migrations and seeds (`npm run db:seed`) to populate the categories, lessons, and activities.

## Proposed Changes

### Backend: Curriculum Controllers & Repositories

We will implement the read logic for categories, lessons, activities, and videos so they serve the seeded data.

#### [MODIFY] [categories.controller.ts](file:///d:/petalpath/AND_APP/petalpath_app_v2/server/src/modules/categories/categories.controller.ts)
- Replace stubs with logic calling `categoriesService.getAllCategories()` and `categoriesService.getCategoryById(id)`.

#### [MODIFY] [lessons.service.ts](file:///d:/petalpath/AND_APP/petalpath_app_v2/server/src/modules/lessons/lessons.service.ts)
- Add optional `categoryId` filtering support to `getAllLessons`.

#### [MODIFY] [lessons.controller.ts](file:///d:/petalpath/AND_APP/petalpath_app_v2/server/src/modules/lessons/lessons.controller.ts)
- Replace stubs to return lessons filtered by `categoryId` when provided as a query parameter.

#### [MODIFY] [activities.repository.ts](file:///d:/petalpath/AND_APP/petalpath_app_v2/server/src/modules/activities/activities.repository.ts)
- Update `findByLessonId` to run `.findMany({ include: { video: true } })` so that video activity metadata is fetched concurrently.

#### [MODIFY] [activities.service.ts](file:///d:/petalpath/AND_APP/petalpath_app_v2/server/src/modules/activities/activities.service.ts)
- Add optional `lessonId` filtering support to `getAllActivities`.

#### [MODIFY] [activities.controller.ts](file:///d:/petalpath/AND_APP/petalpath_app_v2/server/src/modules/activities/activities.controller.ts)
- Update stubs to return activities (and their joined videos) filtered by `lessonId`.

#### [MODIFY] [videos.service.ts](file:///d:/petalpath/AND_APP/petalpath_app_v2/server/src/modules/videos/videos.service.ts)
- Add optional `activityId` filtering support to `getAllVideos`.

#### [MODIFY] [videos.controller.ts](file:///d:/petalpath/AND_APP/petalpath_app_v2/server/src/modules/videos/videos.controller.ts)
- Implement `getAll` and `getById` logic.

---

### Frontend: Home & Journey Screens Integration

We will connect the frontend views to the Express API via the `api` client utility.

#### [MODIFY] [HomeMobile.tsx](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/screens/home/HomeMobile.tsx), [HomeTablet.tsx](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/screens/home/HomeTablet.tsx), [HomeDesktop.tsx](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/screens/home/HomeDesktop.tsx)
- Use a `useEffect` hook to fetch categories from `/categories`.
- Render categories dynamically in the roadmap path list.
- Navigate to `'Journey'` passing `categoryId: category.id`.

#### [MODIFY] [JourneyMobile.tsx](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/screens/journey/JourneyMobile.tsx), [JourneyTablet.tsx](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/screens/journey/JourneyTablet.tsx), [JourneyDesktop.tsx](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/screens/journey/JourneyDesktop.tsx)
- Extract the `categoryId` parameter from route parameters. If undefined, default to the first available category.
- Fetch lessons under the selected category from `/lessons?categoryId=${categoryId}`.
- Render a horizontal/pill selector to toggle between lessons.
- Fetch activities under the active lesson from `/activities?lessonId=${lessonId}` and render cards.
- On card press, navigate to the specific activity type screen (e.g. `'Video'`), passing parameters like `activityTitle` and `videoUrl`.

#### [MODIFY] [index.tsx (Video)](file:///d:/petalpath/AND_APP/petalpath_app_v2/src/screens/video/index.tsx)
- Extract route parameters to display the target lesson video.
- Show video information dynamically.

---

## Verification Plan

### Automated Tests
- Run backend typechecks: `npm run build` or `npx tsc --noEmit` in `server/`.
- Run frontend typechecks: `npx tsc --noEmit` in root directory.

### Manual Verification
- Start the server on port `5000`.
- Verify mobile, tablet, and desktop layouts load correctly with real backend-seeded data.
