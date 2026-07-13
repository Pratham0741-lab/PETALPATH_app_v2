---
Title: Running Tests & Simulators
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/testing/testing-strategy.md, docs/testing/unit-testing.md, docs/testing/integration-testing.md
---

# Running Tests & Simulators

This document explains how to execute test suites, configure mock components, and run adaptive simulations.

---

## 1. Running Unit and Integration Tests

*   **Execution Commands**: Run standard test runners using package scripts in the backend and frontend folders (e.g. `npm test`).
*   **Targeted Runs**: Use filter arguments to run test scripts targeting individual modules during development (e.g., `npm test auth`).
*   **Database Cleanup**: Integration tests automatically spin up local databases; do not manually overwrite database connections while integration tests are active.

---

## 2. Running Simulation Tests

Adaptive simulations evaluate long-term learning progressions:

*   **Simulation Runner**: Run simulation scripts located in the testing folder to verify child profile progressions.
*   **Diagnostic Metrics**: Review output logs to analyze mastery scores, prerequisite lock behaviors, and review scheduling cadences.
*   **Fatigue Analysis**: Verify that review cards enqueued in reinforcement queues stay within configured limit thresholds.
