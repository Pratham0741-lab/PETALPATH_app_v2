---
Title: Responsive Design & Layouts
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/architecture/architecture-principles.md, docs/frontend/overview.md, docs/frontend/theme-system.md
---

# Responsive Design & Layouts

This document details the responsive styling philosophy, device breakpoints, and viewport adaptation rules of the client.

---

## 1. Breakpoint Selection Rules

PetalPath does not use separate mobile, tablet, and desktop files for layout screens. Views are unified and scale dynamically based on the shortest-side viewport measurement:

*   **Shortest-Side Logic**: Breaks are evaluated on the shortest side (`Math.min(width, height)`), ensuring that rotating a device from portrait to landscape does not cause layout breaks.
*   **Target Breakpoints**:
    *   **Mobile Viewport**: Shortest side is less than 600dp.
    *   **Tablet Viewport**: Shortest side is between 600dp and 1023dp.
    *   **Desktop Viewport**: Shortest side is 1024dp or greater.

---

## 2. Layout Structure Rules

To keep the UI consistent and code duplication low:

*   **Unified Files**: Renders layouts dynamically inside a single file using hook-based viewport dimensions.
*   **Flexbox Positioning**: Layout grids must use Flexbox rules. Hardcoded sizing margins are prohibited.
*   **Sub-component Extraction**: Viewport-specific components are only extracted when layout differences between mobile and tablet viewports require unique rendering paths.
