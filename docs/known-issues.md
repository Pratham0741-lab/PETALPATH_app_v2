---
Title: Known Technical Debt & Issues
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/README.md, docs/roadmap/technical-debt.md
---

# Known Technical Debt & Issues

This document registers the active issues, circular loops, and deprecations inside the codebase.

---

## 1. Active Codebase Issues

*   **Store Circular Import Dependencies**: Circular imports in frontend Zustand stores during child context switches can cause initialization lags. This requires refactoring store dependencies into separate hooks.
*   **Fallback Session Seeding**: The session planner currently runs on fallback seed rules when strict mode is disabled, bypassing dynamic generation.

---

## 2. Deprecations and Migrations

*   **Deprecated SafeAreaView**: Legacy client screens use standard React Native SafeAreaView wrappers. These must be migrated to `react-native-safe-area-context` during future visual refactors to support consistent spacing.
*   **Mock Rewards Evaluation**: The rewards subsystem currently uses basic validation branches. It must be refactored into a rule-registry model.
