---
Title: Session Planner Specification
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/adaptive-learning/01-overview.md, docs/adaptive-learning/02-learning-model.md, docs/adaptive-learning/05-recommendation-engine.md
---

# Session Planner Specification

This document details the architectural concepts behind session planning, modality balancing, and sequence structures in PetalPath.

---

## 1. Learning Sessions Philosophy

Young children have limited attention spans and vary in cognitive fatigue rates. PetalPath structures learning into discrete, planned **Sessions**:

*   **Duration Matching**: Active session lengths are determined by the child's age (e.g. 3–4 block activities for age 3; 8–10 block activities for age 6).
*   **Structured Flow**: A session is not an arbitrary list of activities; it is a pedagogical sandwich containing warmups, core lessons, reviews, and rewards.

---

## 2. Session Templates & Sequencing

Sessions are structured dynamically using configured templates:

*   **Warmup Block**: Easy, low-stakes visual or cognitive games to engage focus.
*   **Instruction Block**: Video watch or story guide introducing new skills.
*   **Progressive Challenge Block**: Core lesson exercises focused on active learning (writing, speaking, math).
*   **Remediation / Review Block**: Integrated review cards pulled from the reinforcement queue.
*   **Celebration Block**: High-engagement reward modules (stars tallying, sticker drops) to end the session on a positive note.

---

## 3. Balancing Constraints

To ensure a balanced cognitive load, the session planner enforces strict sequencing limits:

*   **Modality Rotation**: The planner prevents consecutive activities from using the same active input modality (e.g., two writing tasks in a row is blocked; the planner inserts a listening or video block in between).
*   **Difficulty Balancing**: Prevents chaining multiple difficult tasks. The planner sandwiches high-complexity blocks (where previous scores were low) between high-accuracy warmup and review blocks.
*   **Review Insertion Ratio**: The reinforcement count is capped at a maximum threshold (e.g. 30% of the session length) to keep the child moving forward in the curriculum path.
*   **Daily Session Limits**: Enforces session lockout limits when duration exceeds configured parent controls.
