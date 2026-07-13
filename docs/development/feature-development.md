---
Title: Feature Development Workflow
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/architecture/architecture-principles.md, docs/development/coding-standards.md
---

# Feature Development Workflow

This document describes the step-by-step workflow for creating, testing, and integrating new features.

---

## 1. Feature Architecture Isolation

Every new domain feature must follow a strict, isolated implementation path:

*   **Backend Changes**:
    1.  Declare new tables or column properties in the database schema.
    2.  Write migration scripts and update seeds.
    3.  Create a module folder inside `backend/src/modules/` (containing repository, service, and controller).
    4.  Expose the module routes via the master router.
*   **Frontend Changes**:
    1.  Create feature screens or modal views in the frontend screens directory.
    2.  Update navigation paths in the Root Navigator.
    3.  Manage transient UI data inside Zustand stores, keeping database caching decoupled.
    4.  Format views using design system tokens.

---

## 2. Verification Steps

*   **Boundary Assertions**: Ensure controllers validate incoming request parameters against schema rules.
*   **IDOR Guards**: Mount child ownership validation middleware checks on all paths that take children profile identifiers.
*   **Responsiveness Checks**: Verify rendering using both phone and tablet layouts.
*   **Code Review Alignment**: Document architectural deviations or configuration updates in the same PR.
