---
Title: Service Layer Specification
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/backend/overview.md, docs/backend/repositories.md, docs/backend/middleware.md
---

# Service Layer Specification

This document details the responsibilities, transaction limits, and execution boundaries of the backend services layer.

---

## 1. Role of the Service Layer

The service layer contains the core business logic, rules, and domain models of PetalPath:

*   **Logic Isolation**: All pedagogical scoring formulas, mastery calculations, progress unlocks, reinforcement spacing checks, and rewards criteria live within Services.
*   **Transaction Scoping**: Services manage database transaction boundaries. Operations that must succeed or fail atomically (such as logging an activity completion and updating the child's mastery state read-model) are run inside transactional blocks.
*   **Transport Agnostic**: Services are completely decoupled from network interfaces. They do not reference Express routes, HTTP status codes, cookies, request headers, or response structures.

---

## 2. Design Rules & Inter-Module Communication

*   **Clean Inputs**: Services receive validated, typed parameters from controllers and return plain domain objects.
*   **Dependency Injection**: Services acquire repository and adjacent service instances through constructor injection, facilitating mock-based unit testing.
*   **Cross-Module Logic Boundaries**: Direct database edits across module boundaries are prohibited. If a service in the session module needs child profile details, it must call the child profile service rather than query the child database table directly.
