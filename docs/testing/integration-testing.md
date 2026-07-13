---
Title: Integration Testing Guidelines
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/testing/testing-strategy.md, docs/testing/unit-testing.md
---

# Integration Testing Guidelines

This document outlines the workflows, environment configurations, and target cases for integration tests.

---

## 1. Test Environment Setup

Integration tests validate the flow of requests across multiple components:

*   **Database Isolation**: Tests run against a clean database instance. Test databases are initialized and migrated before tests run, and reset afterward.
*   **Decoupled Servers**: Express app instances are spun up in memory during test execution.

---

## 2. Target Test Scenarios

*   **Middleware Verification**: Verify that the authentication middleware rejects malformed tokens and that the ownership middleware blocks cross-profile queries (IDOR validation).
*   **Transaction Integrity**: Confirm that multi-table write operations (such as activity progress updates triggering metric updates and queue enqueues) succeed or roll back atomically.
*   **JSON Response Formats**: Assert that controllers validate request payloads and wrap all responses in the standard JSON envelope structure.
