---
Title: Frontend Navigation Reference
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/frontend/overview.md, docs/frontend/responsive-design.md
---

# Frontend Navigation Reference

This document outlines the navigation architecture, viewport routing switches, and modal configurations of the client application.

---

## 1. Routing Hierarchy

Navigation is split into three primary stacks managed dynamically:

*   **Auth Stack**: Captures registration, email credentials validation, and password resets. Users are locked to this stack until authentication succeeds.
*   **Child Selection Stack**: Mounted when a parent has logged in but has not chosen an active profile. It enforces child onboarding selections and mentor assignments.
*   **Main Core Stack**: Holds the primary curriculum screens and modals.

---

## 2. Responsive Navigation Layouts

The main core stack adapts its layout dynamically based on the active viewport size:

*   **Mobile Viewport Layout**: Renders bottom navigation tabs to access core views (Home, Journey, Mentor, Rewards, Profile). Core lesson modals (Video guides, Speak speech capture, Write canvas drawing) are pushed to the top of the stack, overlaying the bottom navigation bar.
*   **Tablet & Desktop Layouts**: Renders sidebar navigation on the left, displaying a split view with the main content stack on the right. Transition animations are set to cross-fade on larger viewports.
*   **Overlay Modals**: Visual modal overlays (e.g. activity timers, pause prompts) are handled within unified view containers.
