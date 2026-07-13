---
Title: System Glossary
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/README.md, docs/adaptive-learning/01-overview.md
---

# System Glossary

This document defines core terminology, pedagogical concepts, and engineering structures in PetalPath.

---

## Terminology Directory

*   **Category**: High-level learning domain (e.g., Mathematics, Language, Writing, Cognitive skills).
*   **Module / Subject**: A distinct subject vertical within a category containing prerequisite nodes.
*   **Skill Node**: A measurable educational milestone representing a single concept in the knowledge graph.
*   **Lesson**: A structured package containing activities.
*   **Activity**: An interactive view (a video, trace canvas, voice quiz) where the child performs actions.
*   **Modality**: The active sensory input type of an activity (Visual, Speaking, Listening, Writing).
*   **Mastery Score**: A metric (0 to 100) combining accuracy, performance consistency, and confidence.
*   **Retention Index**: A parameter modeling memory stability over time, subject to calculated decay curves.
*   **Reinforcement Queue**: A database table storing due review nodes for spaced-repetition scheduling.
*   **Learner State**: A denormalized read-model projection containing child progress metrics.
*   **BOLA / IDOR**: Broken Object Level Authorization (Insecure Direct Object Reference) - security bugs where a client requests access to a resource parameter (e.g. `childId`) belonging to a different account.
*   **Design Token**: A centralized variable styling configuration (color palette, spacing step, typography font).
*   **Orchestration Facade**: A service pattern coordinating multi-subsystem engine updates.
