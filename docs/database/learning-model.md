---
Title: Curriculum & Learning Database Model
Version: 1.0
Status: Current
Owner: Engineering
Last Updated: 2026-07-12
Generated From Commit: f8c4acb
Related Documents: docs/database/overview.md, docs/adaptive-learning/02-learning-model.md
---

# Curriculum & Learning Database Model

This document outlines the database entities, relations, and prerequisite mapping tables of the curriculum and learning progress subdomains.

---

## 1. Curriculum Model Entities

*   **Category Entity**: Represents high-level learning domains. Holds details like titles, slugs, description indices, and order positions.
*   **Module Entity**: Maps subjects. Relates to a parent Category and holds prerequisite unlock settings.
*   **Skill Node Entity**: Represents measurable concepts. Connects modules to lesson plans.
*   **Lesson Entity**: Groups activity packages. Linked to child skills nodes.
*   **Activity Entity**: The individual task card. Contains modality tags (video, speak, listen, write, game) and media pointers.

---

## 2. Learning Progress & Unlock Mappings

To manage prerequisite progression paths:

*   **Prerequisite Dependency Mapping**: A self-referencing link table mapping parent-child skill relationships, defining which skills must meet threshold levels before adjacent nodes unlock.
*   **Skill Health Entity**: A table storing active mastery snapshots (accuracy, consistency, confidence, retention) for a child.
*   **Unlocked Skill Mapping**: Tracks the active unlock statuses of modules and skills per child, preventing kids from accessing lessons out of sequence.
*   **Reinforcement Queue Entity**: Maps review items, storing computed priority weights, last review dates, and next calculated review target times.
