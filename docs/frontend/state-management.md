---
Title: Client State Management Philosophy
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/architecture/architecture-principles.md, docs/frontend/overview.md
---

# Client State Management Philosophy

This document outlines the client-side state categories, local storage hydration rules, and boundaries of the frontend store layer.

---

## 1. State Categories & Isolation

Client state is partitioned to prevent synchronization lag and rendering bottlenecks:

*   **Ephemeral Local UI State**: Volatile parameters (e.g. current page index of a lesson card, touch-drawing path coordinates, or audio player recording toggles) are stored in client stores.
*   **Session State**: Key credentials (e.g. active JWT auth token, selected child profile ID) are kept in secure, hydrated stores.
*   **Server Cached Data**: Learning metrics, recommendations, and curriculum maps are retrieved on-demand from API responses, avoiding replication inside local stores.

---

## 2. Secure Hydration & Storage Rules

*   **Storage Hooking**: The application store automatically persists session keys (such as authentication tokens) to secure local storage.
*   **Startup Hydration**: On launch, the boot loader queries secure storage to populate the token cache before mounting the navigation router.
*   **Profile Clean Switch**: Selecting a new child profile wipes the active session caches and resets local stores, preventing data leakage between children profiles.
*   **Zustand Store Boundary**: Stores are strictly forbidden from containing business logic, mastery calculations, or database write commands.
