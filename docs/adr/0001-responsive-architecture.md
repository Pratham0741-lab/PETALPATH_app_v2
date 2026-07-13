---
Title: "ADR 0001: Responsive Screen Layouts"
Version: 1.0
Status: Accepted
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/adr/README.md, docs/frontend/responsive-design.md
---

# ADR 0001: Responsive Screen Layouts

## Context
PetalPath targets phone, tablet, and web viewports. Initially, development compiled separate files for different devices (e.g. MobileScreen vs. TabletScreen). This led to duplicated styles, split states, rendering inconsistencies, and high maintenance overhead.

## Decision
We will use single, responsive screens that adapt dynamically within a single file. Breakpoints are evaluated using shortest-side logic: mobile (<600dp), tablet (600dp–1023dp), and desktop (>=1024dp). Styles must reference theme design tokens. Device-specific sub-components are only extracted when viewport layout complexity requires unique rendering paths.

## Consequences
*   **Benefits**: Reduced code duplication, easier visual testing, and unified client state parameters.
*   **Trade-offs**: Screen code includes conditional branches, requiring careful grouping of Flexbox rules.
