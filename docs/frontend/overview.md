---
Title: Frontend Subsystem Overview
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/architecture/frontend.md, docs/frontend/navigation.md, docs/frontend/state-management.md
---

# Frontend Subsystem Overview

This document describes the architectural layout, modular organization, and structural flows of the cross-platform frontend client application.

---

## 1. Modular Organization

The frontend codebase is housed under the `frontend/` directory. Its application logic inside `frontend/src/` is structured by responsibility:
*   **Decoupled Presentations**: Screens and views capture events and render outputs; they do not access the database or compute mastery metrics.
*   **Centralized Assets**: Asset directories store static images, vector graphics, and audio guide indicators.
*   **Modular Subsystems**: Decouples UI visual modules (theme, navigation, screens) from state caches (Zustand stores, api fetch clients).

---

## 2. Main Lifecycle States

1.  **Application Launch**: The client loads local cache parameters, verifies environment API variables, and checks secure storage for active authorization credentials.
2.  **State Hydration**: Hydrates active stores (authentication states, profiles metadata).
3.  **Authentication Branching**: Checks active tokens. If missing, routes to the login flow. If present, routes to child profile selection.
4.  **Active Session Play**: Loads curriculum roadmaps, plays modality templates, syncs finished scores, and renders celebration rewards.
5.  **Network Resilience**: Implements credentials auto-refresh and abort timing controllers on all HTTP REST calls.
