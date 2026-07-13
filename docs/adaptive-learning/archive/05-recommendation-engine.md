---
Title: Recommendation Engine Specification
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/adaptive-learning/01-overview.md, docs/adaptive-learning/03-mastery-system.md, docs/adaptive-learning/04-learner-state.md, docs/adaptive-learning/06-session-planner.md
---

# Recommendation Engine Specification

This document details the decision hierarchies, inputs, constraints, and fallback strategies of the recommendation engine.

---

## 1. Engine Purpose

The recommendation engine provides the child with the single most pedagogically appropriate learning task next. It optimizes progression by resolving the trade-off between exploring new lessons (progression) and reinforcing old knowledge (remediation).

---

## 2. Decision Hierarchy

To select the next activity, the engine processes inputs through a strict hierarchy:

```
[ Ingest Child Profile & Queue State ]
                  │
                  ▼
       (1. Check Reinforcement) ──► Due reviews exist? ──► Enqueue Spacing Review
                  │ No
                  ▼
       (2. Check Prereqs Locks) ──► Prerequisites met? ──► Unlock Next Lesson
                  │ Yes
                  ▼
       (3. Balance Modalities)  ──► Rotate modalities to avoid fatigue
                  │
                  ▼
       [ Output Recommendation DTO ]
```

1.  **Remediation (Highest Priority)**: Scan the reinforcement queue. If any mastered skills have decayed below threshold limits, recommend a review activity.
2.  **Progression**: If no reviews are due, scan the active module paths. Identify the next locked lesson, verify that prerequisite nodes are mastered, and recommend the starting activity of that node.
3.  **Rotation**: Alternate the modality (e.g. following a writing activity with a video guide or verbal quiz) to maintain interest.
4.  **Age Adjustment**: Prioritize subjects according to age weights.

---

## 3. Inputs & Outputs

### Inputs
*   **Learner State Read-Model**: The child's profile parameters.
*   **Reinforcement Queue**: The prioritized list of due review nodes.
*   **Modality Metrics History**: Average scoring ratios across activity categories (visual, listening, speaking, writing).
*   **Curriculum Map**: Locked/unlocked status tags of modules and skills.

### Outputs
*   **Recommendation DTO**: A structured payload containing:
    *   Target lesson and activity identifier.
    *   Activity modality specification.
    *   Recommendation Type (Progression, Remediation, or Fallback).

---

## 4. Constraints & Fallbacks

*   **Prerequisite Blocks**: A lesson remains strictly locked if its prerequisite nodes are below the required mastery index.
*   **Fatigue Caps**: Enforces maximum limits on continuous review activities to prevent frustration.
*   **Recommendation Fallback**: If strict planning constraints fail or the curriculum queue runs empty, the engine returns a default lesson configuration calibrated for the child's age profile.
