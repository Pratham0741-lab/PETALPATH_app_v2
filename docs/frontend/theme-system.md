---
Title: Style System & Visual Tokens
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/frontend/overview.md, docs/frontend/responsive-design.md
---

# Style System & Visual Tokens

This document describes the design tokens, visual elements, and styling principles of the presentation layer.

---

## 1. Visual Design Token Keys

PetalPath enforces a centralized design token system. Style parameters are imported from the theme configuration, preventing layout inconsistencies:

*   **Colors**: A soft, child-friendly color palette (soft cream backgrounds, warm purple branding indicators, sage greens, orange, and warm yellow star assets).
*   **Typography**: Rounded, readable fonts (e.g. Baloo 2, Nunito) mapped across scale hierarchies (header levels, body scales, micro labels).
*   **Spacing**: Proportional sizing steps (spacing keys: xs, sm, md, lg, xl) replacing arbitrary margins or paddings.
*   **Radius**: Standardized corner styles (radius keys: sm, md, lg, circular) for cards and interactive assets.
*   **Shadows**: Subtle container elevations for distinct UI layers.
*   **Animations**: Smooth transition timings for UI component animations.

---

## 2. Token Compliance Guidelines

*   **No Hardcoded Layout Values**: Hardcoded hex strings (e.g., `#FFF9F3`) and custom pixel sizing margins (e.g., `padding: 13`) are prohibited. All styles must reference the centralized theme variables.
*   **Dynamic Theme Overrides**: The color theme automatically switches key variables based on active viewport states or profile context selections.
