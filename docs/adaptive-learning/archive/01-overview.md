---
Title: Adaptive Learning Overview
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/adaptive-learning/design-spec.md, docs/adaptive-learning/02-learning-model.md, docs/adaptive-learning/03-mastery-system.md
---

# Adaptive Learning Overview

This document provides a conceptual overview of the PetalPath adaptive learning framework, outlining its educational philosophy, system responsibilities, boundaries, and how it delivers a personalized learning experience for child users.

---

## 1. Purpose

The adaptive learning system is the core intelligence of PetalPath. Its purpose is to guide children through a tailored educational journey, automatically adjusting lesson content, difficulty levels, and review intervals based on their individual learning speeds, cognitive strengths, and engagement indicators.

---

## 2. Educational Philosophy

PetalPath operates on three core pedagogical principles:
*   **Optimal Challenge Zone (Vygotsky's Zone of Proximal Development)**: Learning is most effective when tasks are neither too easy (causing boredom) nor too difficult (causing frustration). The system monitors accuracy and confidence to keep activities in this zone.
*   **Modalities Rotation**: Young children learn best when engaging multiple senses. The system structures sessions to rotate through speaking, listening, writing, and visual activities, keeping engagement high.
*   **Spaced Repetition (Active Recall)**: Retention decays over time if not reinforced. The system schedules reviews at calculated intervals to strengthen neural pathways before memory fades.

---

## 3. Core Concepts

*   **Curriculum Tree**: The structured hierarchy of educational content (Subjects, Skills, Lessons, and Activities).
*   **Mastery Score**: A multidimensional evaluation of a child's skill performance (derived from accuracy, consistency, confidence, and retention metrics).
*   **Reinforcement Queue**: The prioritized scheduling queue tracking skills due for remediation or review.
*   **Learner State**: A denormalized, materialized read-model snapshot of a child's current progress, mastery status, and active recommendations.

---

## 4. System Responsibilities & Boundaries

### Responsibilities
*   Ingest child performance metrics (accuracy, retries, time spent) upon activity completions.
*   Recalculate mastery parameters and decay memory retention.
*   Decide when curriculum skill nodes should be unlocked or locked.
*   Prioritize and schedule review activities in the reinforcement queue.
*   Build the consolidated `LearnerState` projection for presentation client reads.

### Boundaries
*   **No UI/Layout Logic**: The adaptive system evaluates data variables; it remains completely agnostic of device screens, layout viewports, or rendering configurations.
*   **No Direct HTTP Routing**: The engines operate on raw data objects passed from controllers; they do not access HTTP request or response envelopes directly.
*   **No Content Creation**: The engines coordinate paths and states; they do not generate or seed actual video, audio, or game binaries.

---

## 5. Subsystem Relationships

The adaptive system operates as the central analytical layer of the backend application:

```
[ Frontend Client ]
        │  (Submits activity performance metrics)
        ▼
[ API Routing / Middleware ]
        │  (Asserts auth & ownership)
        ▼
[ Facade Coordinator Layer ]
   ├── [ Curriculum Engine ]     (Manages locks and prerequisites)
   ├── [ Mastery Engine ]        (Computes metrics and memory decay)
   ├── [ Reinforcement Engine ]  (Schedules spacing reviews)
   └── [ Session Planner ]       (Balances active blocks templates)
        │
        ▼
[ Database Projections ]         (Persists logs and updates LearnerState)
```
