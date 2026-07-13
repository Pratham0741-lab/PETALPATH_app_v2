---
Title: Unit Testing Standards
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/testing/testing-strategy.md, docs/testing/integration-testing.md
---

# Unit Testing Standards

This document describes the design principles, isolation rules, and mocking guidelines for unit tests.

---

## 1. Scope & Isolation

Unit tests must focus on individual classes or functions:

*   **Zero Dependencies**: Unit tests must not connect to live databases, load env variables, or launch Express servers.
*   **Speed**: Must run in memory and execute quickly to enable fast feedback.
*   **File Placement**: Place test files directly alongside the target files they validate, matching naming conventions (e.g., `progress.service.test.ts` in the same directory as `progress.service.ts`).

---

## 2. Mocking Guidelines

*   **Mock Repositories**: Services are tested by mocking constructor-injected repositories, returning fixed domain objects to validate scoring logic.
*   **Validate Boundaries**: Test boundary assertions (e.g. confirming that passing a negative value triggers validation warnings, or zero-attempts are handled correctly).
*   **Coverage Targets**: Prioritize test coverage for math utilities, parser helper functions, and enums state transitions.
