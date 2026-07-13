---
Title: Frontend Architecture Reference
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/architecture/overview.md, docs/architecture/backend.md, docs/architecture/communication-flow.md, docs/architecture/repository-structure.md, docs/architecture/architecture-principles.md
---

# Frontend Architecture Reference

This document outlines the architectural structure, navigation flows, state management paradigms, and design guidelines of the PetalPath client application.

---

## 1. Folder Organization

The frontend codebase resides under the `frontend/` directory. Its application logic inside `frontend/src/` is structured by responsibility:

*   `api/`: REST endpoint client functions and core request wrappers.
*   `components/`: Reusable presentation nodes partitioned by context (buttons, cards, ui wrappers, tutorial components, and draw canvas widgets).
*   `config/`: Client URL settings and dynamic development flags.
*   `constants/`: Non-volatile configurations (such as asset maps or audio guide definitions).
*   `hooks/`: Shared custom hooks (such as viewport selectors or playback trackers).
*   `navigation/`: Root Navigator configurations, tab setups, and sidebar components.
*   `screens/`: Top-level screen components organized by feature pathways (auth, journey, profile, lesson modals).
*   `services/`: Ephemeral state controllers (such as voice player integrations).
*   `store/`: Client stores for local state management.
*   `theme/`: Design tokens governing variables (spacing, typography, color constants, radius bounds, and breakpoints).
*   `utils/`: Client-side helpers (such as secure storage wrappers).

---

## 2. Navigation Architecture

PetalPath uses standard native stack and tab navigators. The navigation hierarchy is centralized inside the main application coordinator:

*   **Auth Navigation Stack**: Mounted when no authenticated token is present. It routes local login, registration, and password resets.
*   **Child Selection Stack**: Mounted if the user is authenticated but has not selected an active child profile. It forces the child creation or onboarding selections.
*   **Mobile Viewport Navigation**: For phone layouts, the root stack mounts main bottom tabs using a customized bottom navigation layout bar. Activity modals (Video player, Speak speech capture, Write drawing canvas, Listen instructions) overlay the tabs using stack pushes.
*   **Tablet & Desktop Navigation**: For larger displays, the root mounts a row-split layout wrapping sidebar navigation on the left and a fade-animated stack navigator on the right to toggle screens.

---

## 3. State Management Philosophy

State inside the client is split by concern:

*   **Server Cached State**: Payload results fetched from API endpoints (such as lessons list, metrics snapshots, and recommendations). These are accessed directly via client API requests, avoiding synchronization layers.
*   **Ephemeral Local UI State**: Transient view configurations (e.g. index tracker of active play cards, video timestamps, audio recording status, or help hint visibilities). These are stored in local activity runtime stores.
*   **Contextual UI State**: App-wide session configurations (such as the authenticated token or the active child profile).

---

## 4. Theme System

The user interface uses styling variables located in the theme directory, preventing hardcoded styling values:

*   **Colors**: Child-friendly storybook palette (soft cream backgrounds, warm purple bases, sage greens, peach, and warm yellow stars).
*   **Typography**: Font mappings (rounded system fonts on Android, rounded fonts on Web, standard system on iOS) and sizing steps.
*   **Layout Elements**: Standard margins, corner styles, container depths, and transition times.

---

## 5. Responsive Design Architecture

PetalPath does not duplicate screen viewports into separate files for different devices. Instead, it utilizes responsiveness:

*   **Breakpoint Selection**: The custom device hook queries the viewport using shortest-side logic: mobile (<600dp), tablet (600dp–1023dp), and desktop (>=1024dp).
*   **Responsive View Components**: Screens dynamically adapt layouts inside a single component using style rules or conditional mounts, extracting device sub-components only when layout complexity requires it.

---

## 6. Client Data Flow & Backend Communication

Communication with the backend API is encapsulated inside the centralized request client:

1.  **Request Lifecycle**: Client functions call the central request dispatcher.
2.  **Auth Token Attaching**: The client automatically checks the application store for active session tokens and attaches them in the Authorization header.
3.  **Timeout Guard**: Requests enforce standard timeouts using client-side abort controllers.
4.  **Auto Refresh Interceptor**: If the backend returns an unauthorized status, the client intercepts the request, calls the token refresh endpoint, updates the active session keys, and replays the original query.
5.  **Error Normalization**: Maps HTTP status codes to standard error boundaries, formatting validation parameters for UI forms.

---

## 7. Frontend Architectural Boundaries

To prevent leaking responsibilities, the presentation layer must adhere to the following boundaries:
*   **No Direct Data Access**: The frontend must never attempt database connections, raw SQL executions, or query persists. All data operations must go through the API layer.
*   **No Business Math**: Pedagogical calculations, mastery curves, and reinforcement schedulers are backend concerns. The frontend must only capture scores and render outputs.
*   **Separation of State**: Do not mirror API payloads inside UI state stores. Keep stores lightweight and dedicated to active viewport configuration parameters.

For detail on these rules, see [Architecture Principles](architecture-principles.md).
