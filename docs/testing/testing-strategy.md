---
Title: Quality Assurance & Testing Strategy
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/testing/unit-testing.md, docs/testing/integration-testing.md, docs/testing/adaptive-engine-validation.md
---

# Quality Assurance & Testing Strategy

This document describes the testing strategy, testing pyramid levels, and verification gates of PetalPath.

---

## 1. Testing Strategy

PetalPath employs a tiered testing strategy to validate core features:

```
      /\
     /  \      End-to-End Tests (Critical Client view flows)
    /----\
   /      \    Integration Tests (API routes & ownership guards validation)
  /--------\
 /          \  Unit Tests (Mastery math & adaptive calculation rules validation)
/------------\
```

*   **Unit Testing (Foundation)**: Focuses on mathematical scoring calculations, prerequisites evaluations, and enums transitions, running quickly with zero dependencies.
*   **Integration Testing**: Validates interactions between controllers, middlewares, services, repositories, and PostgreSQL instances.
*   **End-to-End Testing**: Simulates users navigating the frontend client (e.g. login stacks, profile selection) to verify UI rendering across viewports.
*   **Mathematical Simulation Tests**: Validates score decay curves and recommendation logic under simulated multi-day user sessions.

---

## 2. CI/CD Verification Gates

To protect codebase stability:
*   **Compilation Checks**: Changes must compile without errors before merging.
*   **Test Suite Passes**: Pre-push hooks run unit and integration tests.
*   **No Schema Bypass**: Database queries must reside inside repositories to keep testing boundary mappings clean.
*   **Link Verification**: Documentation changes must pass relative links validations.
