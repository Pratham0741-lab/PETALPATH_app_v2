---
Title: Domain Development Guide
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/architecture/repository-structure.md, docs/architecture/architecture-principles.md
---

# Domain Development Guide

This document outlines the workflows and guidelines for engineers adding curriculum, skills, activities, or modifying adaptive rules within the PetalPath repository.

---

## 1. Curriculum and Skills Workflows

To expand curriculum categories, modules, lessons, or activities:

*   **Database Seeding**: Content modifications must be declared inside the database seed scripts. Do not write manual database scripts directly on target environments.
*   **Prerequisite Settings**: When creating a new Skill, assign its parent dependencies in the knowledge graph. This updates curriculum progression logic.
*   **Activities Configuration**: Ensure new activities include required metadata corresponding to their selected modality (such as video urls, phonics targets, drawing coordinate matrices).

---

## 2. Adding Modalities

To introduce a new learning modality (e.g. AR play, typing):

1.  **Enums Update**: Add the new modality tag to backend database enums and client settings.
2.  **Layout Rendering**: Implement the touch/visual view component in the frontend screens folder. Reference centralized theme tokens.
3.  **Planner Integration**: Update session templates configuration parameters to support scheduling block rules for the new modality.

---

## 3. Modifying Adaptive Rules

To tune progression metrics, mastery calculations, or reinforcement queues:

*   **Central Config Tuning**: Adjust weights, intervals, or threshold parameters inside the centralized configuration file. Avoid embedding calculations directly in business logic.
*   **Test Case Verification**: Adding or updating adaptive rules requires modifying matching mathematical validation tests to verify that regressions do not break child score decay curves.

---

## 4. Documentation & PR Validation Checklist

Before submitting domain changes for review:
- [ ] Verify that all code compiles without errors or new warnings.
- [ ] Run domain and integration tests.
- [ ] Ensure database queries run inside repositories (no ORM client instances in controllers or services).
- [ ] Verify responsiveness using device viewport simulators.
- [ ] If routing, schemas, or behaviors were changed, update the corresponding documentation files in the same branch.
