---
Title: Mastery System & Memory Decay
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/adaptive-learning/01-overview.md, docs/adaptive-learning/02-learning-model.md, docs/adaptive-learning/04-learner-state.md
---

# Mastery System & Memory Decay

This document explains the conceptual rules governing how PetalPath evaluates child skill performance, models memory decay, and schedules reinforcement reviews.

---

## 1. Mastery Metrics

Mastery is evaluated across four core performance dimensions, avoiding simple average scores:

*   **Accuracy Index**: The ratio of correct answers to total inputs during activities.
*   **Consistency Index**: Tracks variance across consecutive plays. Steady performance indicates durable knowledge, while high score spikes suggest guessing.
*   **Confidence Index**: Computed by evaluating response speeds, attempt counts, and the frequency of hint/help triggers during a session.
*   **Retention Index**: Models memory strength over time. It represents how well a child retains a concept after period gaps.

---

## 2. Mastery Lifecycle States

A child’s progress in any given Skill Node moves through a designated lifecycle:

*   **NEW**: The skill has not been attempted.
*   **LEARNING**: Initial activities are underway, but accuracy is volatile.
*   **WEAK**: Performance indicates low accuracy or a high dependency on hint helpers, or memory retention has decayed.
*   **STRONG**: The child solves tasks with high consistency and low assistance.
*   **MASTERED**: The child demonstrates durable, high-accuracy recall, unlocking prerequisite downstream nodes.

---

## 3. Memory Decay & Spaced Repetition

PetalPath assumes that skills are subject to memory decay:

*   **Decay Curve**: If a skill node is not practiced, its retention index degrades over time.
*   **Decay Thresholds**: When retention degradation drops the overall skill health below defined limits, the skill is flagged as due for review.
*   **Spaced Intervals**: Reviews are scheduled using progressive time spacing. A skill must be validated at set intervals (e.g., 1 day, 2 days, 7 days, 30 days) to confirm durable memory stability.

---

## 4. Reinforcement & Review Scheduling

The reinforcement queue manages due reviews:

*   **Remediation Priority**: Weak skills and decayed mastery items are automatically enqueued for review.
*   **Review Modality Adaptation**: If a child struggles with a skill in one modality (e.g. writing), the system enqueues reviews in a different modality (e.g. visual or listening) to build cognitive associations.
*   **Review Capping**: Sessions restrict reviews to a specific percentage (e.g. max 30% of content) to ensure learning paths continue introducing new skills without causing reinforcement fatigue.
