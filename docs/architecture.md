# Architecture & Database Design

This document details the software architecture, state management strategies, and database schemas of the PetalPath monorepo.

---

## 1. Frontend Architecture
The frontend client is a universal React Native application built on Expo SDK 56. It is designed to run natively on Android/iOS devices while supporting React Native Web for tablet and desktop display layouts.

### Key Architectural Concepts
* **Responsive Layout Wrappers**: Layouts automatically scale based on screen dimensions and aspect ratios. Screens render customized responsive layouts (e.g. `HomeDesktop`, `HomeMobile`, `HomeTablet`) using breakpoints to handle wide-screen desktops and small mobile phones cleanly.
* **Unified API Client**: The application uses a central Axios client configured in [frontend/src/api/client.ts] that handles requests, sets common JSON content types, and references the host via environment variables (`EXPO_PUBLIC_API_URL`).
* **Zustand State Stores**: Client-side state is split into specialized, self-contained Zustand stores located in `frontend/src/store/`:
  * `roadmapStore`: Manages categories, modules, and lessons.
  * `progressStore`: Track percentages, active lessons, and general learning progress.
  * `rewardsStore`: Manages stickers, badges, and total earned stars.
  * `listenStore` / `speakStore` / `writeStore`: Manages temporary activity parameters, active audio guide players, and speech recognition engines.
  * `appStore`: Coordinates global states (loading screens, network status check, session keys).

### Cleartext Traffic Policy
To support backend staging connections over HTTP (`http://13.235.178.117`), the app registers an Expo config-plugin [withAndroidNetworkSecurity] that dynamically configures the Android Manifest:
* Sets `android:usesCleartextTraffic="true"`.
* Registers a `network_security_config.xml` mapping file that restricts cleartext connections strictly to the backend EC2 server IP to keep communication secure.

---

## 2. Backend Architecture
The backend is an Express.js API server written in TypeScript and backed by PostgreSQL and the Prisma ORM.

### Folder Structure & Modular Design
The source code is organized into feature-specific modules under `backend/src/modules/`:
```text
backend/src/modules/
├── users/                # Registration, Session authentication, and tokens
├── child/                # Managing child profiles and active selections
├── categories/           # Category indexing and overall curriculum roadmap
├── lessons/              # Lesson metadata, sequencing, and activity lists
├── progress/             # Global progress updates, resets, and checkpoints
├── rewards/              # Stars, badges, stickers, and achievement definitions
└── videos/ / audio/      # Static asset management and CDN routing URLs
```

### Modular Repository Pattern
Each feature folder follows a clean routing $\rightarrow$ controller $\rightarrow$ service $\rightarrow$ repository layout:
1. **Routes (`*.routes.ts`)**: Registers Express endpoint routes and maps them to input validation middlewares (using Zod schemas).
2. **Controller (`*.controller.ts`)**: Parses parameters, handles request/response formatting, and translates exceptions into HTTP codes.
3. **Service (`*.service.ts`)**: Contains core application rules and coordinates multi-store transactions.
4. **Repository (`*.repository.ts`)**: Contains raw database queries utilizing the Prisma Client instance.

---

## 3. Database Schema (Prisma)
The database structure is managed in [backend/prisma/schema.prisma] and centers around a multi-tier learning roadmap mapped to tracked progress tables.

### Roadmap Entities
* **Category**: Represents a major curriculum block (e.g. "Alphabet"). Holds order rankings and total lessons count.
* **Module**: Represents a sub-topic (e.g. "Letters A-E") belonging to a Category.
* **Lesson**: Represents an individual learning package belonging to a Module.
* **Activity**: Represents a sub-task (e.g., `Video` $\rightarrow$ `Listen` $\rightarrow$ `Speak` $\rightarrow$ `Write` sequence) belonging to a Lesson.

### Child Progress Entities
* **Child**: User profiles mapped to parent user accounts. Progress is tracked per Child.
* **LessonProgress**: Logs current child status (`IN_PROGRESS`, `COMPLETED`) for each lesson.
* **ActivityProgress Logs**: Tables such as `videoProgress`, `listenProgress`, `speakProgress`, and `writeProgress` track timestamps and specific performance metrics for individual activities.
* **ChildReward**: Stores stickers, badges, and trophies unlocked by children.
* **Stars**: Tracks daily and total accumulated star counts.
