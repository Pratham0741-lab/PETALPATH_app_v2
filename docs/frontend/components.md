---
Title: Component Design & Organization
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/frontend/overview.md, docs/frontend/theme-system.md
---

# Component Design & Organization

This document details the layout guidelines, categorization, and reusability paradigms of the client visual components.

---

## 1. Visual Component Categories

Frontend components are organized inside the components folder by functional context:

*   **Buttons**: Unified interactive controls (e.g. primary, secondary, icon, and progress confirmation buttons) that utilize theme-defined animations.
*   **Cards**: Visual modules (e.g. category roadmap cards, lesson details cards, active review cards) that present metadata using standardized styling spacing.
*   **Canvas**: Specialized touch-drawing and gesture components used to capture strokes for writing lessons.
*   **Navigation**: Views for page headers, mobile bottom tabs navigation layout bars, and desktop/tablet navigation sidebars.
*   **Progress Indicators**: Charts, stars counters, and percentage track graphics.
*   **Common / UI Wrapper**: Layout wrappers, spacing nodes, and section container boxes.

---

## 2. Reusability Guidelines

*   **Logic Decoupling**: Components are primarily presentation wrappers. They receive properties (labels, click handlers, style attributes) and output visual tags. They must not make API calls or manage authentication states.
*   **Dynamic Properties Mapping**: Styles are declared within StyleSheet objects referencing theme tokens. Hardcoded colors or sizes are prohibited to keep components portable.
