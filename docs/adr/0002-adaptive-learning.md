---
Title: "ADR 0002: Modular Adaptive Engines"
Version: 1.0
Status: Accepted
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/adr/README.md, docs/adaptive-learning/01-overview.md
---

# ADR 0002: Modular Adaptive Engines

## Context
The adaptive learning system evaluates complex learning states, mastery scores, prerequisite progression rules, and review scheduling cadences. Combining these calculations in a single service layer created tight coupling, hard-to-maintain code, and test execution bottlenecks.

## Decision
We split domain calculations into distinct, single-purpose engines (curriculum tree progression locks, mastery score evaluations, and spaced repetition review schedules). These engines are coordinated centrally via an orchestration facade layer, which compiles write results and returns optimized client payload DTOs.

## Consequences
*   **Benefits**: Clear division of concerns, clean interfaces, and isolated engine test suites.
*   **Trade-offs**: Orchestration is managed at the facade layer, requiring strict transaction coordination to prevent state desynchronizations.
