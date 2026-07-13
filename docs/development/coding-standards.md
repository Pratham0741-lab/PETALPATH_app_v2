---
Title: Engineering Coding Standards
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/architecture/architecture-principles.md, docs/development/feature-development.md
---

# Engineering Coding Standards

This document establishes the guidelines, quality checks, and standards for the codebase.

---

## 1. Quality Standards

To maintain code readability and prevent technical debt:

*   **Cohesive Functions**: Functions must be single-purpose and small. Refactor logic to split functions only when it clearly improves readability and testability.
*   **Separation of States**:ephemeral local UI states must stay inside client stores, and server states are retrieved via API requests.
*   **Repository Isolation**: All database queries must run inside repository modules. Controllers and services must not call the database client directly.
*   **Access Verification**: Every path parameterized with children identifiers must mount verification middlewares to validate access ownership.

---

## 2. Layout & Theme Rules

*   **Design Token Compliance**: Hardcoded styling values (colors, margins) are prohibited. All views must import properties from the theme configuration.
*   **Responsive Adaptation**: Screens must be unified. Viewports are adapted using responsive styles or component hooks in a single file; do not duplicate layout files.
*   **Structured Error Responses**: Throw operational custom errors mapping to distinct HTTP status codes, preventing raw exceptions leaks.
