---
Title: Learner State & Read Models
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/adaptive-learning/01-overview.md, docs/adaptive-learning/03-mastery-system.md, docs/adaptive-learning/05-recommendation-engine.md
---

# Learner State & Read Models

This document details the learner state model, tracking histories, read projections, and personalization frameworks.

---

## 1. The Learner State Projection

To support fast client queries without performing heavy joins across scores, histories, and schedules, PetalPath maintains a denormalized read-model called the **Learner State**:

*   **Aggregated Snapshot**: Houses child-specific values (e.g. cumulative stars, total badges, unlocked curriculum milestones, and active category references).
*   **Materialized Updates**: Rebuilt by a state builder service during write transactions (e.g., when an activity is completed).
*   **Recommendation Cache**: Stores the next best educational action to avoid database recalculations on subsequent page loads.

---

## 2. Personalization Parameters

The learner state maintains child-specific personalization settings:

*   **Curriculum Pathway Weights**: Adjusts category recommendations according to age milestones and developer configurations.
*   **Preferred Modalities**: Tracks performance trends across activities to determine if a child learns most effectively through visual, auditive, or touch modalities, updating session plans accordingly.
*   **Adaptive Constraints**: Stores active thresholds (e.g., maximum daily session time limits) to prevent child fatigue.

---

## 3. History & Progress Snapshots

To enable parent dashboard analytics and detect long-term learning trends:

*   **Daily Snapshots**: Captures a snapshot of overall skill healths, category progress ratios, and milestones achieved at the end of each day.
*   **Activity Logs**: Persists fine-grained metrics for every completed exercise (such as accuracy, hints used, duration, and attempts count) for diagnostic audits.
*   **Trend Evaluations**: Analytics engines compare daily snapshot progressions to check if memory retention is stabilizing or if specific skill areas are showing persistent drop-offs.
