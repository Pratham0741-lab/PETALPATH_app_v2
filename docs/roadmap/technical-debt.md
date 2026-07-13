---
Title: Technical Debt Register
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Last Reviewed: 2026-07-12
Roadmap Version: 1.0
Related Documents: docs/roadmap/current-status.md, docs/roadmap/decision-log.md
---

# Technical Debt Register

This document registers known technical debt, visual deprecations, code design issues, and resolved historical records.

---

## 1. Active Technical Debt

| Debt Item | Description | Severity | Priority |
|---|---|---|---|
| **Circular Store Imports** | Circular import loops in frontend stores during child profile context switches can introduce startup initialization delays. | Medium | High |
| **Deprecated SafeAreaView** | Mobile layouts render using standard React Native SafeAreaView components. These must be migrated to `react-native-safe-area-context`. | Low | Medium |
| **Static Rewards Branching** | Reward evaluations are hardcoded inside services loops. These must be refactored into a rules-based validation registry. | Low | Low |

---

## 2. Code Health Guidelines

*   **Priority Resolution**: High priority debt items must be addressed during core feature additions in the matching subsystem.
*   **Historical Preservation**: Resolved technical debt must not be deleted from this file. Instead, move resolved items to the "Resolved Debt Logs" section, logging the date of resolution to maintain project context history.

---

## 3. Resolved Debt Logs

*(No entries registered yet. Move completed tasks here.)*
